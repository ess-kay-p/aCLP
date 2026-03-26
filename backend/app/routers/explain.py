"""Routes for getting explanations."""
from fastapi import APIRouter, HTTPException
from typing import Dict, List

from ..models import Explanation
from .onboarding import get_student_vector
from ..services.matching import find_best_explanation
from ..data.loader import load_explanations

router = APIRouter(prefix="/api", tags=["explain"])


@router.get("/concepts")
async def get_concepts() -> Dict[str, List[str]]:
    """Get list of available concepts."""
    return {
        "concepts": ["acceleration", "energy", "probability"]
    }


@router.post("/explain")
async def get_explanation(request: Dict) -> Dict:
    """
    Get best-matched explanation for a student and concept.

    Expected request body:
    {
        "session_id": "abc123",
        "concept": "acceleration"
    }
    """
    session_id = request.get("session_id")
    concept = request.get("concept")

    if not session_id or not concept:
        raise HTTPException(status_code=400, detail="Missing session_id or concept")

    # Get student vector
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
