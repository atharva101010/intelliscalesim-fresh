"""
Database Initialization Script
Creates all tables in SQLite database

Usage:
    python3 init_database.py
"""

import os
import sys
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Boolean
from sqlalchemy.orm import declarative_base
from datetime import datetime

# ===========================
# Database Setup
# ===========================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATABASE_URL = f"sqlite:///{os.path.join(BASE_DIR, 'intelliscalesim.db')}"

print(f"\n🔧 Creating database at: {DATABASE_URL}\n")

# Create engine
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

# Create base
Base = declarative_base()

# ===========================
# Model Definitions
# ===========================

class User(Base):
    """User model"""
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    username = Column(String, unique=True, index=True)
    password = Column(String)
    full_name = Column(String)
    role = Column(String, default="student")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class LoadTest(Base):
    """Load test model"""
    __tablename__ = "load_tests"
    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    container_name = Column(String, index=True)
    total_requests = Column(Integer)
    success_count = Column(Integer)
    error_count = Column(Integer)
    success_rate = Column(Float)
    avg_response_time = Column(Float)
    min_response_time = Column(Float)
    max_response_time = Column(Float)
    requests_per_second = Column(Float)


class Container(Base):
    """Container model"""
    __tablename__ = "containers"
    id = Column(Integer, primary_key=True, index=True)
    container_id = Column(String, unique=True, index=True)
    name = Column(String, index=True)
    image = Column(String)
    status = Column(String, default="running")
    cpu_usage = Column(Float, default=0)
    memory_usage = Column(Float, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ScalingActivity(Base):
    """Scaling activity model"""
    __tablename__ = "scaling_activities"
    id = Column(Integer, primary_key=True, index=True)
    container_id = Column(String, index=True)
    action = Column(String)
    reason = Column(String)
    cpu_threshold = Column(Float)
    memory_threshold = Column(Float)
    timestamp = Column(DateTime, default=datetime.utcnow)


class BillingRecord(Base):
    """Billing model"""
    __tablename__ = "billing_records"
    id = Column(Integer, primary_key=True, index=True)
    container_id = Column(String, index=True)
    resource_type = Column(String)
    quantity = Column(Float)
    unit_cost = Column(Float)
    total_cost = Column(Float)
    period_start = Column(DateTime)
    period_end = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)


# ===========================
# Create Tables
# ===========================

if __name__ == "__main__":
    try:
        print("🔨 Creating tables...\n")
        Base.metadata.create_all(bind=engine)
        
        # Verify
        from sqlalchemy import inspect
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        
        if tables:
            print("✅ Tables created successfully!\n")
            print("📋 Created tables:")
            for table in sorted(tables):
                print(f"   ✓ {table}")
            print(f"\n✅ Total: {len(tables)} tables\n")
        else:
            print("❌ No tables created!\n")
            sys.exit(1)
            
    except Exception as e:
        print(f"❌ Error: {str(e)}\n")
        sys.exit(1)
