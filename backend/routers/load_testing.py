from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import subprocess
import re

from database import get_db
from models import User, LoadTest
from schemas import LoadTestCreate, LoadTestResponse
from auth import get_current_user

router = APIRouter(prefix="/api/load-tests", tags=["Load Testing"])

@router.post("/run", response_model=LoadTestResponse)
def run_load_test(
    test_data: LoadTestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        # Run Apache Bench
        cmd = f"ab -n {test_data.requests} -c {test_data.concurrency} {test_data.target_url}"
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=300)
        output = result.stdout
        
        # Parse results
        duration_match = re.search(r'Time taken for tests:\s+([\d.]+)', output)
        rps_match = re.search(r'Requests per second:\s+([\d.]+)', output)
        mean_match = re.search(r'Time per request:\s+([\d.]+).*\(mean\)', output)
        failed_match = re.search(r'Failed requests:\s+(\d+)', output)
        
        # Extract percentiles
        p50_match = re.search(r'50%\s+([\d]+)', output)
        p95_match = re.search(r'95%\s+([\d]+)', output)
        p99_match = re.search(r'99%\s+([\d]+)', output)
        
        duration = float(duration_match.group(1)) if duration_match else 0
        rps = float(rps_match.group(1)) if rps_match else 0
        mean_time = float(mean_match.group(1)) if mean_match else 0
        failed = int(failed_match.group(1)) if failed_match else 0
        
        p50 = float(p50_match.group(1)) if p50_match else 0
        p95 = float(p95_match.group(1)) if p95_match else 0
        p99 = float(p99_match.group(1)) if p99_match else 0
        
        success_rate = ((test_data.requests - failed) / test_data.requests) * 100
        
        # Save to database
        db_test = LoadTest(
            name=test_data.name,
            target_url=test_data.target_url,
            requests=test_data.requests,
            concurrency=test_data.concurrency,
            duration=duration,
            requests_per_second=rps,
            mean_response_time=mean_time,
            median_response_time=p50,
            p95_response_time=p95,
            p99_response_time=p99,
            success_rate=success_rate,
            failed_requests=failed,
            results={"raw_output": output},
            user_id=current_user.id
        )
        db.add(db_test)
        db.commit()
        db.refresh(db_test)
        
        return db_test
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/", response_model=List[LoadTestResponse])
def list_load_tests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    tests = db.query(LoadTest).filter(LoadTest.user_id == current_user.id).all()
    return tests

@router.get("/{test_id}", response_model=LoadTestResponse)
def get_load_test(
    test_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    test = db.query(LoadTest).filter(
        LoadTest.id == test_id,
        LoadTest.user_id == current_user.id
    ).first()
    
    if not test:
        raise HTTPException(status_code=404, detail="Load test not found")
    
    return test
