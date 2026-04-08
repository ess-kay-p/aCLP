"""LiteLLM integration for generating explanations."""
import os
import json
import litellm
from typing import Dict, Optional, List

# Configure LiteLLM
litellm.api_key = os.getenv("LITELLM_API_KEY", "")
litellm.api_base = os.getenv("LITELLM_BASE_URL", "https://api.openai.com/v1")
# Model format: "provider/model-name" (e.g., "openai/gpt-3.5-turbo")
MODEL = os.getenv("LITELLM_MODEL", "openai/gpt-3.5-turbo")


def _get_learning_style_guidance(student_vector: Optional[List[float]]) -> str:
    """
    Generate guidance text based on student's learning preferences.

    Args:
        student_vector: 8D vector with dimensions:
            [sports, systems, visual, narrative, analogy, step_by_step, academic, simple]

    Returns:
        Guidance string for the LLM about the student's preferences
    """
    if not student_vector or len(student_vector) < 8:
        return ""

    # Map vector dimensions to preference descriptions
    from ..services.vector_ops import DIMENSIONS

    guidance_parts = []

    # Check which dimensions are strong (> 0.6)
    strong_prefs = [DIMENSIONS[i] for i, val in enumerate(student_vector) if val > 0.6]

    if "sports" in strong_prefs:
        guidance_parts.append("This learner enjoys sports analogies and game-based metaphors")
    if "narrative" in strong_prefs:
        guidance_parts.append("This learner prefers story-based explanations and real-world scenarios")
    if "step_by_step" in strong_prefs:
        guidance_parts.append("This learner prefers clear, numbered, sequential instructions")
    if "visual" in strong_prefs:
        guidance_parts.append("This learner prefers descriptive, visual explanations")
    if "analogy" in strong_prefs:
        guidance_parts.append("This learner enjoys metaphors and analogies")
    if "systems" in strong_prefs:
        guidance_parts.append("This learner likes understanding how things connect and work together")
    if "academic" in strong_prefs:
        guidance_parts.append("This learner prefers technical, formal language and precise definitions")
    if "simple" in strong_prefs:
        guidance_parts.append("This learner prefers simple, everyday language over complex terminology")

    if guidance_parts:
        return "\n".join([f"- {part}" for part in guidance_parts])
    return ""


def generate_explanation_variants(
    topic: str,
    student_vector: Optional[List[float]] = None,
    profiling_context: Optional[dict] = None,
) -> Dict[str, str]:
    """
    Generate 4 explanation variants for a topic using LiteLLM.

    Args:
        topic: The user's question or topic
        student_vector: Optional 8D vector describing learner preferences
        profiling_context: Optional dict of {question_text: answer_text} from profiling answers

    Returns:
        Dict with keys: "sports", "step_by_step", "narrative", "technical"
    """
    # Get personalized guidance if vector is provided
    learning_guidance = _get_learning_style_guidance(student_vector)

    profiling_text = ""
    if profiling_context:
        lines = "\n".join(f"- {q}: {a}" for q, a in profiling_context.items())
        profiling_text = f"\nStudent profile (from their own words):\n{lines}\n"

    # Build prompt with optional personalization
    prompt_base = f"""Given the topic or question: "{topic}"

Generate 4 explanations of this concept, each in a DIFFERENT style:

1. Sports analogy — Explain using a sports/game metaphor
2. Step-by-step — Provide a clear, numbered breakdown of the concept
3. Narrative — Explain through a short story or real-world scenario
4. Technical — Provide a precise, formal explanation with terminology

Return ONLY a JSON object with these exact keys: {{"sports": "...", "step_by_step": "...", "narrative": "...", "technical": "..."}}
Do not include any other text or markdown formatting."""

    if learning_guidance or profiling_text:
        context_block = ""
        if learning_guidance:
            context_block += f"Student learning preferences:\n{learning_guidance}\n"
        if profiling_text:
            context_block += profiling_text
        prompt = f"""{context_block}
{prompt_base}

When generating explanations, keep the student's preferences and profile in mind and tailor the explanations accordingly."""
    else:
        prompt = prompt_base

    try:
        response = litellm.completion(
            model=MODEL,
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=1,  # GPT-5 models require temperature=1
        )

        # Extract content
        content = response.choices[0].message.content

        # Parse JSON
        variants = json.loads(content)

        # Ensure all 4 keys exist
        required_keys = {"sports", "step_by_step", "narrative", "technical"}
        if not required_keys.issubset(variants.keys()):
            raise ValueError(f"Missing required keys in LLM response: {variants.keys()}")

        return variants

    except json.JSONDecodeError as e:
        raise ValueError(f"LLM response was not valid JSON: {e}")
    except Exception as e:
        raise RuntimeError(f"LiteLLM API error: {e}")
