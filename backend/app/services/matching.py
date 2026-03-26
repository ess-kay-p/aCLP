"""Matching engine for finding best explanations."""
from typing import List
from .vector_ops import cosine_similarity


def find_best_explanation(
    student_vector: List[float],
    candidates: List[dict],
) -> dict:
    """
    Find the best-matching explanation for a student.

    Args:
        student_vector: 12-dimensional student profile vector
        candidates: List of explanation dicts with 'id', 'vector', and 'text'

    Returns:
        The best matching explanation dict
    """
    if not candidates:
        return None

    best_explanation = None
    best_score = -1.0

    for candidate in candidates:
        score = cosine_similarity(student_vector, candidate["vector"])
        if score > best_score:
            best_score = score
            best_explanation = candidate

    return best_explanation


def score_explanations(
    student_vector: List[float],
    candidates: List[dict],
) -> List[tuple]:
    """
    Score all candidate explanations.

    Returns:
        List of (explanation, score) tuples, sorted by score descending
    """
    scores = []
    for candidate in candidates:
        score = cosine_similarity(student_vector, candidate["vector"])
        scores.append((candidate, score))

    scores.sort(key=lambda x: x[1], reverse=True)
    return scores
