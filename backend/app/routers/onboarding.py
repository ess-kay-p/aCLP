"""Onboarding routes for generating and selecting explanation styles."""
import uuid
from fastapi import APIRouter, HTTPException
from typing import Dict

from ..models import ExplanationVariants, StudentProfile
from ..models.student import OnboardingRequest, StyleSelection
from ..services.llm import generate_explanation_variants
from ..services.vector_ops import create_style_vector, normalize_vector

router = APIRouter(prefix="/api/onboarding", tags=["onboarding"])

# In-memory store for student profiles
student_profiles: Dict[str, list] = {}  # session_id -> vector


@router.post("/generate", response_model=ExplanationVariants)
async def generate_variants(request: OnboardingRequest) -> ExplanationVariants:
    """
    Generate 4 explanation variants for a user's topic.

    Takes a user's question and returns 4 style variants from LLM.
    """
    try:
        variants = generate_explanation_variants(request.topic)
        return ExplanationVariants(topic=request.topic, variants=variants)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating variants: {str(e)}")


@router.post("/select", response_model=StudentProfile)
async def select_style(request: StyleSelection) -> StudentProfile:
    """
    User selects their preferred style from the 4 variants.

    Creates/updates student profile with vector based on selected style.
    """
    valid_styles = {"sports", "step_by_step", "narrative", "technical"}

    if request.selected_style not in valid_styles:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid style. Must be one of: {valid_styles}"
        )

    # Create session if not exists
    if request.session_id:
        session_id = request.session_id
    else:
        session_id = str(uuid.uuid4())

    # Create vector from selected style
    vector = create_style_vector(request.selected_style)

    # Store in memory
    student_profiles[session_id] = vector

    return StudentProfile(session_id=session_id, vector=vector)


def get_student_vector(session_id: str) -> list:
    """Retrieve student vector from memory."""
    if session_id not in student_profiles:
        return None
    return student_profiles[session_id]


def update_student_vector(session_id: str, new_vector: list) -> None:
    """Update student vector in memory."""
    student_profiles[session_id] = new_vector
