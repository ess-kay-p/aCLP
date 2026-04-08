"""Questionnaire management routes for admin and user configuration."""
import logging
from fastapi import APIRouter, Depends, HTTPException, status, Header

logger = logging.getLogger(__name__)
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from ..database import get_db
from ..models.db_models import User, UserQuestion, AdminQuestion, Category
from ..routers.auth import get_current_user_from_header

router = APIRouter(prefix="/api/questionnaire", tags=["questionnaire"])


class DimensionUpdate(BaseModel):
    """Dimension update for a question option."""

    dimension: str
    value: float


class QuestionOption(BaseModel):
    """A single option in a question."""

    text: str
    dimension_updates: Optional[dict] = {}  # empty for profiling/open questions
    image_url: Optional[str] = None
    alt_text: Optional[str] = None


class QuestionData(BaseModel):
    """Question data structure."""

    id: int
    question: str
    options: List[QuestionOption]
    category_id: Optional[int] = None
    question_type: Optional[str] = "vector"  # "vector" | "profiling" | "open"
    allow_multiple: Optional[bool] = False


class QuestionnaireResponse(BaseModel):
    """Questionnaire response with list of questions."""

    questions: List[dict]


async def get_optional_user(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db),
) -> Optional[User]:
    """Get user if authenticated, otherwise return None."""
    if not authorization:
        return None

    from ..services.auth_service import decode_token

    if not authorization.startswith("Bearer "):
        return None

    token = authorization[7:]
    token_data = decode_token(token)

    if not token_data:
        return None

    user = db.query(User).filter(User.id == token_data.user_id).first()
    return user


@router.get("/", response_model=QuestionnaireResponse)
async def get_questionnaire(
    category_id: Optional[int] = None,
    question_type: Optional[str] = None,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """
    Get questionnaire questions.

    Query parameters:
    - category_id: Filter by category. If None, returns general questions (category_id IS NULL).
    - question_type: Filter by type ("vector", "profiling", or "open"). If None, returns all types.

    For authenticated users with custom questions, returns their custom questions.
    Otherwise returns admin defaults filtered by category_id.
    """
    try:
        if current_user:
            # Get user's custom questions for this category
            user_questions = db.query(UserQuestion).filter(
                UserQuestion.user_id == current_user.id,
                UserQuestion.category_id == category_id
            ).order_by(UserQuestion.order).all()

            if user_questions:
                questions = [q.question_data for q in user_questions]
                if question_type:
                    types = question_type.split(",")
                    questions = [q for q in questions if q.get("question_type", "vector") in types]
                return QuestionnaireResponse(questions=questions)

        # Fall back to admin defaults - filter by category_id
        if category_id:
            admin_questions = db.query(AdminQuestion).filter(
                AdminQuestion.category_id == category_id
            ).order_by(AdminQuestion.order).all()
        else:
            admin_questions = db.query(AdminQuestion).filter(
                AdminQuestion.category_id.is_(None)
            ).order_by(AdminQuestion.order).all()

        questions = [q.question_data for q in admin_questions]
        if question_type:
            types = question_type.split(",")
            questions = [q for q in questions if q.get("question_type", "vector") in types]
        return QuestionnaireResponse(questions=questions)
    except Exception:
        logger.exception("get questionnaire failed for category_id=%s", category_id)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_question(
    question_data: QuestionData,
    current_user: User = Depends(get_current_user_from_header),
    db: Session = Depends(get_db),
):
    """Create a new question (admin only)."""
    try:
        if not current_user.is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admins can create default questions",
            )

        # If category_id provided, verify it exists
        if question_data.category_id:
            category = db.query(Category).filter(Category.id == question_data.category_id).first()
            if not category:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid category_id",
                )

        # Create admin question
        admin_q = AdminQuestion(
            category_id=question_data.category_id,
            order=question_data.id,
            question_data=question_data.dict(),
        )
        db.add(admin_q)
        db.commit()
        db.refresh(admin_q)

        return {"id": admin_q.id, "status": "created"}
    except HTTPException:
        raise
    except Exception:
        logger.exception("create question failed for id=%s", question_data.id)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.put("/{question_id}")
async def update_question(
    question_id: int,
    question_data: QuestionData,
    current_user: User = Depends(get_current_user_from_header),
    db: Session = Depends(get_db),
):
    """Update a question (admin or question owner)."""
    try:
        # Check if it's a user question
        user_q = db.query(UserQuestion).filter(
            UserQuestion.id == question_id,
            UserQuestion.user_id == current_user.id,
        ).first()

        if user_q:
            user_q.question_data = question_data.dict()
            db.commit()
            return {"id": user_q.id, "status": "updated"}

        # Check if it's an admin question (admin only)
        admin_q = db.query(AdminQuestion).filter(AdminQuestion.id == question_id).first()

        if admin_q:
            if not current_user.is_admin:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Only admins can edit default questions",
                )

            admin_q.question_data = question_data.dict()
            db.commit()
            return {"id": admin_q.id, "status": "updated"}

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found",
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("update question failed for id=%s", question_id)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.delete("/{question_id}")
async def delete_question(
    question_id: int,
    current_user: User = Depends(get_current_user_from_header),
    db: Session = Depends(get_db),
):
    """Delete a question (admin or question owner)."""
    try:
        # Check if it's a user question
        user_q = db.query(UserQuestion).filter(
            UserQuestion.id == question_id,
            UserQuestion.user_id == current_user.id,
        ).first()

        if user_q:
            db.delete(user_q)
            db.commit()
            return {"status": "deleted"}

        # Check if it's an admin question (admin only)
        admin_q = db.query(AdminQuestion).filter(AdminQuestion.id == question_id).first()

        if admin_q:
            if not current_user.is_admin:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Only admins can delete default questions",
                )

            db.delete(admin_q)
            db.commit()
            return {"status": "deleted"}

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found",
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("delete question failed for id=%s", question_id)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/reset")
async def reset_to_defaults(
    current_user: User = Depends(get_current_user_from_header),
    db: Session = Depends(get_db),
):
    """Reset user's custom questions to admin defaults."""
    try:
        # Delete all user's custom questions
        db.query(UserQuestion).filter(UserQuestion.user_id == current_user.id).delete()
        db.commit()

        return {"status": "reset to defaults"}
    except Exception:
        logger.exception("reset questionnaire failed for user_id=%s", current_user.id)
        raise HTTPException(status_code=500, detail="Internal server error")
