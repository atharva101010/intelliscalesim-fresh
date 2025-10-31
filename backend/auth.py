"""
Authentication Router
Handles user registration, login, and session management
"""

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime, timedelta
import logging
import hashlib
import secrets

from database import get_db
from models import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["authentication"])

# ===========================
# Pydantic Models
# ===========================
class UserRegister(BaseModel):
    """User registration model"""
    email: str
    username: str
    password: str
    full_name: str
    role: str = "student"

    model_config = {
        "json_schema_extra": {
            "example": {
                "email": "student@example.com",
                "username": "student123",
                "password": "SecurePass123!",
                "full_name": "John Doe",
                "role": "student"
            }
        }
    }

class UserLogin(BaseModel):
    """User login model"""
    email: str
    password: str

    model_config = {
        "json_schema_extra": {
            "example": {
                "email": "student@example.com",
                "password": "SecurePass123!"
            }
        }
    }

class UserResponse(BaseModel):
    """User response model"""
    id: int
    email: str
    username: str
    full_name: str
    role: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}

class TokenResponse(BaseModel):
    """Token response model"""
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
    expires_in: int

    model_config = {"from_attributes": True}

class UserUpdate(BaseModel):
    """User update model"""
    full_name: str = None
    is_active: bool = None
    role: str = None

    model_config = {
        "json_schema_extra": {
            "example": {
                "full_name": "Jane Doe",
                "is_active": True,
                "role": "teacher"
            }
        }
    }

# ===========================
# In-Memory Session Storage
# ===========================
sessions_db = {}

# ===========================
# Utility Functions
# ===========================
def hash_password(password: str) -> str:
    """Hash password using SHA256"""
    return hashlib.sha256(password.encode()).hexdigest()

