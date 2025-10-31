from pydantic import BaseModel
from typing import Optional

# User Schemas
class UserRegister(BaseModel):
    email: str
    username: str
    password: str
    role: str = "student"

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: int
    email: str
    username: str
    role: str
    
    class Config:
        from_attributes = True

# Billing Schemas
class BillingCalculateRequest(BaseModel):
    cpu: float
    memory: float
    duration_hours: float

class BillingResponse(BaseModel):
    total_cost: float
    breakdown: dict

# Pricing Schemas
class PricingResponse(BaseModel):
    cpu_per_hour: float
    memory_per_gb_hour: float
    base_cost: float

# Container Schemas
class ContainerDeployRequest(BaseModel):
    name: str
    image: str
    cpu: float = 0.5
    memory: float = 512

class ContainerResponse(BaseModel):
    id: str
    name: str
    image: str
    status: str
    
    class Config:
        from_attributes = True

# Simulation Schemas
class SimulationStartRequest(BaseModel):
    duration_minutes: int
    load_pattern: str = "linear"

class SimulationResponse(BaseModel):
    simulation_id: str
    status: str
    
    class Config:
        from_attributes = True

__all__ = [
    'UserRegister', 'UserLogin', 'UserResponse',
    'BillingCalculateRequest', 'BillingResponse',
    'PricingResponse',
    'ContainerDeployRequest', 'ContainerResponse',
    'SimulationStartRequest', 'SimulationResponse'
]
