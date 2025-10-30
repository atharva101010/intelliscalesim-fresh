from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
import httpx
import asyncio
import time
import logging
from datetime import datetime
import json
from io import BytesIO

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/load-testing", tags=["load-testing"])

# Store test results
test_results = {}

class LoadTestResult:
    def __init__(self, container_name: str, total_requests: int, concurrency: int, duration: int):
        self.container_name = container_name
        self.total_requests = total_requests
        self.concurrency = concurrency
        self.duration = duration
        self.start_time = None
        self.end_time = None
        self.responses = []
        self.errors = []
        self.request_times = []
        self.request_count = 0
        self.error_count = 0
        self.success_count = 0
    
    def to_dict(self):
        total_time = (self.end_time - self.start_time).total_seconds() if self.start_time and self.end_time else 0
        avg_response_time = sum(self.request_times) / len(self.request_times) if self.request_times else 0
        min_response_time = min(self.request_times) if self.request_times else 0
        max_response_time = max(self.request_times) if self.request_times else 0
        
        return {
            "container_name": self.container_name,
            "total_requests": self.total_requests,
            "concurrency": self.concurrency,
            "duration": self.duration,
            "success_count": self.success_count,
            "error_count": self.error_count,
            "total_time": round(total_time, 2),
            "avg_response_time": round(avg_response_time, 2),
            "min_response_time": round(min_response_time, 2),
            "max_response_time": round(max_response_time, 2),
            "requests_per_second": round(self.success_count / total_time, 2) if total_time > 0 else 0,
            "success_rate": round((self.success_count / self.total_requests) * 100, 2) if self.total_requests > 0 else 0,
            "error_breakdown": self._error_breakdown(),
            "test_started": self.start_time.isoformat() if self.start_time else None,
            "test_ended": self.end_time.isoformat() if self.end_time else None
        }
    
    def _error_breakdown(self):
        """Categorize errors"""
        breakdown = {"timeouts": 0, "connection_errors": 0, "server_errors": 0, "client_errors": 0}
        for error in self.errors:
            if "timeout" in error.lower():
                breakdown["timeouts"] += 1
            elif "connection" in error.lower():
                breakdown["connection_errors"] += 1
            elif "5" in error[:1]:  # 5xx errors
                breakdown["server_errors"] += 1
            else:
                breakdown["client_errors"] += 1
        return breakdown

@router.get("/containers")
async def get_containers_for_testing():
    """Get available containers for load testing"""
    from routers.containers import docker_client
    
    if not docker_client:
        raise HTTPException(status_code=500, detail="Docker daemon is not accessible")
    
    try:
        containers = docker_client.containers.list(all=False)
        container_list = []
        
        for container in containers:
            try:
                info = {
                    "name": container.name,
                    "image": container.image.tags[0] if container.image.tags else container.image.id[:12],
                    "status": container.status
                }
                container_list.append(info)
            except Exception as e:
                logger.warning(f"Failed to process container: {str(e)}")
                continue
        
        return {"containers": container_list}
    except Exception as e:
        logger.error(f"Error getting containers: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/run")
