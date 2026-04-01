"""Routes for user feedback."""
import logging
from fastapi import APIRouter, HTTPException, Depends, Header

logger = logging.getLogger(__name__)
from typing import Dict, Optional
from sqlalchemy.orm import Session

from ..models.student import RatingRequest
from ..models import StudentProfile
from .onboarding import get_student_vector, update_student_vector
from ..data.loader import load_explanations
from ..services.vector_ops import update_student_vector as update_vector
from ..database import get_db
from ..models.db_models import UserVector, User, SessionVector
from ..services.auth_service import decode_token

router = APIRouter(prefix="/api", tags=["feedback"])


async def get_optional_user(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db),
) -> Optional[User]:
    """Get user if authenticated, otherwise return None."""
    if not authorization:
        return None

    if not authorization.startswith("Bearer "):
        return None

    token = authorization[7:]
    token_data = decode_token(token)

    if not token_data:
        return None

    user = db.query(User).filter(User.id == token_data.user_id).first()
    return user


@router.post("/feedback", response_model=StudentProfile)
async def submit_feedback(
    request: RatingRequest,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db),
) -> StudentProfile:
    """
    Submit rating for an explanation and update student vector.

    The student's vector is updated based on:
    - Current vector
    - Explanation vector
    - Rating (1-5)

    Higher ratings boost the dimensions the explanation emphasizes.
    Supports both authenticated users and session-based profiles.
    """
    try:
        # Validate rating
        if not (1 <= request.rating <= 5):
            raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")

        student_vector = None
        session_id = request.session_id

        # Try to get authenticated user vector first
        if current_user:
            user_vector = db.query(UserVector).filter(UserVector.user_id == current_user.id).first()
            if user_vector:
                student_vector = user_vector.vector

        # Fall back to session-based vector
        if not student_vector:
            if not session_id:
                raise HTTPException(status_code=400, detail="Missing session_id or authentication")
            student_vector = get_student_vector(session_id, db)

        if student_vector is None:
            raise HTTPException(status_code=404, detail="Student profile not found")

        # Load explanations
        explanations = load_explanations()

        # Find the explanation by ID
        explanation = None
        for e in explanations:
            if e["id"] == request.explanation_id:
                explanation = e
                break

        if not explanation:
            raise HTTPException(status_code=404, detail=f"Explanation {request.explanation_id} not found")

        # Update vector based on rating
        new_vector = update_vector(
            current_vector=student_vector,
            explanation_vector=explanation["vector"],
            rating=request.rating,
            learning_rate=0.1,
            baseline_rating=3.0,
        )

        # Save updated vector
        if current_user:
            # Update in database
            user_vector_obj = db.query(UserVector).filter(UserVector.user_id == current_user.id).first()
            if user_vector_obj:
                user_vector_obj.vector = new_vector
                db.commit()
            return StudentProfile(user_id=current_user.id, vector=new_vector)
        else:
            # Update in database and memory
            update_student_vector(session_id, new_vector, db)
            return StudentProfile(session_id=session_id, vector=new_vector)
    except HTTPException:
        raise
    except Exception:
        logger.exception("submit feedback failed for explanation_id=%s", request.explanation_id)
        raise HTTPException(status_code=500, detail="Internal server error")
