from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auto-scaling", tags=["auto-scaling"])

# Simple in-memory storage for demo (replace with database later)
policies_db = {}

class ScalingPolicy:
    def __init__(self, id, policy_name, container_id, min_replicas, max_replicas, 
                 target_cpu, cpu_scale_up_threshold, cpu_scale_down_threshold,
                 target_memory, memory_scale_up_threshold, memory_scale_down_threshold,
                 check_interval_seconds, is_active=False):
        self.id = id
        self.policy_name = policy_name
        self.container_id = container_id
        self.min_replicas = min_replicas
        self.max_replicas = max_replicas
        self.target_cpu = target_cpu
        self.cpu_scale_up_threshold = cpu_scale_up_threshold
        self.cpu_scale_down_threshold = cpu_scale_down_threshold
        self.target_memory = target_memory
        self.memory_scale_up_threshold = memory_scale_up_threshold
        self.memory_scale_down_threshold = memory_scale_down_threshold
        self.check_interval_seconds = check_interval_seconds
        self.is_active = is_active
        self.created_at = datetime.utcnow()

    def to_dict(self):
        return {
            "id": self.id,
            "policy_name": self.policy_name,
            "container_id": self.container_id,
            "min_replicas": self.min_replicas,
            "max_replicas": self.max_replicas,
            "target_cpu": self.target_cpu,
            "cpu_scale_up_threshold": self.cpu_scale_up_threshold,
            "cpu_scale_down_threshold": self.cpu_scale_down_threshold,
            "target_memory": self.target_memory,
            "memory_scale_up_threshold": self.memory_scale_up_threshold,
            "memory_scale_down_threshold": self.memory_scale_down_threshold,
            "check_interval_seconds": self.check_interval_seconds,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat()
        }

@router.post("/policies/create")
async def create_scaling_policy(
    policy_name: str,
    container_id: str,
    min_replicas: int = 1,
    max_replicas: int = 5,
    initial_replicas: int = 1,
    target_cpu: float = 70.0,
    cpu_scale_up_threshold: float = 80.0,
    cpu_scale_down_threshold: float = 30.0,
    target_memory: float = 75.0,
    memory_scale_up_threshold: float = 85.0,
    memory_scale_down_threshold: float = 40.0,
    check_interval_seconds: int = 30
):
    """Create a new auto-scaling policy"""
    
    # Validate thresholds
    if cpu_scale_down_threshold >= cpu_scale_up_threshold:
        raise HTTPException(status_code=400, detail="CPU scale down threshold must be less than scale up threshold")
    
    if memory_scale_down_threshold >= memory_scale_up_threshold:
        raise HTTPException(status_code=400, detail="Memory scale down threshold must be less than scale up threshold")
    
    # Create new policy
    policy_id = len(policies_db) + 1
    policy = ScalingPolicy(
        id=policy_id,
        policy_name=policy_name,
        container_id=container_id,
        min_replicas=min_replicas,
        max_replicas=max_replicas,
        target_cpu=target_cpu,
        cpu_scale_up_threshold=cpu_scale_up_threshold,
        cpu_scale_down_threshold=cpu_scale_down_threshold,
        target_memory=target_memory,
        memory_scale_up_threshold=memory_scale_up_threshold,
        memory_scale_down_threshold=memory_scale_down_threshold,
        check_interval_seconds=check_interval_seconds,
        is_active=False
    )
    
    policies_db[policy_id] = policy
    logger.info(f"Created scaling policy: {policy_name}")
    
    return policy.to_dict()

@router.get("/policies")
async def get_scaling_policies():
    """Get all scaling policies"""
    return [policy.to_dict() for policy in policies_db.values()]

@router.get("/policies/{policy_id}")
async def get_scaling_policy(policy_id: int):
    """Get specific scaling policy"""
    if policy_id not in policies_db:
        raise HTTPException(status_code=404, detail="Policy not found")
    
    return policies_db[policy_id].to_dict()

@router.put("/policies/{policy_id}")
async def update_scaling_policy(
    policy_id: int,
    policy_name: str = None,
    is_active: bool = None,
    min_replicas: int = None,
    max_replicas: int = None,
    cpu_scale_up_threshold: float = None,
    cpu_scale_down_threshold: float = None,
    memory_scale_up_threshold: float = None,
    memory_scale_down_threshold: float = None,
    check_interval_seconds: int = None
):
    """Update scaling policy"""
    if policy_id not in policies_db:
        raise HTTPException(status_code=404, detail="Policy not found")
    
    policy = policies_db[policy_id]
    
    if policy_name:
        policy.policy_name = policy_name
    if is_active is not None:
        policy.is_active = is_active
    if min_replicas:
        policy.min_replicas = min_replicas
    if max_replicas:
        policy.max_replicas = max_replicas
    if cpu_scale_up_threshold:
        policy.cpu_scale_up_threshold = cpu_scale_up_threshold
    if cpu_scale_down_threshold:
        policy.cpu_scale_down_threshold = cpu_scale_down_threshold
    if memory_scale_up_threshold:
        policy.memory_scale_up_threshold = memory_scale_up_threshold
    if memory_scale_down_threshold:
        policy.memory_scale_down_threshold = memory_scale_down_threshold
    if check_interval_seconds:
        policy.check_interval_seconds = check_interval_seconds
    
    logger.info(f"Updated scaling policy: {policy_id}")
    return policy.to_dict()

@router.post("/policies/{policy_id}/start")
async def start_autoscaling(policy_id: int):
    """Start auto-scaling for a policy"""
    if policy_id not in policies_db:
        raise HTTPException(status_code=404, detail="Policy not found")
    
    policy = policies_db[policy_id]
    policy.is_active = True
    logger.info(f"Started auto-scaling for policy: {policy_id}")
    
    return {"message": "Auto-scaling started", "policy_id": policy_id}

@router.post("/policies/{policy_id}/stop")
async def stop_autoscaling(policy_id: int):
    """Stop auto-scaling for a policy"""
    if policy_id not in policies_db:
        raise HTTPException(status_code=404, detail="Policy not found")
    
    policy = policies_db[policy_id]
    policy.is_active = False
    logger.info(f"Stopped auto-scaling for policy: {policy_id}")
    
    return {"message": "Auto-scaling stopped", "policy_id": policy_id}

@router.get("/policies/{policy_id}/events")
async def get_scaling_events(policy_id: int):
    """Get scaling events for a policy"""
    if policy_id not in policies_db:
        raise HTTPException(status_code=404, detail="Policy not found")
    
    return {"events": [], "message": "No scaling events yet"}

@router.delete("/policies/{policy_id}")
async def delete_scaling_policy(policy_id: int):
    """Delete scaling policy"""
    if policy_id not in policies_db:
        raise HTTPException(status_code=404, detail="Policy not found")
    
    del policies_db[policy_id]
    logger.info(f"Deleted scaling policy: {policy_id}")
    
    return {"message": "Policy deleted"}

