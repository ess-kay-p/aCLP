"""Vector operations for student profiles and explanations."""
import numpy as np
from typing import List


# Vector dimension labels (8D system)
DIMENSIONS = [
    "sports",           # 0 - Sports/game analogies
    "systems",          # 1 - Systems thinking
    "visual",           # 2 - Visual/descriptive
    "narrative",        # 3 - Story-based
    "analogy",          # 4 - Metaphor/analogy
    "step_by_step",     # 5 - Sequential instructions
    "academic",         # 6 - Formal/technical language
    "simple",           # 7 - Simple/everyday language
]

VECTOR_DIM = len(DIMENSIONS)
VECTOR_INIT = 0.5  # Initial vector values
VECTOR_MAX = 1.0   # Maximum vector value


def create_zero_vector() -> List[float]:
    """Create an initialized vector with baseline values (0.5 per dimension)."""
    return [VECTOR_INIT] * VECTOR_DIM


def create_vector_from_answers(answers: dict) -> List[float]:
    """
    Create a learner vector from questionnaire answers.

    Args:
        answers: Dict mapping question_id -> answer_value (0.0 to 1.0)

    Returns:
        8D vector with values bounded to [0.0, 1.0]
    """
    vector = create_zero_vector()

    # Map question answers to vector dimensions
    # This depends on the questionnaire structure
    # For now, we'll update this once questionnaire is designed

    # Clamp values to [0, 1.0]
    vector = [min(max(v, 0.0), VECTOR_MAX) for v in vector]

    return vector


def create_style_vector(style: str) -> List[float]:
    """
    Create a vector from a selected style (legacy, for backward compatibility).
    Maps old 5-style system to new 8D space.
    """
    vector = create_zero_vector()

    # Style -> dimensions adjustment (added to baseline 0.5)
    style_mapping = {
        "sports": {
            "sports": 0.3,      # Boost sports
            "analogy": 0.2,
            "simple": 0.1,
            "academic": -0.2,
        },
        "step_by_step": {
            "step_by_step": 0.3,
            "systems": 0.2,
            "academic": 0.1,
        },
        "narrative": {
            "narrative": 0.3,
            "analogy": 0.2,
            "simple": 0.1,
            "academic": -0.2,
        },
        "technical": {
            "academic": 0.3,
            "systems": 0.2,
            "simple": -0.3,
        },
        "visual": {
            "visual": 0.3,
            "narrative": 0.1,
            "simple": 0.1,
        },
    }

    if style in style_mapping:
        for dim_name, adjustment in style_mapping[style].items():
            dim_idx = DIMENSIONS.index(dim_name) if dim_name in DIMENSIONS else -1
            if dim_idx >= 0:
                vector[dim_idx] = min(max(vector[dim_idx] + adjustment, 0.0), VECTOR_MAX)

    return vector


def normalize_vector(vector: List[float]) -> List[float]:
    """Normalize vector to unit length."""
    arr = np.array(vector)
    norm = np.linalg.norm(arr)
    if norm == 0:
        return vector
    return (arr / norm).tolist()


def cosine_similarity(v1: List[float], v2: List[float]) -> float:
    """Calculate cosine similarity between two vectors."""
    arr1 = np.array(v1)
    arr2 = np.array(v2)

    dot_product = np.dot(arr1, arr2)
    norm1 = np.linalg.norm(arr1)
    norm2 = np.linalg.norm(arr2)

    if norm1 == 0 or norm2 == 0:
        return 0.0

    return float(dot_product / (norm1 * norm2))


def update_student_vector(
    current_vector: List[float],
    explanation_vector: List[float],
    rating: int,
    learning_rate: float = 0.1,
    baseline_rating: float = 3.0,
) -> List[float]:
    """
    Update student vector based on rating.

    Formula: S_{t+1} = S_t + α * (r_t - r̄) * Ê_t
    where α is learning rate, r_t is rating, r̄ is baseline, Ê_t is normalized explanation vector
    """
    current = np.array(current_vector)
    explanation = np.array(explanation_vector)

    # Calculate rating delta
    rating_delta = rating - baseline_rating

    # Update: add (learning_rate * delta * explanation) to current vector
    updated = current + learning_rate * rating_delta * explanation

    # Clamp to [0, 1.0]
    updated = np.clip(updated, 0.0, VECTOR_MAX)

    return updated.tolist()
