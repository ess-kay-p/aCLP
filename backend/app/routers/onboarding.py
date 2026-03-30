"""Onboarding routes using branching questionnaire."""
import json
import uuid
from fastapi import APIRouter, HTTPException
from typing import Dict, List

from ..models import StudentProfile
from ..services.vector_ops import create_zero_vector, VECTOR_MAX
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
    Submit questionnaire answers and create student profile.

    Processes user answers to generate 8D learner vector.
    """
    # Load questionnaire for validation
    questionnaire = load_questionnaire()
    questions_by_id = {q["id"]: q for q in questionnaire["questions"]}

    # Initialize vector at baseline (0.5 for each dimension)
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
            for dimension_name, update_value in option["dimension_updates"].items():
                # Find dimension index
                from ..services.vector_ops import DIMENSIONS
                if dimension_name in DIMENSIONS:
                    dim_idx = DIMENSIONS.index(dimension_name)
                    vector[dim_idx] = min(vector[dim_idx] + update_value, VECTOR_MAX)

    # Create or get session
    if request.session_id:
        session_id = request.session_id
    else:
        session_id = str(uuid.uuid4())

    # Store vector
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
