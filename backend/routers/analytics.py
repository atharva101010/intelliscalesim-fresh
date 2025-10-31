from fastapi import APIRouter, HTTPException
from datetime import datetime, timedelta
import statistics
from collections import defaultdict
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/analytics", tags=["analytics"])

# Store analytics data
analytics_db = {
    "load_tests": [],
    "container_metrics": [],
    "system_events": []
}

@router.post("/record-test")
async def record_test(test_data: dict):
    """Record load test results for analytics"""
    try:
        analytics_db["load_tests"].append({
            "timestamp": datetime.now().isoformat(),
            "container": test_data.get("container_name"),
            "total_requests": test_data.get("total_requests"),
            "success_count": test_data.get("success_count"),
            "error_count": test_data.get("error_count"),
            "success_rate": test_data.get("success_rate"),
            "avg_response_time": test_data.get("avg_response_time"),
            "min_response_time": test_data.get("min_response_time"),
            "max_response_time": test_data.get("max_response_time"),
            "requests_per_second": test_data.get("requests_per_second"),
        })
        logger.info("✅ Test recorded for analytics")
        return {"success": True, "message": "Test recorded"}
    except Exception as e:
        logger.error(f"Error recording test: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/dashboard")
async def get_analytics_dashboard():
    """Get comprehensive analytics dashboard data"""
    try:
        if not analytics_db["load_tests"]:
            return {
                "total_tests": 0,
                "avg_success_rate": 0,
                "avg_response_time": 0,
                "total_requests": 0,
                "test_trend": [],
                "container_performance": {},
                "response_time_distribution": [],
                "top_performers": [],
                "error_trends": []
            }

        tests = analytics_db["load_tests"]
        
        # Overall metrics
        total_tests = len(tests)
        total_requests = sum(t["total_requests"] for t in tests)
        avg_success_rate = statistics.mean([t["success_rate"] for t in tests])
        avg_response_time = statistics.mean([t["avg_response_time"] for t in tests])
        
        # Test trend (last 10 tests)
        test_trend = [
            {
                "test_id": idx,
                "container": t["container"],
                "success_rate": t["success_rate"],
                "avg_response_time": t["avg_response_time"]
            }
            for idx, t in enumerate(tests[-10:])
        ]
        
        # Container performance
        container_performance = {}
        container_tests = defaultdict(list)
        for test in tests:
            container_tests[test["container"]].append(test)
        
        for container, container_test_list in container_tests.items():
            container_performance[container] = {
                "tests_run": len(container_test_list),
                "avg_success_rate": statistics.mean([t["success_rate"] for t in container_test_list]),
                "avg_response_time": statistics.mean([t["avg_response_time"] for t in container_test_list]),
                "total_requests": sum(t["total_requests"] for t in container_test_list),
                "total_errors": sum(t["error_count"] for t in container_test_list),
                "avg_rps": statistics.mean([t["requests_per_second"] for t in container_test_list])
            }
        
        # Response time distribution
        all_response_times = [t["avg_response_time"] for t in tests]
        response_time_distribution = {
            "min": min(all_response_times),
            "q1": statistics.quantiles(all_response_times, n=4)[0] if len(all_response_times) > 1 else min(all_response_times),
            "median": statistics.median(all_response_times),
            "q3": statistics.quantiles(all_response_times, n=4)[2] if len(all_response_times) > 1 else max(all_response_times),
            "max": max(all_response_times),
            "mean": statistics.mean(all_response_times),
            "stddev": statistics.stdev(all_response_times) if len(all_response_times) > 1 else 0
        }
        
        # Top performers (fastest avg response time)
        sorted_containers = sorted(
            container_performance.items(),
            key=lambda x: x[1]["avg_response_time"]
        )
        top_performers = [
            {
                "container": name,
                "avg_response_time": perf["avg_response_time"],
                "success_rate": perf["avg_success_rate"]
            }
            for name, perf in sorted_containers[:5]
        ]
        
        # Error trends
        error_trend = [
            {
                "test_id": idx,
                "container": t["container"],
                "error_count": t["error_count"],
                "error_rate": ((t["error_count"] / t["total_requests"]) * 100) if t["total_requests"] > 0 else 0
            }
            for idx, t in enumerate(tests[-10:])
        ]
        
        return {
            "total_tests": total_tests,
            "total_requests": total_requests,
            "avg_success_rate": round(avg_success_rate, 2),
            "avg_response_time": round(avg_response_time, 2),
            "test_trend": test_trend,
            "container_performance": container_performance,
            "response_time_distribution": response_time_distribution,
            "top_performers": top_performers,
            "error_trends": error_trend
        }
    
    except Exception as e:
        logger.error(f"Error getting analytics: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/test-history")
async def get_test_history(limit: int = 50):
    """Get detailed test history"""
    try:
        tests = analytics_db["load_tests"][-limit:]
        return {
            "total_tests": len(analytics_db["load_tests"]),
            "tests": tests
        }
    except Exception as e:
        logger.error(f"Error getting test history: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/container-insights/{container_name}")
async def get_container_insights(container_name: str):
    """Get detailed insights for a specific container"""
    try:
        container_tests = [t for t in analytics_db["load_tests"] if t["container"] == container_name]
        
        if not container_tests:
            raise HTTPException(status_code=404, detail="No tests found for container")
        
        response_times = [t["avg_response_time"] for t in container_tests]
        success_rates = [t["success_rate"] for t in container_tests]
        
        return {
            "container_name": container_name,
            "total_tests": len(container_tests),
            "total_requests": sum(t["total_requests"] for t in container_tests),
            "total_errors": sum(t["error_count"] for t in container_tests),
            "avg_success_rate": round(statistics.mean(success_rates), 2),
            "min_response_time": min(response_times),
            "avg_response_time": round(statistics.mean(response_times), 2),
            "max_response_time": max(response_times),
            "response_time_trend": [
                {
                    "test_num": idx + 1,
                    "response_time": t["avg_response_time"]
                }
                for idx, t in enumerate(container_tests[-20:])
            ],
            "success_rate_trend": [
                {
                    "test_num": idx + 1,
                    "success_rate": t["success_rate"]
                }
                for idx, t in enumerate(container_tests[-20:])
            ]
        }
    
    except Exception as e:
        logger.error(f"Error getting container insights: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/performance-comparison")
async def get_performance_comparison():
    """Compare performance across all containers"""
    try:
        if not analytics_db["load_tests"]:
            return {"containers": []}
        
        container_stats = defaultdict(lambda: {
            "tests": [],
            "total_requests": 0,
            "total_errors": 0,
            "response_times": []
        })
        
        for test in analytics_db["load_tests"]:
            stats = container_stats[test["container"]]
            stats["tests"].append(test)
            stats["total_requests"] += test["total_requests"]
            stats["total_errors"] += test["error_count"]
            stats["response_times"].append(test["avg_response_time"])
        
        comparison = []
        for container_name, stats in container_stats.items():
            comparison.append({
                "container": container_name,
                "tests_run": len(stats["tests"]),
                "total_requests": stats["total_requests"],
                "total_errors": stats["total_errors"],
                "error_rate": round((stats["total_errors"] / stats["total_requests"]) * 100, 2) if stats["total_requests"] > 0 else 0,
                "avg_response_time": round(statistics.mean(stats["response_times"]), 2),
                "min_response_time": min(stats["response_times"]),
                "max_response_time": max(stats["response_times"]),
                "consistency": round(statistics.stdev(stats["response_times"]), 2) if len(stats["response_times"]) > 1 else 0
            })
        
        # Sort by average response time
        comparison.sort(key=lambda x: x["avg_response_time"])
        
        return {"containers": comparison}
    
    except Exception as e:
        logger.error(f"Error getting performance comparison: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/recommendations")
async def get_recommendations():
    """Get AI-powered recommendations based on analytics"""
    try:
        if not analytics_db["load_tests"]:
            return {
                "recommendations": [
                    "Run more load tests to generate insights"
                ]
            }
        
        recommendations = []
        tests = analytics_db["load_tests"]
        
        # Check for slow response times
        avg_times = [t["avg_response_time"] for t in tests]
        if statistics.mean(avg_times) > 100:
            recommendations.append({
                "type": "performance",
                "severity": "high",
                "message": f"Average response time is {round(statistics.mean(avg_times), 2)}ms. Consider optimizing application code or scaling resources.",
                "metric": "response_time"
            })
        
        # Check for errors
        error_count = sum(t["error_count"] for t in tests)
        if error_count > 0:
            error_rate = (error_count / sum(t["total_requests"] for t in tests)) * 100
            recommendations.append({
                "type": "reliability",
                "severity": "high" if error_rate > 5 else "medium",
                "message": f"Error rate is {round(error_rate, 2)}%. Investigate error causes and improve error handling.",
                "metric": "error_rate"
            })
        
        # Check success rate consistency
        success_rates = [t["success_rate"] for t in tests]
        if statistics.stdev(success_rates) > 10 if len(success_rates) > 1 else False:
            recommendations.append({
                "type": "stability",
                "severity": "medium",
                "message": "Success rate varies significantly across tests. Improve application stability.",
                "metric": "success_rate_variance"
            })
        
        # Check for load capacity
        requests_per_sec = [t["requests_per_second"] for t in tests]
        if requests_per_sec and statistics.mean(requests_per_sec) < 5:
            recommendations.append({
                "type": "capacity",
                "severity": "medium",
                "message": "Application handles low throughput. Consider load optimization.",
                "metric": "throughput"
            })
        
        if not recommendations:
            recommendations.append({
                "type": "success",
                "severity": "low",
                "message": "✅ All metrics look good! Continue monitoring.",
                "metric": "overall_health"
            })
        
        return {"recommendations": recommendations}
    
    except Exception as e:
        logger.error(f"Error getting recommendations: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

