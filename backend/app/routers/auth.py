"""Authentication routes for user registration and login."""
from fastapi import APIRouter, Depends, HTTPException, status, Header
from typing import Optional
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from ..database import get_db
from ..models.db_models import User, UserVector
from ..services.auth_service import (
    hash_password,
    verify_password,
    create_access_token,
    decode_token,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    """Registration request payload."""

    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    """Login request payload."""

    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    """Token response payload."""

    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    """User response payload."""

    id: int
    email: str
    is_admin: bool

    class Config:
        from_attributes = True


async def get_current_user_from_header(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
) -> User:
    """Dependency for getting current user from Authorization header."""
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    # Extract token from "Bearer <token>"
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header",
        )

    token = authorization[7:]
    token_data = decode_token(token)

    if not token_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )

    user = db.query(User).filter(User.id == token_data.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    return user


@router.post("/register", response_model=TokenResponse)
async def register(request: RegisterRequest, db: Session = Depends(get_db)):
    """Register a new user and return access token."""
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == request.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    # Create new user
    user = User(
        email=request.email,
        hashed_password=hash_password(request.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Create initial vector (all 0.5)
    initial_vector = {
        "sports": 0.5,
        "systems": 0.5,
        "visual": 0.5,
        "narrative": 0.5,
        "analogy": 0.5,
        "step_by_step": 0.5,
        "academic": 0.5,
        "simple": 0.5,
    }
    user_vector = UserVector(user_id=user.id, vector=initial_vector)
    db.add(user_vector)
    db.commit()

    # Create token
    token = create_access_token(user.id, user.email)
    return TokenResponse(access_token=token)


@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest, db: Session = Depends(get_db)):
    """Login a user and return access token."""
    # Find user by email
    user = db.query(User).filter(User.email == request.email).first()
    if not user or not verify_password(request.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    # Create token
    token = create_access_token(user.id, user.email)
    return TokenResponse(access_token=token)


@router.get("/me", response_model=UserResponse)
async def get_current_user(
    current_user: User = Depends(get_current_user_from_header),
):
    """Get current user from token."""
    return current_user
