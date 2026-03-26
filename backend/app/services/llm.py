"""LiteLLM integration for generating explanations."""
import os
import json
import litellm
from typing import Dict

# Configure LiteLLM
litellm.api_key = os.getenv("LITELLM_API_KEY", "")
litellm.api_base = os.getenv("LITELLM_BASE_URL", "https://api.openai.com/v1")
# Model format: "provider/model-name" (e.g., "openai/gpt-3.5-turbo")
MODEL = os.getenv("LITELLM_MODEL", "openai/gpt-3.5-turbo")


def generate_explanation_variants(topic: str) -> Dict[str, str]:
    """
    Generate 4 explanation variants for a topic using LiteLLM.

    Args:
        topic: The user's question or topic

    Returns:
        Dict with keys: "sports", "step_by_step", "narrative", "technical"
    """
    prompt = f"""Given the topic or question: "{topic}"

Generate 4 explanations of this concept, each in a DIFFERENT style:

1. Sports analogy — Explain using a sports/game metaphor
2. Step-by-step — Provide a clear, numbered breakdown of the concept
3. Narrative — Explain through a short story or real-world scenario
4. Technical — Provide a precise, formal explanation with terminology

Return ONLY a JSON object with these exact keys: {{"sports": "...", "step_by_step": "...", "narrative": "...", "technical": "..."}}
Do not include any other text or markdown formatting."""

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
