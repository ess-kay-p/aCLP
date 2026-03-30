"""Routes for getting explanations."""
from fastapi import APIRouter, HTTPException, Depends, Header
from typing import Dict, List, Optional
from sqlalchemy.orm import Session

from ..models import Explanation
from .onboarding import get_student_vector
from ..services.matching import find_best_explanation
from ..data.loader import load_explanations
from ..database import get_db
from ..models.db_models import UserVector, User
from ..routers.auth import get_current_user_from_header
from ..services.auth_service import decode_token

router = APIRouter(prefix="/api", tags=["explain"])


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


@router.get("/concepts")
async def get_concepts() -> Dict[str, List[str]]:
    """Get list of available concepts."""
    return {
        "concepts": ["Photosynthesis", "Newton's Laws", "Compound Interest"]
    }


@router.post("/explain")
async def get_explanation(
    request: Dict,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db),
) -> Dict:
    """
    Get best-matched explanation for a student and concept.

    For authenticated users, uses JWT token. For session-based users, uses session_id.

    Expected request body:
    {
        "session_id": "abc123",  # Optional if authenticated
        "concept": "acceleration"
    }
    """
    student_vector = None
    concept = request.get("concept")

    if not concept:
        raise HTTPException(status_code=400, detail="Missing concept")

    # Try to get authenticated user vector first
    if current_user:
        user_vector = db.query(UserVector).filter(UserVector.user_id == current_user.id).first()
        if user_vector:
            student_vector = user_vector.vector

    # Fall back to session-based vector
    if not student_vector:
        session_id = request.get("session_id")
        if not session_id:
            raise HTTPException(status_code=400, detail="Missing session_id or authentication")
        student_vector = get_student_vector(session_id)

    if student_vector is None:
        raise HTTPException(status_code=404, detail="Student profile not found. Complete onboarding first.")

    # Load explanations
    explanations = load_explanations()

    # Filter for this concept
    concept_explanations = [
        e for e in explanations
        if e["concept"] == concept
    ]

    if not concept_explanations:
        raise HTTPException(status_code=404, detail=f"No explanations found for concept: {concept}")

    # Find best match
    best = find_best_explanation(student_vector, concept_explanations)

    if not best:
        raise HTTPException(status_code=500, detail="Failed to find best explanation")

    return {
        "id": best["id"],
        "concept": best["concept"],
        "style": best["style"],
        "text": best["text"],
        "vector": best["vector"],
    }
