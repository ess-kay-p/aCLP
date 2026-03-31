"""Onboarding routes using branching questionnaire."""
import json
import uuid
from fastapi import APIRouter, HTTPException, Depends, Header, status
from typing import Dict, List, Optional
from sqlalchemy.orm import Session

from ..models import StudentProfile
from ..services.vector_ops import create_zero_vector, VECTOR_MAX, create_style_vector
from ..services.llm import generate_explanation_variants
from ..database import get_db
from ..models.db_models import UserVector, AdminQuestion, User, Category, SessionVector
from ..services.auth_service import decode_token
from pydantic import BaseModel
from sqlalchemy import and_

router = APIRouter(prefix="/api/onboarding", tags=["onboarding"])

# In-memory store for student profiles (session-based, for backward compatibility)
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
    category_id: Optional[int] = None


class PersonalizedVariantResponse(BaseModel):
    """Response with personalized explanation variants."""
    topic: str
    variants: List[Dict[str, str]]  # List of {style, text}


class PersonalizedExplanationResponse(BaseModel):
    """Response with a single personalized explanation."""
    topic: str
    explanation: str
    style: str


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


def load_questionnaire_from_db(db: Session, user: Optional[User] = None) -> List[dict]:
    """Load questionnaire from database (user custom or admin defaults)."""
    if user:
        # Check if user has custom questions
        from ..models.db_models import UserQuestion
        user_questions = db.query(UserQuestion).filter(
            UserQuestion.user_id == user.id
        ).order_by(UserQuestion.order).all()

        if user_questions:
            return [q.question_data for q in user_questions]

    # Fall back to admin questions
    admin_questions = db.query(AdminQuestion).order_by(AdminQuestion.order).all()
    if admin_questions:
        return [q.question_data for q in admin_questions]

    # If no questions in DB, try to load from JSON (for migration)
    try:
        with open("app/data/questionnaire.json", "r") as f:
            data = json.load(f)
            return data.get("questions", [])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load questionnaire: {str(e)}")


@router.get("/questions", response_model=QuestionnaireResponse)
async def get_questionnaire(
    category_id: Optional[int] = None,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """
    Get questionnaire questions for onboarding.

    Query parameters:
    - category_id: If provided, returns category-specific questions.
                   If None, returns general/initial questions (no category).

    For authenticated users, returns custom questions if configured, otherwise admin defaults.
    """
    if category_id:
        # Get category-specific questions from AdminQuestion
        admin_questions = db.query(AdminQuestion).filter(
            AdminQuestion.category_id == category_id
        ).order_by(AdminQuestion.order).all()
        questions = [q.question_data for q in admin_questions]
    else:
        # Get general questions (no category)
        admin_questions = db.query(AdminQuestion).filter(
            AdminQuestion.category_id.is_(None)
        ).order_by(AdminQuestion.order).all()
        questions = [q.question_data for q in admin_questions]

    return QuestionnaireResponse(questions=questions)


@router.get("/profile", response_model=StudentProfile)
async def get_student_profile(
    session_id: Optional[str] = None,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db),
) -> StudentProfile:
    """
    Get the student's learner profile vector.

    For authenticated users, retrieves from database.
    For session-based users, uses session_id parameter.
    Returns the 8D vector for displaying on the profile chart.
    """
    if current_user:
        user_vector = db.query(UserVector).filter(UserVector.user_id == current_user.id).first()
        if not user_vector:
            raise HTTPException(
                status_code=404,
                detail="Student profile not found. Complete onboarding first.",
            )
        return StudentProfile(user_id=current_user.id, vector=user_vector.vector)

    # Session-based fallback
    if not session_id:
        raise HTTPException(
            status_code=400,
            detail="Either authorization header or session_id parameter required",
        )

    vector = get_student_vector(session_id)
    if vector is None:
        raise HTTPException(
            status_code=404,
            detail="Student profile not found. Complete onboarding first.",
        )

    return StudentProfile(session_id=session_id, vector=vector)


@router.get("/profile/{session_id}", response_model=StudentProfile)
async def get_student_profile_by_session(session_id: str, db: Session = Depends(get_db)) -> StudentProfile:
    """
    Get the student's learner profile vector by session ID (legacy endpoint).

    Deprecated: use GET /profile with session_id query parameter instead.
    """
    vector = get_student_vector(session_id, db)
    if vector is None:
        raise HTTPException(
            status_code=404,
            detail="Student profile not found. Complete onboarding first.",
        )

    return StudentProfile(session_id=session_id, vector=vector)


