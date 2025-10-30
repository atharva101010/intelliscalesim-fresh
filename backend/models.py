from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, Boolean, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="student")  # student, teacher, admin
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    containers = relationship("Container", back_populates="owner")
    load_tests = relationship("LoadTest", back_populates="owner")
    scaling_policies = relationship("ScalingPolicy", back_populates="owner")

class Container(Base):
    __tablename__ = "containers"
    
    id = Column(Integer, primary_key=True, index=True)
    container_id = Column(String, unique=True, index=True)
    name = Column(String, nullable=False)
    image = Column(String, nullable=False)
    status = Column(String, default="created")
    ports = Column(JSON)  # {"80/tcp": 8080}
    environment = Column(JSON)  # {"KEY": "value"}
    cpu_limit = Column(Float, default=1.0)
    memory_limit = Column(String, default="512m")
    user_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    owner = relationship("User", back_populates="containers")
    metrics = relationship("ContainerMetric", back_populates="container")

class ContainerMetric(Base):
    __tablename__ = "container_metrics"
    
    id = Column(Integer, primary_key=True, index=True)
    container_id = Column(Integer, ForeignKey("containers.id"))
    cpu_usage = Column(Float)
    memory_usage = Column(Float)
    network_rx = Column(Float)
    network_tx = Column(Float)
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    container = relationship("Container", back_populates="metrics")

class LoadTest(Base):
    __tablename__ = "load_tests"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    target_url = Column(String, nullable=False)
    requests = Column(Integer, default=1000)
    concurrency = Column(Integer, default=10)
    duration = Column(Float)  # seconds
    requests_per_second = Column(Float)
    mean_response_time = Column(Float)
    median_response_time = Column(Float)
    p95_response_time = Column(Float)
    p99_response_time = Column(Float)
    success_rate = Column(Float)
    failed_requests = Column(Integer, default=0)
    results = Column(JSON)
    user_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    owner = relationship("User", back_populates="load_tests")

class ScalingPolicy(Base):
    __tablename__ = "scaling_policies"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    container_id = Column(Integer, ForeignKey("containers.id"))
    min_replicas = Column(Integer, default=1)
    max_replicas = Column(Integer, default=10)
    target_cpu = Column(Float, default=70.0)
    target_memory = Column(Float, default=80.0)
    scale_up_threshold = Column(Float, default=80.0)
    scale_down_threshold = Column(Float, default=30.0)
    cooldown_period = Column(Integer, default=300)  # seconds
    enabled = Column(Boolean, default=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    owner = relationship("User", back_populates="scaling_policies")
    events = relationship("ScalingEvent", back_populates="policy")

class ScalingEvent(Base):
    __tablename__ = "scaling_events"
    
    id = Column(Integer, primary_key=True, index=True)
    policy_id = Column(Integer, ForeignKey("scaling_policies.id"))
    event_type = Column(String)  # scale_up, scale_down
    from_replicas = Column(Integer)
    to_replicas = Column(Integer)
    reason = Column(Text)
    cpu_usage = Column(Float)
    memory_usage = Column(Float)
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    policy = relationship("ScalingPolicy", back_populates="events")

class CloudBilling(Base):
    __tablename__ = "cloud_billing"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    provider = Column(String)  # aws, gcp, azure
    cpu_cores = Column(Integer)
    memory_gb = Column(Integer)
    storage_gb = Column(Integer)
    duration_hours = Column(Float)
    data_transfer_gb = Column(Float)
    cpu_cost = Column(Float)
    memory_cost = Column(Float)
    storage_cost = Column(Float)
    network_cost = Column(Float)
    total_cost = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)
