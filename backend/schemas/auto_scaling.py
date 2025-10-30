from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class ScalingPolicyCreate(BaseModel):
    policy_name: str
    container_id: str
    min_replicas: int = Field(1, ge=1, le=10)
    max_replicas: int = Field(5, ge=1, le=20)
    initial_replicas: int = Field(1, ge=1, le=20)
    
    target_cpu: float = Field(70.0, ge=10, le=95)
    cpu_scale_up_threshold: float = Field(80.0, ge=10, le=95)
    cpu_scale_down_threshold: float = Field(30.0, ge=10, le=95)
    
    target_memory: float = Field(75.0, ge=10, le=95)
    memory_scale_up_threshold: float = Field(85.0, ge=10, le=95)
    memory_scale_down_threshold: float = Field(40.0, ge=10, le=95)
    
    check_interval_seconds: int = Field(30, ge=30, le=60)

class ScalingPolicyUpdate(BaseModel):
    policy_name: Optional[str] = None
    is_active: Optional[bool] = None
    min_replicas: Optional[int] = None
    max_replicas: Optional[int] = None
    cpu_scale_up_threshold: Optional[float] = None
    cpu_scale_down_threshold: Optional[float] = None
    memory_scale_up_threshold: Optional[float] = None
    memory_scale_down_threshold: Optional[float] = None
    check_interval_seconds: Optional[int] = None

class ScalingPolicyResponse(BaseModel):
    id: int
    policy_name: str
    container_id: str
    is_active: bool
    min_replicas: int
    max_replicas: int
    target_cpu: float
    cpu_scale_up_threshold: float
    cpu_scale_down_threshold: float
    target_memory: float
    memory_scale_up_threshold: float
    memory_scale_down_threshold: float
    check_interval_seconds: int
    created_at: datetime

    class Config:
        from_attributes = True

