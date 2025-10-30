from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models import User, ScalingPolicy, ScalingEvent
from schemas import ScalingPolicyCreate, ScalingPolicyResponse, ScalingEventResponse
from auth import get_current_user

router = APIRouter(prefix="/api/scaling", tags=["Auto-Scaling"])

@router.post("/policies", response_model=ScalingPolicyResponse)
def create_scaling_policy(
    policy_data: ScalingPolicyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    policy = ScalingPolicy(
        name=policy_data.name,
        container_id=policy_data.container_id,
        min_replicas=policy_data.min_replicas,
        max_replicas=policy_data.max_replicas,
        target_cpu=policy_data.target_cpu,
        target_memory=policy_data.target_memory,
        scale_up_threshold=policy_data.scale_up_threshold,
        scale_down_threshold=policy_data.scale_down_threshold,
        cooldown_period=policy_data.cooldown_period,
        user_id=current_user.id
    )
    db.add(policy)
    db.commit()
    db.refresh(policy)
    return policy

@router.get("/policies", response_model=List[ScalingPolicyResponse])
def list_scaling_policies(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    policies = db.query(ScalingPolicy).filter(ScalingPolicy.user_id == current_user.id).all()
    return policies

@router.get("/policies/{policy_id}", response_model=ScalingPolicyResponse)
def get_scaling_policy(
    policy_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    policy = db.query(ScalingPolicy).filter(
        ScalingPolicy.id == policy_id,
        ScalingPolicy.user_id == current_user.id
    ).first()
    
    if not policy:
        raise HTTPException(status_code=404, detail="Scaling policy not found")
    
    return policy

@router.put("/policies/{policy_id}", response_model=ScalingPolicyResponse)
def update_scaling_policy(
    policy_id: int,
    policy_data: ScalingPolicyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    policy = db.query(ScalingPolicy).filter(
        ScalingPolicy.id == policy_id,
        ScalingPolicy.user_id == current_user.id
    ).first()
    
    if not policy:
        raise HTTPException(status_code=404, detail="Scaling policy not found")
    
    policy.name = policy_data.name
    policy.min_replicas = policy_data.min_replicas
    policy.max_replicas = policy_data.max_replicas
    policy.target_cpu = policy_data.target_cpu
    policy.target_memory = policy_data.target_memory
    policy.scale_up_threshold = policy_data.scale_up_threshold
    policy.scale_down_threshold = policy_data.scale_down_threshold
    policy.cooldown_period = policy_data.cooldown_period
    
    db.commit()
    db.refresh(policy)
    return policy

@router.delete("/policies/{policy_id}")
def delete_scaling_policy(
    policy_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    policy = db.query(ScalingPolicy).filter(
        ScalingPolicy.id == policy_id,
        ScalingPolicy.user_id == current_user.id
    ).first()
    
    if not policy:
        raise HTTPException(status_code=404, detail="Scaling policy not found")
    
    db.delete(policy)
    db.commit()
    return {"message": "Scaling policy deleted"}

@router.get("/events", response_model=List[ScalingEventResponse])
def list_scaling_events(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    events = db.query(ScalingEvent).join(ScalingPolicy).filter(
        ScalingPolicy.user_id == current_user.id
    ).order_by(ScalingEvent.timestamp.desc()).limit(50).all()
    return events
