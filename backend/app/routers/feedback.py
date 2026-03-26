"""Routes for user feedback."""
from fastapi import APIRouter, HTTPException
from typing import Dict

from ..models.student import RatingRequest
from ..models import StudentProfile
from .onboarding import get_student_vector, update_student_vector
from ..data.loader import load_explanations
from ..services.vector_ops import update_student_vector as update_vector

router = APIRouter(prefix="/api", tags=["feedback"])


@router.post("/feedback", response_model=StudentProfile)
async def submit_feedback(request: RatingRequest) -> StudentProfile:
    """
    Submit rating for an explanation and update student vector.

    The student's vector is updated based on:
    - Current vector
    - Explanation vector
    - Rating (1-5)

    Higher ratings boost the dimensions the explanation emphasizes.
    """
    # Validate rating
    if not (1 <= request.rating <= 5):
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")

    # Get current student vector
    student_vector = get_student_vector(request.session_id)
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
    update_student_vector(request.session_id, new_vector)

    return StudentProfile(session_id=request.session_id, vector=new_vector)