def generate_token() -> str:
    """Generate secure random token"""
    return secrets.token_urlsafe(32)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against hash"""
    return hash_password(plain_password) == hashed_password

# ===========================
# Authentication Endpoints
# ===========================

@router.post("/register", response_model=TokenResponse)
async def register(user_data: UserRegister, db: Session = Depends(get_db)):
    """
    Register a new user
    
    Returns authentication token and user details
    
    - **email**: User email address (must be unique)
    - **username**: Unique username
    - **password**: Strong password (recommended: 8+ chars)
    - **full_name**: User's full name
    - **role**: User role - student, teacher, or admin
    """
    logger.info(f"📝 Registration attempt for: {user_data.email}")
    
    # Validate role
    valid_roles = ["student", "teacher", "admin"]
    if user_data.role not in valid_roles:
        logger.warning(f"❌ Invalid role attempted: {user_data.role}")
        raise HTTPException(
            status_code=400, 
            detail=f"Role must be one of {', '.join(valid_roles)}"
        )
    
    # Check if email already exists
    existing_email = db.query(User).filter(User.email == user_data.email).first()
    if existing_email:
        logger.warning(f"❌ Email already registered: {user_data.email}")
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Check if username already exists
    existing_username = db.query(User).filter(User.username == user_data.username).first()
    if existing_username:
        logger.warning(f"❌ Username already taken: {user_data.username}")
        raise HTTPException(status_code=400, detail="Username already taken")
    
    # Create new user
    hashed_password = hash_password(user_data.password)
    
    new_user = User(
        email=user_data.email,
        username=user_data.username,
        password=hashed_password,
        full_name=user_data.full_name,
        role=user_data.role,
        is_active=True
    )
    
    try:
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Database error during registration: {str(e)}")
        raise HTTPException(status_code=500, detail="Registration failed")
    
    # Generate session token
    token = generate_token()
    sessions_db[token] = {
        "user_id": new_user.id,
        "email": new_user.email,
        "created_at": datetime.utcnow(),
        "expires_at": datetime.utcnow() + timedelta(days=7)
    }
    
    logger.info(f"✅ User registered successfully: {user_data.email}")
    
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(new_user),
        expires_in=604800  # 7 days in seconds
    )

@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin, db: Session = Depends(get_db)):
    """
    Login with email and password
    
    Returns authentication token and user details
    
    - **email**: User email address
    - **password**: User password
    """
    logger.info(f"🔐 Login attempt for: {credentials.email}")
    
    # Find user
    user = db.query(User).filter(User.email == credentials.email).first()
    
    if not user or not verify_password(credentials.password, user.password):
        logger.warning(f"❌ Invalid credentials for: {credentials.email}")
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not user.is_active:
        logger.warning(f"❌ Inactive user attempted login: {credentials.email}")
        raise HTTPException(status_code=401, detail="User account is inactive")
    
    # Generate session token
    token = generate_token()
    sessions_db[token] = {
        "user_id": user.id,
        "email": user.email,
        "created_at": datetime.utcnow(),
        "expires_at": datetime.utcnow() + timedelta(days=7)
    }
    
    logger.info(f"✅ Login successful: {credentials.email}")
    
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
        expires_in=604800  # 7 days in seconds
    )

@router.post("/logout")
async def logout(token: str):
    """
    Logout and invalidate session token
    
    - **token**: Bearer token to invalidate
    """
    logger.info("🚪 Logout requested")
    
    if token in sessions_db:
        del sessions_db[token]
        logger.info("✅ Logout successful")
        return {"message": "Logged out successfully", "status": "success"}
    
    logger.warning("❌ Invalid token during logout")
    raise HTTPException(status_code=401, detail="Invalid token")

@router.get("/me", response_model=UserResponse)
async def get_current_user(token: str = None, db: Session = Depends(get_db)):
    """
    Get current authenticated user information
    
    - **token**: Bearer token from Authorization header
    """
    logger.info("👤 Getting current user")
    
    if not token or token not in sessions_db:
        logger.warning("❌ Unauthorized access - no token")
        raise HTTPException(status_code=401, detail="Unauthorized - missing or invalid token")
    
    session = sessions_db[token]
    
    # Check if token expired
    if session["expires_at"] < datetime.utcnow():
        del sessions_db[token]
        logger.warning("❌ Token expired")
        raise HTTPException(status_code=401, detail="Token expired - please login again")
    
    # Find user
    user = db.query(User).filter(User.id == session["user_id"]).first()
    
    if not user:
        logger.warning("❌ User not found")
        raise HTTPException(status_code=404, detail="User not found")
    
    logger.info(f"✅ Retrieved user: {user.email}")
    
    return UserResponse.model_validate(user)

@router.post("/refresh-token")
async def refresh_token(token: str):
    """
    Refresh authentication token (extend expiration)
    
    - **token**: Current bearer token to refresh
    """
    logger.info("🔄 Token refresh requested")
    
    if token not in sessions_db:
        logger.warning("❌ Invalid token for refresh")
        raise HTTPException(status_code=401, detail="Invalid token")
    
    session = sessions_db[token]
    
    # Generate new token
    new_token = generate_token()
    sessions_db[new_token] = {
        "user_id": session["user_id"],
        "email": session["email"],
        "created_at": datetime.utcnow(),
        "expires_at": datetime.utcnow() + timedelta(days=7)
    }
    
    # Delete old token
    del sessions_db[token]
    
    logger.info("✅ Token refreshed successfully")
    
    return {
        "access_token": new_token,
        "token_type": "bearer",
        "expires_in": 604800
    }

@router.get("/users")
async def list_users(db: Session = Depends(get_db)):
    """
    List all users (admin endpoint)
    
    Returns all registered users in the system
    """
    logger.info("📋 Listing all users")
    
    try:
        users = db.query(User).all()
        
        return {
            "total": len(users),
            "users": [UserResponse.model_validate(u) for u in users]
        }
    except Exception as e:
        logger.error(f"❌ Error listing users: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to list users")

@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(user_id: int, db: Session = Depends(get_db)):
    """
    Get specific user by ID
    
    - **user_id**: User ID
    """
    logger.info(f"🔍 Getting user: {user_id}")
    
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        logger.warning(f"❌ User not found: {user_id}")
        raise HTTPException(status_code=404, detail=f"User {user_id} not found")
    
    return UserResponse.model_validate(user)

@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int, 
    update_data: UserUpdate, 
    db: Session = Depends(get_db)
):
    """
    Update user information (admin endpoint)
    
    - **user_id**: User ID to update
    - **full_name**: (optional) User's full name
    - **is_active**: (optional) User active status
    - **role**: (optional) User role
    """
    logger.info(f"✏️  Updating user: {user_id}")
    
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        logger.warning(f"❌ User not found: {user_id}")
        raise HTTPException(status_code=404, detail=f"User {user_id} not found")
    
    # Update allowed fields
    if update_data.full_name is not None:
        user.full_name = update_data.full_name
    
    if update_data.is_active is not None:
        user.is_active = update_data.is_active
    
    if update_data.role is not None:
        valid_roles = ["student", "teacher", "admin"]
        if update_data.role not in valid_roles:
            raise HTTPException(status_code=400, detail=f"Role must be one of {valid_roles}")
        user.role = update_data.role
    
    try:
        db.commit()
        db.refresh(user)
        logger.info(f"✅ User updated: {user_id}")
        return UserResponse.model_validate(user)
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Error updating user: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update user")

@router.delete("/users/{user_id}")
async def delete_user(user_id: int, db: Session = Depends(get_db)):
    """
    Delete a user (admin endpoint)
    
    - **user_id**: User ID to delete
    """
    logger.info(f"🗑️  Deleting user: {user_id}")
    
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        logger.warning(f"❌ User not found: {user_id}")
        raise HTTPException(status_code=404, detail=f"User {user_id} not found")
    
    try:
        # Remove from active sessions
        sessions_to_remove = [
            token for token, session in sessions_db.items() 
            if session["user_id"] == user_id
        ]
        for token in sessions_to_remove:
            del sessions_db[token]
        
        # Delete from database
        db.delete(user)
        db.commit()
        
        logger.info(f"✅ User deleted: {user_id}")
        
        return {
            "success": True,
            "message": f"User {user.email} deleted successfully"
        }
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Error deleting user: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete user")

@router.get("/status")
async def auth_status(db: Session = Depends(get_db)):
    """Get authentication service status"""
    logger.info("📊 Auth status check")
    
    try:
        total_users = db.query(User).count()
        active_sessions = len(sessions_db)
        
        return {
            "status": "operational",
            "total_users": total_users,
            "active_sessions": active_sessions,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting auth status: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get status")

@router.get("/health")
async def auth_health():
    """Health check for auth service"""
    return {
        "status": "healthy",
        "service": "authentication",
        "version": "1.0.0"
    }

@router.post("/validate-token")
async def validate_token(token: str):
    """
    Validate if token is still valid
    
    - **token**: Token to validate
    """
    logger.info("🔍 Validating token")
    
    if token not in sessions_db:
        logger.warning("❌ Invalid token")
        return {"valid": False, "message": "Invalid token"}
    
    session = sessions_db[token]
    
    # Check if token expired
    if session["expires_at"] < datetime.utcnow():
        del sessions_db[token]
        logger.warning("❌ Token expired")
        return {"valid": False, "message": "Token expired"}
    
    logger.info("✅ Token is valid")
    
    return {
        "valid": True,
        "user_id": session["user_id"],
        "email": session["email"],
        "expires_at": session["expires_at"].isoformat()
    }

