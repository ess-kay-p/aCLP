"""Admin routes for user management and learning profile inspection."""
import asyncio
import logging
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.db_models import User, UserVector, UserProfilingProfile
from ..routers.auth import get_current_user_from_header
from ..services.llm import generate_personalization_summary
from ..services.vector_ops import DIMENSIONS

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin", tags=["admin"])


def _require_admin(current_user: User):
    if not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")


class UserSummary(BaseModel):
    id: int
    email: str
    created_at: datetime
    has_vector: bool
    has_profile: bool

    class Config:
        from_attributes = True


class UserDetail(BaseModel):
    id: int
    email: str
    created_at: datetime
    vector: Optional[List[float]] = None
    profiling_answers: Optional[dict] = None


@router.get("/users", response_model=List[UserSummary])
async def list_users(
    current_user: User = Depends(get_current_user_from_header),
    db: Session = Depends(get_db),
):
    """List all non-admin users with profile status indicators."""
    _require_admin(current_user)
    users = db.query(User).filter(User.is_admin == False).order_by(User.created_at.desc()).all()
    result = []
    for u in users:
        vector_obj = db.query(UserVector).filter(UserVector.user_id == u.id).first()
        profile_obj = db.query(UserProfilingProfile).filter(UserProfilingProfile.user_id == u.id).first()
        result.append(UserSummary(
            id=u.id,
            email=u.email,
            created_at=u.created_at,
            has_vector=vector_obj is not None,
            has_profile=profile_obj is not None,
        ))
    return result


@router.get("/users/{user_id}/profile")
async def get_user_profile(
    user_id: int,
    current_user: User = Depends(get_current_user_from_header),
    db: Session = Depends(get_db),
):
    """Get learning vector for a specific user."""
    _require_admin(current_user)
    vector_obj = db.query(UserVector).filter(UserVector.user_id == user_id).first()
    if not vector_obj:
        return {"vector": []}
    return {"vector": vector_obj.vector}


@router.get("/users/{user_id}/profiling-answers")
async def get_user_profiling_answers(
    user_id: int,
    current_user: User = Depends(get_current_user_from_header),
    db: Session = Depends(get_db),
):
    """Get profiling Q&A answers for a specific user."""
    _require_admin(current_user)
    profile_obj = db.query(UserProfilingProfile).filter(UserProfilingProfile.user_id == user_id).first()
    return {"answers": profile_obj.profile_data if profile_obj else {}}


@router.get("/users/{user_id}/personalization-summary")
async def get_user_personalization_summary(
    user_id: int,
    current_user: User = Depends(get_current_user_from_header),
    db: Session = Depends(get_db),
):
    """Generate a rich LLM summary of a user's learning profile."""
    _require_admin(current_user)
    vector_obj = db.query(UserVector).filter(UserVector.user_id == user_id).first()
    profile_obj = db.query(UserProfilingProfile).filter(UserProfilingProfile.user_id == user_id).first()

    vector = vector_obj.vector if vector_obj else []
    profile_data = profile_obj.profile_data if profile_obj else {}

    loop = asyncio.get_event_loop()
    summary = await loop.run_in_executor(
        None, lambda: generate_personalization_summary(profile_data, vector)
    )
    return {"summary": summary}
