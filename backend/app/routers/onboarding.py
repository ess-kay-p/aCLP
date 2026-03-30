"""Onboarding routes using branching questionnaire."""
import json
import uuid
from fastapi import APIRouter, HTTPException
from typing import Dict, List, Optional

from ..models import StudentProfile
from ..services.vector_ops import create_zero_vector, VECTOR_MAX, create_style_vector
from ..services.llm import generate_explanation_variants
from pydantic import BaseModel

router = APIRouter(prefix="/api/onboarding", tags=["onboarding"])

# In-memory store for student profiles
student_profiles: Dict[str, list] = {}  # session_id -> vector


class QuestionnaireQuestion(BaseModel):
    """Single questionnaire question with options."""
    id: int
    question: str
    options: List[dict]


class QuestionnaireResponse(BaseModel):
    """Questionnaire structure."""
    questions: List[QuestionnaireQuestion]


class OnboardingAnswers(BaseModel):
    """Questionnaire answers submission."""
    session_id: str
    answers: Dict[int, int]  # question_id -> option_index
    selected_style: Optional[str] = None  # Optional style selection from variants


class PersonalizedVariantRequest(BaseModel):
    """Request for personalized explanation variants."""
    session_id: str
    topic: str


class PersonalizedVariantResponse(BaseModel):
    """Response with personalized explanation variants."""
    topic: str
    variants: List[Dict[str, str]]  # List of {style, text}


def load_questionnaire() -> Dict:
    """Load questionnaire from JSON file."""
    try:
        with open("app/data/questionnaire.json", "r") as f:
            return json.load(f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load questionnaire: {str(e)}")


@router.get("/questions", response_model=QuestionnaireResponse)
async def get_questionnaire():
    """
    Get all questionnaire questions for onboarding.

    Returns 10 branching questions to determine learner profile.
    """
    questionnaire = load_questionnaire()
    return QuestionnaireResponse(questions=questionnaire["questions"])


@router.post("/submit", response_model=StudentProfile)
async def submit_answers(request: OnboardingAnswers) -> StudentProfile:
    """
    Submit questionnaire answers and create/update student profile.

    Processes user answers to generate 8D learner vector.
    If selected_style is provided, further refines the vector based on style preference.
    """
    # Load questionnaire for validation
    questionnaire = load_questionnaire()
    questions_by_id = {q["id"]: q for q in questionnaire["questions"]}

    # Create or get session
    session_id = request.session_id
    if not session_id:
        session_id = str(uuid.uuid4())

    # Check if we already have a vector for this session (for refinement)
    existing_vector = student_profiles.get(session_id)

    # Initialize vector at baseline or use existing
    if existing_vector:
        vector = existing_vector.copy()
    else:
        vector = create_zero_vector()

    # Process each answer
    for question_id, option_index in request.answers.items():
        question_id = int(question_id)

        if question_id not in questions_by_id:
            raise HTTPException(status_code=400, detail=f"Invalid question ID: {question_id}")

        question = questions_by_id[question_id]

        if option_index < 0 or option_index >= len(question["options"]):
            raise HTTPException(status_code=400, detail=f"Invalid option index for question {question_id}")

        option = question["options"][option_index]

        # Apply dimension updates
        if "dimension_updates" in option:
            from ..services.vector_ops import DIMENSIONS
            for dimension_name, update_value in option["dimension_updates"].items():
                if dimension_name in DIMENSIONS:
                    dim_idx = DIMENSIONS.index(dimension_name)
                    vector[dim_idx] = min(vector[dim_idx] + update_value, VECTOR_MAX)

    # If a style was selected, refine the vector further
    if request.selected_style:
        style_vector = create_style_vector(request.selected_style)
        # Blend with existing vector (weighted average)
        for i in range(len(vector)):
            vector[i] = 0.7 * vector[i] + 0.3 * style_vector[i]

    # Store vector
    student_profiles[session_id] = vector

    return StudentProfile(session_id=session_id, vector=vector)


@router.post("/generate-personalized", response_model=PersonalizedVariantResponse)
async def generate_personalized_variants(
    request: PersonalizedVariantRequest,
) -> PersonalizedVariantResponse:
    """
    Generate 4 personalized explanation variants based on user's profile vector and topic.

    The LLM generates variants tailored to the user's learning style preferences.
    """
    # Get student vector to understand their preferences
    student_vector = student_profiles.get(request.session_id)
    if not student_vector:
        raise HTTPException(
            status_code=404,
            detail="Student profile not found. Complete questionnaire first.",
        )

    try:
        # Generate variants based on topic and student profile
        # The LLM will generate explanations tailored to the user's learning style
        variants = generate_explanation_variants(request.topic, student_vector)

        # Format variants for response
        formatted_variants = [
            {"style": style, "text": text}
            for style, text in variants.items()
        ]

        return PersonalizedVariantResponse(
            topic=request.topic,
            variants=formatted_variants,
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error generating variants: {str(e)}",
        )


def get_student_vector(session_id: str) -> list:
    """Retrieve student vector from memory."""
    if session_id not in student_profiles:
        return None
    return student_profiles[session_id]


def update_student_vector(session_id: str, new_vector: list) -> None:
    """Update student vector in memory."""
    student_profiles[session_id] = new_vector