async def run_load_test(request: dict):
    """Run a load test with time-distributed requests"""
    container_name = request.get('container_name')
    total_requests = request.get('total_requests', 100)
    concurrency = request.get('concurrency', 10)
    duration = request.get('duration', 60)
    
    if not container_name:
        raise HTTPException(status_code=400, detail="Container name is required")
    
    if total_requests < 1 or duration < 1 or concurrency < 1:
        raise HTTPException(status_code=400, detail="Invalid parameters")
    
    try:
        from routers.containers import docker_client
        
        test_result = LoadTestResult(container_name, total_requests, concurrency, duration)
        test_result.start_time = datetime.now()
        
        # Get the HTTP URL
        container = docker_client.containers.get(container_name)
        ports = container.ports
        
        url = None
        for port_mapping in ['80/tcp', '8080/tcp', '3000/tcp', '5000/tcp', '8000/tcp']:
            if port_mapping in ports:
                host_port = ports[port_mapping][0]['HostPort']
                url = f"http://localhost:{host_port}"
                break
        
        if not url:
            raise HTTPException(status_code=400, detail="Container has no HTTP port mapped")
        
        logger.info(f"🔄 Starting load test: {total_requests} requests over {duration}s to {url}")
        
        # Calculate request interval to spread across duration
        request_interval = duration / total_requests if total_requests > 0 else 0
        
        # Run load test with distributed requests
        async with httpx.AsyncClient(timeout=30.0) as client:
            tasks = []
            start_time = time.time()
            request_idx = 0
            
            while request_idx < total_requests and (time.time() - start_time) < duration:
                # Calculate when next batch should start
                current_time = time.time() - start_time
                expected_request_count = int((current_time / duration) * total_requests)
                
                # Send requests for this time slot
                while request_idx < expected_request_count and request_idx < total_requests:
                    tasks.append(send_request(client, url, test_result, request_idx))
                    request_idx += 1
                    
                    # Limit concurrent requests
                    if len(tasks) >= concurrency:
                        await asyncio.gather(*tasks)
                        tasks = []
                
                # Small delay to maintain timing
                await asyncio.sleep(0.01)
            
            # Send remaining requests
            if tasks:
                await asyncio.gather(*tasks)
        
        test_result.end_time = datetime.now()
        test_result.request_count = total_requests
        
        # Store results
        test_key = f"{container_name}_{int(test_result.start_time.timestamp())}"
        test_results[test_key] = test_result
        
        logger.info(f"✅ Load test completed: {test_result.success_count} successful, {test_result.error_count} failed")
        
        return {
            "success": True,
            "test_id": test_key,
            "results": test_result.to_dict()
        }
    
    except Exception as e:
        logger.error(f"❌ Load test error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

async def send_request(client, url, test_result, request_idx):
    """Send a single request and record results"""
    try:
        start = time.time()
        response = await client.get(url, follow_redirects=True)
        elapsed = (time.time() - start) * 1000  # Convert to ms
        
        test_result.request_times.append(elapsed)
        test_result.success_count += 1
        test_result.responses.append({
            "status": response.status_code,
            "time": elapsed
        })
    
    except httpx.TimeoutException:
        test_result.error_count += 1
        test_result.errors.append("Timeout")
    
    except httpx.ConnectError:
        test_result.error_count += 1
        test_result.errors.append("Connection Error")
    
    except Exception as e:
        test_result.error_count += 1
        test_result.errors.append(str(e))

@router.get("/results/{test_id}")
async def get_test_results(test_id: str):
    """Get results of a load test"""
    if test_id not in test_results:
        raise HTTPException(status_code=404, detail="Test results not found")
    
    test_result = test_results[test_id]
    return test_result.to_dict()

@router.get("/export/{test_id}/{format}")
async def export_results(test_id: str, format: str):
    """Export test results in different formats"""
    if test_id not in test_results:
        raise HTTPException(status_code=404, detail="Test results not found")
    
    test_result = test_results[test_id]
    data = test_result.to_dict()
    
    if format.lower() == "json":
        return StreamingResponse(
            iter([json.dumps(data, indent=2)]),
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename=load_test_{test_id}.json"}
        )
    
    elif format.lower() == "csv":
        csv_content = generate_csv(data, test_result)
        return StreamingResponse(
            iter([csv_content]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=load_test_{test_id}.csv"}
        )
    
    elif format.lower() == "pdf":
        try:
            from reportlab.lib.pagesizes import letter
            from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
            from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
            from reportlab.lib.units import inch
            from reportlab.lib import colors
            
            buffer = BytesIO()
            doc = SimpleDocTemplate(buffer, pagesize=letter)
            elements = []
            styles = getSampleStyleSheet()
            
            # Title
            title_style = ParagraphStyle(
                'CustomTitle',
                parent=styles['Heading1'],
                fontSize=24,
                textColor=colors.HexColor('#667eea'),
                spaceAfter=30,
                alignment=1
            )
            elements.append(Paragraph("📊 Load Test Report", title_style))
            elements.append(Spacer(1, 0.2*inch))
            
            # Summary data
            summary_data = [
                ["Metric", "Value"],
                ["Container", data["container_name"]],
                ["Total Requests", str(data["total_requests"])],
                ["Successful", str(data["success_count"])],
                ["Failed", str(data["error_count"])],
                ["Success Rate", f"{data['success_rate']}%"],
                ["Avg Response Time", f"{data['avg_response_time']}ms"],
                ["Min Response Time", f"{data['min_response_time']}ms"],
                ["Max Response Time", f"{data['max_response_time']}ms"],
                ["Requests/Second", str(data["requests_per_second"])],
            ]
            
            summary_table = Table(summary_data, colWidths=[3*inch, 2*inch])
            summary_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#667eea')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 12),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
            
            elements.append(summary_table)
            elements.append(Spacer(1, 0.3*inch))
            
            # Error breakdown
            if data["error_breakdown"]:
                elements.append(Paragraph("Error Breakdown", styles['Heading2']))
                error_data = [["Error Type", "Count"]]
                for error_type, count in data["error_breakdown"].items():
                    error_data.append([error_type.replace("_", " ").title(), str(count)])
                
                error_table = Table(error_data, colWidths=[3*inch, 2*inch])
                error_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.red),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                    ('GRID', (0, 0), (-1, -1), 1, colors.black)
                ]))
                elements.append(error_table)
            
            doc.build(elements)
            buffer.seek(0)
            
            return StreamingResponse(
                iter([buffer.getvalue()]),
                media_type="application/pdf",
                headers={"Content-Disposition": f"attachment; filename=load_test_{test_id}.pdf"}
            )
        except ImportError:
            raise HTTPException(status_code=500, detail="PDF export requires reportlab library")
    
    else:
        raise HTTPException(status_code=400, detail="Invalid format. Use: json, csv, or pdf")

def generate_csv(data, test_result):
    """Generate CSV format of test results"""
    csv_lines = []
    csv_lines.append("Load Test Report")
    csv_lines.append("")
    csv_lines.append("Summary")
    csv_lines.append("Metric,Value")
    csv_lines.append(f"Container,{data['container_name']}")
    csv_lines.append(f"Total Requests,{data['total_requests']}")
    csv_lines.append(f"Successful,{data['success_count']}")
    csv_lines.append(f"Failed,{data['error_count']}")
    csv_lines.append(f"Success Rate,{data['success_rate']}%")
    csv_lines.append(f"Avg Response Time,{data['avg_response_time']}ms")
    csv_lines.append(f"Min Response Time,{data['min_response_time']}ms")
    csv_lines.append(f"Max Response Time,{data['max_response_time']}ms")
    csv_lines.append(f"Requests/Second,{data['requests_per_second']}")
    csv_lines.append("")
    csv_lines.append("Error Breakdown")
    csv_lines.append("Error Type,Count")
    for error_type, count in data["error_breakdown"].items():
        csv_lines.append(f"{error_type.replace('_', ' ').title()},{count}")
    
    return "\n".join(csv_lines)

