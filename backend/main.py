from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from database import engine, Base
from routers import auth, containers, load_testing, auto_scaling, billing

# Create database tables
Base.metadata.create_all(bind=engine)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("🚀 Starting IntelliScaleSim API...")
    yield
    # Shutdown
    print("👋 Shutting down IntelliScaleSim API...")

app = FastAPI(
    title="IntelliScaleSim API",
    description="Container Scaling Simulation Platform",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration - FIXED
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Include routers
app.include_router(auth.router)
app.include_router(containers.router)
app.include_router(load_testing.router)
app.include_router(auto_scaling.router)
app.include_router(billing.router)

@app.get("/")
def root():
    return {
        "message": "IntelliScaleSim API",
        "version": "1.0.0",
        "docs": "/docs"
    }

@app.get("/health")
def health():
    return {"status": "healthy"}
