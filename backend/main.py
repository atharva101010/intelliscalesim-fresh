from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from contextlib import asynccontextmanager
import time
import logging

# Prometheus metrics
from prometheus_client import Counter, Histogram, Gauge, generate_latest

from database import engine, Base
from routers import auth, containers, load_testing, auto_scaling, billing
 

# Logging setup
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create database tables
Base.metadata.create_all(bind=engine)

# ============ PROMETHEUS METRICS ============

# HTTP Request Metrics
http_requests_total = Counter(
    'intelliscalesim_http_requests_total',
    'Total HTTP requests',
    ['method', 'endpoint', 'status']
)

http_request_duration_seconds = Histogram(
    'intelliscalesim_http_request_duration_seconds',
    'HTTP request duration in seconds',
    ['method', 'endpoint']
)

# Container Metrics
container_deployments_total = Counter(
    'intelliscalesim_container_deployments_total',
    'Total container deployments'
)

active_containers = Gauge(
    'intelliscalesim_active_containers',
    'Number of active containers'
)

container_errors_total = Counter(
    'intelliscalesim_container_errors_total',
    'Total container deployment errors'
)

# Load Testing Metrics
load_tests_total = Counter(
    'intelliscalesim_load_tests_total',
    'Total load tests executed',
    ['container_id']
)

load_test_requests_total = Counter(
    'intelliscalesim_load_test_requests_total',
    'Total requests in load tests',
    ['container_id', 'status']
)

load_test_duration_seconds = Histogram(
    'intelliscalesim_load_test_duration_seconds',
    'Load test duration in seconds'
)

# Auto-Scaling Metrics
scaling_policies_total = Gauge(
    'intelliscalesim_scaling_policies_total',
    'Total number of scaling policies'
)

scaling_events_total = Counter(
    'intelliscalesim_scaling_events_total',
    'Total scaling events triggered',
    ['policy_id', 'event_type', 'reason']
)

active_scaling_policies = Gauge(
    'intelliscalesim_active_scaling_policies',
    'Number of active scaling policies'
)

container_replicas = Gauge(
    'intelliscalesim_container_replicas',
    'Number of container replicas',
    ['container_id']
)

# Billing Metrics
billing_estimates_total = Counter(
    'intelliscalesim_billing_estimates_total',
    'Total billing estimates calculated',
    ['cloud_provider']
)

estimated_cost_total = Gauge(
    'intelliscalesim_estimated_cost_total',
    'Estimated total cost',
    ['cloud_provider', 'container_id']
)

# Authentication Metrics
auth_attempts_total = Counter(
    'intelliscalesim_auth_attempts_total',
    'Total authentication attempts',
    ['status']
)

active_sessions = Gauge(
    'intelliscalesim_active_sessions',
    'Number of active user sessions'
)

# ============================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("🚀 Starting IntelliScaleSim API...")
    logger.info("📊 Prometheus metrics enabled at /metrics")
    logger.info("🔐 Authentication: JWT-based")
    logger.info("🐳 Container Management: Docker SDK")
    logger.info("⚖️ Auto-Scaling: Enabled")
    logger.info("💰 Cloud Billing: AWS/GCP/Azure")
    
    yield
    
    # Shutdown
    logger.info("👋 Shutting down IntelliScaleSim API...")
    logger.info("📊 Metrics finalized")

app = FastAPI(
    title="IntelliScaleSim API",
    description="Container Scaling Simulation Platform with Auto-Scaling & Monitoring",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

# CORS configuration - UPDATED to allow frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://localhost:3001",  # Grafana
        "http://localhost:9090",   # Prometheus
        "http://0.0.0.0:3000",
        "http://0.0.0.0:8000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# ============ METRICS MIDDLEWARE ============
@app.middleware("http")
async def add_metrics(request, call_next):
    """Track HTTP metrics for all requests"""
    start_time = time.time()
    
    try:
        response = await call_next(request)
        status_code = response.status_code
    except Exception as exc:
        status_code = 500
        logger.error(f"Error processing request: {str(exc)}")
        raise
    finally:
        # Record metrics
        duration = time.time() - start_time
        
        http_request_duration_seconds.labels(
            method=request.method,
            endpoint=request.url.path
        ).observe(duration)
        
        http_requests_total.labels(
            method=request.method,
            endpoint=request.url.path,
            status=status_code
        ).inc()
    
    return response

# ============================================

# Include routers - AUTO-SCALING ENABLED
app.include_router(auth.router)
app.include_router(containers.router)
app.include_router(load_testing.router)
app.include_router(auto_scaling.router)  # ✅ AUTO-SCALING ENABLED
app.include_router(billing.router)

# ============ API ENDPOINTS ============

@app.get("/")
def root():
    """Root endpoint - returns API information"""
    return {
        "message": "IntelliScaleSim API",
        "version": "1.0.0",
        "description": "Container Scaling Simulation Platform",
        "endpoints": {
            "docs": "/docs",
            "redoc": "/redoc",
            "health": "/health",
            "metrics": "/metrics"
        },
        "modules": {
            "auth": "/api/auth",
            "containers": "/api/containers",
            "load_testing": "/api/load-testing",
            "auto_scaling": "/api/auto-scaling",  # ✅ ADDED
            "billing": "/api/billing"
        }
    }

@app.get("/health")
def health():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "message": "IntelliScaleSim API is running",
        "timestamp": time.time()
    }

@app.get("/ready")
def readiness():
    """Kubernetes readiness probe"""
    try:
        # Check database connection
        from database import SessionLocal
        db = SessionLocal()
        db.execute("SELECT 1")
        db.close()
        
        return {
            "status": "ready",
            "database": "connected"
        }
    except Exception as e:
        return {
            "status": "not_ready",
            "error": str(e)
        }, 503

@app.get("/live")
def liveness():
    """Kubernetes liveness probe"""
    return {
        "status": "alive",
        "timestamp": time.time()
    }

# ============ METRICS ENDPOINT ============
@app.get("/metrics")
async def metrics():
    """Prometheus metrics endpoint - returns all collected metrics"""
    try:
        return Response(generate_latest(), media_type="text/plain")
    except Exception as e:
        logger.error(f"Error generating metrics: {str(e)}")
        return Response("Error generating metrics", status_code=500)

# ============ METRICS SUMMARY ENDPOINT ============
@app.get("/api/metrics/summary")
async def metrics_summary():
    """Get a summary of key metrics"""
    return {
        "http_requests": "See /metrics for details",
        "active_containers": active_containers._value.get() if hasattr(active_containers, '_value') else 0,
        "active_sessions": active_sessions._value.get() if hasattr(active_sessions, '_value') else 0,
        "active_scaling_policies": active_scaling_policies._value.get() if hasattr(active_scaling_policies, '_value') else 0,
        "documentation": "/docs"
    }

# ========================================

# Exception handlers
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler"""
    logger.error(f"Unhandled exception: {str(exc)}")
    return {
        "error": "Internal Server Error",
        "message": str(exc),
        "path": request.url.path
    }, 500

if __name__ == "__main__":
    import uvicorn
    logger.info("Starting IntelliScaleSim API server...")
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )

