"""Student profile model."""
from pydantic import BaseModel
from typing import List


class StudentProfile(BaseModel):
    """Student profile with 8-dimensional vector."""

    session_id: str
    vector: List[float]  # 8 dimensions: [sports, systems, visual, narrative, analogy, step_by_step, academic, simple]

    class Config:
        json_schema_extra = {
            "example": {
                "session_id": "abc123",
                "vector": [0.6, 0.5, 0.5, 0.7, 0.6, 0.5, 0.4, 0.6]
            }
        }


class OnboardingRequest(BaseModel):
    """User's topic for onboarding explanation generation."""

    topic: str

    class Config:
        json_schema_extra = {
            "example": {
                "topic": "Why does a car accelerate when I press the gas pedal?"
            }
        }


class StyleSelection(BaseModel):
    """User's selected style from onboarding variants."""

    session_id: str
    topic: str
    selected_style: str  # "sports", "step_by_step", "narrative", or "technical"

    class Config:
        json_schema_extra = {
            "example": {
                "session_id": "abc123",
                "topic": "Why does a car accelerate?",
                "selected_style": "sports"
            }
        }


class RatingRequest(BaseModel):
    """User's rating for an explanation."""

    session_id: str
    concept: str
    explanation_id: int
    rating: int  # 1-5

    class Config:
        json_schema_extra = {
            "example": {
                "session_id": "abc123",
                "concept": "acceleration",
                "explanation_id": 0,
                "rating": 4
            }
        }
