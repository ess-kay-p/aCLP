"""Explanation models."""
from pydantic import BaseModel
from typing import List, Dict


class Explanation(BaseModel):
    """Single explanation with semantic vector."""

    id: int
    concept: str
    style: str  # "sports", "step_by_step", "narrative", "technical", "visual"
    text: str
    vector: List[float]  # 12 dimensions matching StudentProfile


class ExplanationVariants(BaseModel):
    """4 LLM-generated explanation variants in different styles."""

    topic: str
    variants: Dict[str, str]  # Keys: "sports", "step_by_step", "narrative", "technical"

    class Config:
        json_schema_extra = {
            "example": {
                "topic": "Why does a car accelerate?",
                "variants": {
                    "sports": "Think of acceleration like...",
                    "step_by_step": "Step 1: Engine produces force...",
                    "narrative": "Imagine you're driving a car...",
                    "technical": "Acceleration (a) is defined as the rate of change..."
                }
            }
        }
