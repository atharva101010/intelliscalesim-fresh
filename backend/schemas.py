from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Dict, Any
from datetime import datetime
from enum import Enum

# User Schemas
class UserRole(str, Enum):
    student = "student"
    teacher = "teacher"
    admin = "admin"

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    role: UserRole

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    role: str
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

# Container Schemas - UPDATED with GitHub support
class ContainerCreate(BaseModel):
    name: str
    # Docker image deployment
    image: Optional[str] = None
    # GitHub deployment
    github_url: Optional[str] = None
    github_branch: Optional[str] = "main"
    dockerfile_path: Optional[str] = "Dockerfile"
    
    ports: Optional[str] = None
    environment: Optional[Dict[str, Any]] = None
    cpu_limit: Optional[float] = None
    memory_limit: Optional[str] = None
    
    # Registry credentials for private Docker images
    registry_username: Optional[str] = None
    registry_password: Optional[str] = None
    registry_url: Optional[str] = "docker.io"
    
    # GitHub credentials for private repos
    github_username: Optional[str] = None
    github_token: Optional[str] = None

    class Config:
        extra = "allow"

class ContainerResponse(BaseModel):
    id: int
    container_id: str
    name: str
    image: str
    status: str
    ports: Optional[str] = None
    created_at: datetime
    user_id: int

    class Config:
        from_attributes = True

# Metrics Schema
class ContainerMetricResponse(BaseModel):
    id: int
    container_id: int
    cpu_usage: float
    memory_usage: float
    network_rx: int
    network_tx: int
    timestamp: datetime

    class Config:
        from_attributes = True

# Load Test Schemas
class LoadTestCreate(BaseModel):
    container_id: int
    requests: int = Field(default=1000, ge=1)
    concurrency: int = Field(default=10, ge=1)
    duration: Optional[int] = None

# Load Testing Schemas
class LoadTestCreate(BaseModel):
    container_id: int
    requests: int
    concurrency: int
    duration: int

class LoadTestResponse(BaseModel):
    id: int
    container_id: int
    requests: int
    concurrency: int
    duration: int
    status: str
    results: Optional[dict] = None
    created_at: datetime
    completed_at: Optional[datetime] = None
    user_id: int

    class Config:
        from_attributes = True

# Auto-Scaling Schemas
class ScalingPolicyCreate(BaseModel):
    name: str
    metric_type: str
    threshold: float
    scale_up: int = 1
    scale_down: int = 1
    cooldown: int = 300

class ScalingPolicyResponse(BaseModel):
    id: int
    name: str
    metric_type: str
    threshold: float
    scale_up: int
    scale_down: int
    cooldown: int
    enabled: bool
    created_at: datetime
    user_id: int

    class Config:
        from_attributes = True

class ScalingEventResponse(BaseModel):
    id: int
    policy_id: int
    container_id: int
    action: str
    reason: str
    created_at: datetime

    class Config:
        from_attributes = True

# Billing Schemas
class BillingCalculateRequest(BaseModel):
    hours: float
    cpu_cores: float
    memory_gb: float
    storage_gb: float = 0
    provider: str = "aws"

class BillingResponse(BaseModel):
    provider: str
    compute_cost: float
    storage_cost: float
    total_cost: float
    breakdown: Dict[str, Any]

class PricingResponse(BaseModel):
    provider: str
    compute_per_hour: float
    storage_per_gb: float
    currency: str = "USD"
