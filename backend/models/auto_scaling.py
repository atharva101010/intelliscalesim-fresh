from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class ScalingPolicy(Base):
    __tablename__ = "scaling_policies"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    
    # Basic Information
    policy_name = Column(String, index=True)
    container_id = Column(String)
    is_active = Column(Boolean, default=False)
    
    # Replica Configuration
    min_replicas = Column(Integer, default=1)
    max_replicas = Column(Integer, default=5)
    initial_replicas = Column(Integer, default=1)
    
    # CPU Metrics
    target_cpu = Column(Float, default=70.0)
    cpu_scale_up_threshold = Column(Float, default=80.0)
    cpu_scale_down_threshold = Column(Float, default=30.0)
    
    # Memory Metrics
    target_memory = Column(Float, default=75.0)
    memory_scale_up_threshold = Column(Float, default=85.0)
    memory_scale_down_threshold = Column(Float, default=40.0)
    
    # Check Interval
    check_interval_seconds = Column(Integer, default=30)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    user = relationship("User", back_populates="scaling_policies")

class ScalingEvent(Base):
    __tablename__ = "scaling_events"

    id = Column(Integer, primary_key=True, index=True)
    policy_id = Column(Integer, ForeignKey("scaling_policies.id"))
    
    event_type = Column(String)  # "scale_up" or "scale_down"
    reason = Column(String)  # "cpu" or "memory"
    replicas_before = Column(Integer)
    replicas_after = Column(Integer)
    triggered_at = Column(DateTime, default=datetime.utcnow)

