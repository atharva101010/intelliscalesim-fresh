from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import get_db
from datetime import datetime
import logging
import random
import asyncio

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/load-testing", tags=["load-testing"])

class LoadTestRequest(BaseModel):
    container_id: str
    total_requests: int = 500
    concurrency: int = 10
    duration: int = 30

load_tests = {}

class LoadTest:
    def __init__(self, id, container_id, total_requests, concurrency, duration):
        self.id = id
        self.container_id = container_id
        self.total_requests = total_requests
        self.concurrency = concurrency
        self.duration = duration
        self.status = "pending"
        self.created_at = datetime.utcnow()
        self.completed_at = None
        self.results = None

    def to_dict(self):
        return {
            "id": self.id,
            "container_id": self.container_id,
            "total_requests": self.total_requests,
            "concurrency": self.concurrency,
            "duration": self.duration,
            "status": self.status,
            "created_at": self.created_at.isoformat(),
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "results": self.results
        }

@router.post("/")
async def run_load_test(
    request: LoadTestRequest,
    db: Session = Depends(get_db)
):
    """Run a load test on a container that respects duration"""
    try:
        # Validate inputs
        if request.total_requests < 1 or request.total_requests > 10000:
            raise HTTPException(status_code=400, detail="Total requests must be between 1 and 10000")
        
        if request.concurrency < 1 or request.concurrency > 100:
            raise HTTPException(status_code=400, detail="Concurrency must be between 1 and 100")
        
        if request.duration < 1 or request.duration > 300:
            raise HTTPException(status_code=400, detail="Duration must be between 1 and 300 seconds")

        # Create test
        test_id = len(load_tests) + 1
        test = LoadTest(
            id=test_id,
            container_id=request.container_id,
            total_requests=request.total_requests,
            concurrency=request.concurrency,
            duration=request.duration
        )
        
        test.status = "running"
        load_tests[test_id] = test
        
        # Simulate load test: spread requests evenly over the duration
        requests_per_second = request.total_requests / request.duration
        
        # Collect metrics
        response_times = []
        successful_requests = 0
        failed_requests = 0
        errors = {"timeout": 0, "connection_error": 0, "server_error": 0}
        
        # Simulate requests being sent across full duration
        for second in range(request.duration):
            requests_this_second = int(requests_per_second)
            
            # Send requests
            for _ in range(requests_this_second):
                response_time = random.uniform(50, 500)
                response_times.append(response_time)
                
                # Simulate success/failure
                rand = random.random()
                if rand < 0.95:
                    successful_requests += 1
                elif rand < 0.97:
                    failed_requests += 1
                    errors["timeout"] += 1
                elif rand < 0.99:
                    failed_requests += 1
                    errors["connection_error"] += 1
                else:
                    failed_requests += 1
                    errors["server_error"] += 1
            
            # Simulate concurrent processing delay
            await asyncio.sleep(0.1)
        
        # Calculate final statistics
        test.results = {
            "total_requests": request.total_requests,
            "successful_requests": successful_requests,
            "failed_requests": failed_requests,
            "success_rate": round((successful_requests / request.total_requests) * 100, 2) if request.total_requests > 0 else 0,
            "avg_response_time": round(sum(response_times) / len(response_times), 2) if response_times else 0,
            "min_response_time": round(min(response_times), 2) if response_times else 0,
            "max_response_time": round(max(response_times), 2) if response_times else 0,
            "requests_per_second": round(request.total_requests / request.duration, 2),
            "total_bandwidth": round(random.uniform(1000, 50000), 2),
            "errors": errors
        }
        
        test.status = "completed"
        test.completed_at = datetime.utcnow()
        
        logger.info(f"✅ Load test {test_id} completed for {request.container_id}")
        
        return test.to_dict()
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error running load test: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/tests")
async def get_load_tests():
    """Get all load tests"""
    return [test.to_dict() for test in load_tests.values()]

@router.get("/tests/{test_id}")
async def get_load_test(test_id: int):
    """Get specific load test"""
    if test_id not in load_tests:
        raise HTTPException(status_code=404, detail="Load test not found")
    
    return load_tests[test_id].to_dict()

@router.delete("/tests/{test_id}")
async def delete_load_test(test_id: int):
    """Delete a load test"""
    if test_id not in load_tests:
        raise HTTPException(status_code=404, detail="Load test not found")
    
    del load_tests[test_id]
    logger.info(f"Deleted load test {test_id}")
    
    return {"message": "Load test deleted"}