@router.post("/submit", response_model=StudentProfile)
async def submit_answers(
    request: OnboardingAnswers,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db),
) -> StudentProfile:
    """
    Submit questionnaire answers and create/update student profile.

    Processes user answers to generate 8D learner vector.
    If selected_style is provided, further refines the vector based on style preference.

    Supports both authenticated users (saves to DB) and session-based profiles (in-memory).
    """
    # Load questionnaire for validation
    questions = load_questionnaire_from_db(db, current_user)
    questions_by_id = {q["id"]: q for q in questions}

    # If user is authenticated, use user_id; otherwise use session_id
    if current_user:
        # Check if user has existing vector
        user_vector = db.query(UserVector).filter(UserVector.user_id == current_user.id).first()
        if user_vector:
            vector = user_vector.vector.copy() if isinstance(user_vector.vector, list) else list(user_vector.vector.values())
        else:
            vector = create_zero_vector()
    else:
        # Session-based approach
        session_id = request.session_id or str(uuid.uuid4())
        existing_vector = student_profiles.get(session_id)
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
    if current_user:
        # Save to database
        user_vector_obj = db.query(UserVector).filter(UserVector.user_id == current_user.id).first()
        if user_vector_obj:
            user_vector_obj.vector = vector
        else:
            user_vector_obj = UserVector(user_id=current_user.id, vector=vector)
            db.add(user_vector_obj)
        db.commit()
        return StudentProfile(user_id=current_user.id, vector=vector)
    else:
        # Save to database (session-based)
        session_vector_obj = db.query(SessionVector).filter(SessionVector.session_id == session_id).first()
        if session_vector_obj:
            session_vector_obj.vector = vector
        else:
            session_vector_obj = SessionVector(session_id=session_id, vector=vector)
            db.add(session_vector_obj)
        db.commit()
        # Also save to memory for backward compatibility
        student_profiles[session_id] = vector
        return StudentProfile(session_id=session_id, vector=vector)


@router.post("/generate-personalized", response_model=PersonalizedVariantResponse)
async def generate_personalized_variants(
    request: PersonalizedVariantRequest,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db),
) -> PersonalizedVariantResponse:
    """
    Generate 4 personalized explanation variants based on user's profile vector and topic.

    The LLM generates variants tailored to the user's learning style preferences.
    Supports both authenticated users and session-based profiles.
    """
    student_vector = None

    # Try to get authenticated user vector first
    if current_user:
        user_vector = db.query(UserVector).filter(UserVector.user_id == current_user.id).first()
        if user_vector:
            student_vector = user_vector.vector

    # Fall back to session-based vector
    if not student_vector:
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


@router.post("/generate-explanation", response_model=PersonalizedExplanationResponse)
async def generate_personalized_explanation(
    request: PersonalizedVariantRequest,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db),
) -> PersonalizedExplanationResponse:
    """
    Generate a single personalized explanation based on user's profile vector and topic.

    This endpoint generates ONE explanation tailored to the user's learning style,
    instead of 4 variants. Used after category selection in new onboarding flow.
    """
    student_vector = None

    # Try to get authenticated user vector first
    if current_user:
        user_vector = db.query(UserVector).filter(UserVector.user_id == current_user.id).first()
        if user_vector:
            student_vector = user_vector.vector

    # Fall back to session-based vector
    if not student_vector:
        student_vector = student_profiles.get(request.session_id)

    if not student_vector:
        raise HTTPException(
            status_code=404,
            detail="Student profile not found. Complete questionnaire first.",
        )

    try:
        from ..services.vector_ops import cosine_similarity

        # Generate variants (will pick the best one based on student vector)
        variants = generate_explanation_variants(request.topic, student_vector)

        # Pick the best matching style based on cosine similarity with student vector
        best_style = None
        best_score = -1

        for style in variants.keys():
            # Create a vector for this style
            style_vector = create_style_vector(style)
            # Calculate similarity between student vector and style vector
            similarity = cosine_similarity(student_vector, style_vector)

            if similarity > best_score:
                best_score = similarity
                best_style = style

        # Fallback if no best style found
        if best_style is None:
            best_style = list(variants.keys())[0]

        best_explanation = variants[best_style]

        return PersonalizedExplanationResponse(
            topic=request.topic,
            explanation=best_explanation,
            style=best_style,
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error generating explanation: {str(e)}",
        )


def get_student_vector(session_id: str, db: Session = None) -> list:
    """Retrieve student vector from database or memory (fallback)."""
    # Try database first
    if db:
        session_vector = db.query(SessionVector).filter(SessionVector.session_id == session_id).first()
        if session_vector:
            vector = session_vector.vector
            if isinstance(vector, dict):
                return list(vector.values()) if vector else None
            return vector

    # Fall back to memory (for backward compatibility)
    if session_id not in student_profiles:
        return None
    return student_profiles[session_id]


def update_student_vector(session_id: str, new_vector: list, db: Session = None) -> None:
    """Update student vector in database and memory (fallback)."""
    # Update in database
    if db:
        session_vector = db.query(SessionVector).filter(SessionVector.session_id == session_id).first()
        if session_vector:
            session_vector.vector = new_vector
            db.commit()

    # Also update memory for backward compatibility
    student_profiles[session_id] = new_vector


@router.post("/reset-profile")
async def reset_profile(
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """Reset user's profile (delete their vector)."""
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    # Delete user's vector
    db.query(UserVector).filter(UserVector.user_id == current_user.id).delete()
    db.commit()

    return {"status": "profile reset"}
