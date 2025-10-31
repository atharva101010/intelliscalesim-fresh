from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
import hashlib, logging
from database import get_db
from models import User

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/auth", tags=["authentication"])

class RegisterRequest(BaseModel):
    email: str
    username: str
    password: str
    role: str = "student"

class LoginRequest(BaseModel):
    email: str
    password: str

@router.post("/register")
async def register(req: RegisterRequest, db: Session = Depends(get_db)):
    try:
        if db.query(User).filter((User.email == req.email) | (User.username == req.username)).first():
            raise HTTPException(status_code=400, detail="User exists")
        hashed = hashlib.sha256(req.password.encode()).hexdigest()
        user = User(email=req.email, username=req.username, password=hashed, role=req.role, full_name=req.username)
        db.add(user)
        db.commit()
        logger.info(f"✅ Registered: {req.email}")
        return {"ok": True, "id": user.id, "msg": "Registration successful"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/login")
async def login(req: LoginRequest, db: Session = Depends(get_db)):
    try:
        user = db.query(User).filter(User.email == req.email).first()
        if not user or user.password != hashlib.sha256(req.password.encode()).hexdigest():
            raise HTTPException(status_code=401, detail="Invalid credentials")
        logger.info(f"✅ Login: {req.email}")
        return {"ok": True, "id": user.id, "email": user.email}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
