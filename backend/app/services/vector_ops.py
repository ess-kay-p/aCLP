"""Vector operations for student profiles and explanations."""
import numpy as np
from typing import List


# Vector dimension labels
DIMENSIONS = [
    "sports",           # 0
    "science",          # 1
    "music",            # 2
    "systems",          # 3
    "narrative",        # 4
    "analogy",          # 5
    "step_by_step",     # 6
    "visual",           # 7
    "mathematical",     # 8
    "complexity_low",   # 9
    "complexity_med",   # 10
    "complexity_high",  # 11
]

VECTOR_DIM = len(DIMENSIONS)


def create_zero_vector() -> List[float]:
    """Create a zero vector of correct dimension."""
    return [0.0] * VECTOR_DIM


def create_style_vector(style: str) -> List[float]:
    """Create a vector from a selected style."""
    vector = create_zero_vector()

    # Dimension index mapping
    dim_map = {dim: i for i, dim in enumerate(DIMENSIONS)}

    # Style -> dimensions mapping
    style_mapping = {
        "sports": {
            dim_map["sports"]: 1.0,
            dim_map["analogy"]: 1.0,
            dim_map["complexity_low"]: 0.8,
        },
        "step_by_step": {
            dim_map["step_by_step"]: 1.0,
            dim_map["systems"]: 0.7,
            dim_map["complexity_med"]: 0.8,
        },
        "narrative": {
            dim_map["narrative"]: 1.0,
            dim_map["analogy"]: 0.7,
            dim_map["complexity_low"]: 0.8,
        },
        "technical": {
            dim_map["science"]: 1.0,
            dim_map["mathematical"]: 1.0,
            dim_map["complexity_high"]: 1.0,
        },
    }

    if style in style_mapping:
        for dim_idx, value in style_mapping[style].items():
            vector[dim_idx] = value

    return normalize_vector(vector)


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

    return normalize_vector(updated.tolist())
