"""
IntelliScaleSim - Docker Auto-scaling Simulation Platform
Main FastAPI Application Entry Point
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging
import os
import sys

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ===========================
# Database Initialization
# ===========================
logger.info("🔧 Initializing database...")
try:
    from database import Base, engine, init_db
    init_db()
    logger.info("✅ Database initialized successfully")
except Exception as e:
    logger.error(f"❌ Database initialization failed: {str(e)}")
    sys.exit(1)

# ===========================
# Router Imports
# ===========================
try:
    from routers import auth, containers, load_testing, auto_scaling, billing, analytics
    logger.info("✅ All routers imported successfully")
except Exception as e:
    logger.error(f"❌ Failed to import routers: {str(e)}")
    sys.exit(1)

# ===========================
# FastAPI Application Setup
# ===========================
app = FastAPI(
    title="IntelliScaleSim API",
    description="Docker Container Auto-scaling Simulation Platform",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

logger.info("🚀 IntelliScaleSim API Initializing...")

# ===========================
# CORS Middleware Configuration
# ===========================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins (change for production)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logger.info("✅ CORS middleware configured")

# ===========================
# Health Check Endpoint
# ===========================
@app.get("/health")
async def health_check():
    """
    Health check endpoint for monitoring
    Returns service status and database info
    """
    return {
        "status": "healthy",
        "service": "IntelliScaleSim",
        "version": "1.0.0",
        "database": "SQLite",
        "environment": os.getenv("ENV", "development")
    }

# ===========================
# Root Endpoint
# ===========================
@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "message": "🚀 IntelliScaleSim API - Docker Auto-scaling Simulator",
        "version": "1.0.0",
        "documentation": "/docs",
        "redoc": "/redoc",
        "health": "/health"
    }

# ===========================
# Include Routers
# ===========================
# Authentication Router
app.include_router(auth.router)
logger.info("✅ Auth router registered")

# Container Management Router
app.include_router(containers.router)
logger.info("✅ Containers router registered")

# Load Testing Router
app.include_router(load_testing.router)
logger.info("✅ Load Testing router registered")

# Auto-scaling Router
app.include_router(auto_scaling.router)
logger.info("✅ Auto-scaling router registered")

# Billing Router
app.include_router(billing.router)
logger.info("✅ Billing router registered")

# Analytics Router
app.include_router(analytics.router)
logger.info("✅ Analytics router registered")

# ===========================
# Startup Event
# ===========================
@app.on_event("startup")
async def startup_event():
    """Run on application startup"""
    logger.info("=" * 60)
    logger.info("🚀 IntelliScaleSim API Starting")
    logger.info("=" * 60)
    logger.info("📡 API available at: http://localhost:8000")
    logger.info("📚 Documentation at: http://localhost:8000/docs")
    logger.info("=" * 60)

# ===========================
# Shutdown Event
# ===========================
@app.on_event("shutdown")
async def shutdown_event():
    """Run on application shutdown"""
    logger.info("🛑 IntelliScaleSim API Shutting Down")

# ===========================
# Exception Handlers
# ===========================
@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    """Handle general exceptions"""
    logger.error(f"Unhandled exception: {str(exc)}")
    return {
        "error": "Internal Server Error",
        "detail": str(exc)
    }

if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )

