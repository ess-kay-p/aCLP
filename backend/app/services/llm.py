"""LiteLLM integration for generating explanations."""
import os
import json
import litellm
from typing import Dict, Optional, List

MODEL = os.getenv("LITELLM_MODEL", "openai/gpt-3.5-turbo")
IMAGE_MODEL = os.getenv("IMAGE_MODEL", "dall-e-3")

def _llm_kwargs() -> dict:
    """Return api_key / api_base kwargs to pass directly into every litellm call."""
    kwargs = {}
    api_key = os.getenv("LITELLM_API_KEY")
    api_base = os.getenv("LITELLM_BASE_URL")
    if api_key:
        kwargs["api_key"] = api_key
    if api_base:
        kwargs["api_base"] = api_base
    return kwargs


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
    Generate 5 explanation variants for a topic using LiteLLM.

    Returns:
        Dict with keys: "sports", "step_by_step", "narrative", "technical", "visual"
    """
    learning_guidance = _get_learning_style_guidance(student_vector)

    profiling_text = ""
    if profiling_context:
        lines = "\n".join(f"- {q}: {a}" for q, a in profiling_context.items())
        profiling_text = f"\nStudent profile (from their own words):\n{lines}\n"

    prompt_base = f"""Given the topic or question: "{topic}"

Generate 5 explanations of this concept, each in a DIFFERENT style:

1. Sports analogy — Explain using a sports/game metaphor
2. Step-by-step — Provide a clear, numbered breakdown of the concept
3. Narrative — Explain through a short story or real-world scenario
4. Technical — Provide a precise, formal explanation with terminology
5. Visual — Use rich visual language with labeled sections. Insert [DIAGRAM: part1, part2, part3] on its own line where a textbook diagram belongs, listing 3-6 specific labeled parts (e.g. [DIAGRAM: nucleus, mitochondria, cell wall]). Continue explanation after it.

Return ONLY a JSON object with these exact keys: {{"sports": "...", "step_by_step": "...", "narrative": "...", "technical": "...", "visual": "..."}}
Do not include any other text outside the JSON object."""

    if learning_guidance or profiling_text:
        context_block = ""
        if learning_guidance:
            context_block += f"Student learning preferences:\n{learning_guidance}\n"
        if profiling_text:
            context_block += profiling_text
        prompt = f"""{context_block}
{prompt_base}

Tailor explanations to the student's preferences where applicable."""
    else:
        prompt = prompt_base

    try:
        response = litellm.completion(
            model=MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=1,
            **_llm_kwargs(),
        )

        content = response.choices[0].message.content

        # Strip markdown code fences if the model wrapped the JSON
        cleaned = content.strip()
        if cleaned.startswith("```"):
            cleaned = "\n".join(cleaned.split("\n")[1:])
            if cleaned.endswith("```"):
                cleaned = cleaned[: cleaned.rfind("```")]

        variants = json.loads(cleaned)

        required_keys = {"sports", "step_by_step", "narrative", "technical", "visual"}
        if not required_keys.issubset(variants.keys()):
            raise ValueError(f"Missing required keys in LLM response: {variants.keys()}")

        return variants

    except json.JSONDecodeError as e:
        raise ValueError(f"LLM response was not valid JSON: {e}")
    except Exception as e:
        raise RuntimeError(f"LiteLLM API error: {e}")


def generate_personalization_summary(
    profile_data: dict,
    vector: Optional[List[float]] = None,
) -> str:
    """
    Generate a rich, detailed personalization summary (~200+ words) from all profiling context.
    """
    if not profile_data and not vector:
        return "Complete the profiling questions to see your personalized learning summary."

    # Build full profiling Q&A block
    qa_lines = []
    if profile_data:
        for q, a in profile_data.items():
            qa_lines.append(f"Q: {q}\nA: {a}")

    # Build vector breakdown
    vector_section = ""
    if vector and len(vector) >= 8:
        from ..services.vector_ops import DIMENSIONS
        scored = sorted(
            [(DIMENSIONS[i], round(v, 2)) for i, v in enumerate(vector)],
            key=lambda x: x[1], reverse=True
        )
        all_dims = ", ".join(f"{name} {int(val*100)}%" for name, val in scored)
        vector_section = f"\nLearning dimension scores (high = strong preference):\n{all_dims}"

    qa_block = "\n\n".join(qa_lines)
    context_block = qa_block + vector_section

    prompt = (
        "You are a learning analyst. Based on the student's full profiling answers and "
        "learning dimension scores below, generate a structured personalization profile.\n\n"
        "Return ONLY a valid JSON object with exactly these 5 keys. Each value should be "
        "2-4 rich, specific sentences written in second person ('You...'). "
        "Reference their actual answers where relevant. Be warm, insightful, and concrete.\n\n"
        "Keys:\n"
        "- learning_style: Their dominant learning style, preferred explanation format and tone\n"
        "- what_works: The contexts, analogies, and examples that resonate most with them\n"
        "- complexity: Their comfort level with technical depth, jargon, and abstraction\n"
        "- avoid: Things that don't work well — formats, styles, or approaches to skip\n"
        "- unique_trait: One standout characteristic that makes their learning profile distinctive\n\n"
        "Return ONLY the JSON object, no markdown, no extra text.\n\n"
        f"Student profiling data:\n\n{context_block}"
    )

    try:
        response = litellm.completion(
            model=MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=1,
            max_tokens=600,
            **_llm_kwargs(),
        )
        content = response.choices[0].message.content.strip()
        # Strip markdown fences if present
        if content.startswith("```"):
            lines = content.split("\n")
            content = "\n".join(lines[1:])
            if content.endswith("```"):
                content = content[: content.rfind("```")]
        return content.strip()
    except Exception as e:
        import logging as _log
        _log.getLogger(__name__).warning("Personalization summary failed: %s", e)
        return "Your personalization profile is ready. Ask a question to see it in action."


STYLE_DESCRIPTIONS = {
    "sports": "Use a sports/game metaphor and analogies",
    "step_by_step": "Provide a clear, numbered, sequential breakdown",
    "narrative": "Explain through a short story or real-world scenario",
    "technical": "Provide a precise, formal explanation with proper terminology",
    "visual": (
        "Explain using rich visual language with clearly labeled sections and headers. "
        "At the most important point in the explanation (where a diagram would help most), "
        "insert a diagram token on its own line in this exact format: "
        "[DIAGRAM: part1, part2, part3, part4] "
        "— listing 3-6 specific components, parts, or labels that MUST appear in the diagram "
        "(e.g. [DIAGRAM: chlorophyll, sunlight, CO2, glucose, oxygen]). "
        "Continue the explanation after the token. "
        "Do not place it at the very start or very end."
    ),
}


def generate_single_explanation(
    topic: str,
    style: str,
    student_vector: Optional[List[float]] = None,
    profiling_context: Optional[dict] = None,
) -> str:
    """Generate one explanation for a topic in the specified style."""
    learning_guidance = _get_learning_style_guidance(student_vector)

    profiling_text = ""
    if profiling_context:
        lines = "\n".join(f"- {q}: {a}" for q, a in profiling_context.items())
        profiling_text = f"Student profile (from their own words):\n{lines}\n\n"

    style_instruction = STYLE_DESCRIPTIONS.get(style, "Explain clearly and concisely")

    context_block = ""
    if learning_guidance:
        context_block += f"Student learning preferences:\n{learning_guidance}\n\n"
    if profiling_text:
        context_block += profiling_text

    prompt = (
        f"{context_block}"
        f'Explain the following topic or question: "{topic}"\n\n'
        f"Style: {style_instruction}\n\n"
        "Use markdown formatting (bold, lists, headers where helpful). "
        "Be thorough but focused. Do not add meta-commentary."
    )

    response = litellm.completion(
        model=MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=1,
        **_llm_kwargs(),
    )
    return response.choices[0].message.content.strip()


def generate_diagram_svg(topic: str, labels: Optional[List[str]] = None) -> Optional[str]:
    """
    Ask the LLM to generate a clean, labeled SVG diagram for the topic.
    Returns raw SVG string or None on failure.
    """
    label_str = ", ".join(labels) if labels else "key components"
    prompt = (
        f"Generate a clean, readable educational SVG diagram for: '{topic}'.\n"
        f"Label these specific parts: {label_str}.\n\n"
        "STRICT layout rules — follow all of them:\n"
        "1. Output ONLY raw SVG, no markdown fences, no explanation text\n"
        "2. viewBox='0 0 700 450', width='700', height='450'\n"
        "3. White background: <rect width='700' height='450' fill='white'/>\n"
        "4. Place diagram shapes in the CENTER of the canvas with 60px padding on all sides\n"
        "5. Place ALL text labels OUTSIDE the shapes they describe — either above, below, or to the side, never on top of lines or arrows\n"
        "6. Arrows must be SHORT (under 80px), start at the edge of a shape, and end at a label — never cross another label or shape\n"
        "7. Leave at least 30px gap between any two text labels so they never overlap\n"
        "8. Use font-size='13' font-family='Arial, sans-serif' for all labels\n"
        "9. Use only 2-3 fill colors (soft pastels like #d0e8ff, #ffe8cc, #d0ffd8) plus black strokes\n"
        "10. Define one arrowhead marker at the top: <defs><marker id='arrow' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path d='M0,0 L0,6 L8,3 z' fill='#555'/></marker></defs>\n"
        "11. All arrow lines use marker-end='url(#arrow)' stroke='#555' stroke-width='1.5'\n"
        "12. No <script>, no event handlers, no foreignObject\n"
        "13. Think carefully about layout before generating — shapes and labels must be spread out so nothing overlaps\n"
    )

    try:
        response = litellm.completion(
            model=MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=1,
            **_llm_kwargs(),
        )
        content = response.choices[0].message.content.strip()
        # Strip markdown code fences if present
        if content.startswith("```"):
            lines = content.split("\n")
            content = "\n".join(lines[1:])
            if content.endswith("```"):
                content = content[: content.rfind("```")]
        content = content.strip()
        if not content.startswith("<svg"):
            return None
        return content
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning("SVG diagram generation failed: %s", e)
        return None


def generate_visual_image(topic: str, labels: Optional[List[str]] = None) -> Optional[str]:
    """
    Generate a labeled textbook diagram for a topic using an image model.

    Returns the image URL or data URI, or None if generation fails.
    """
    label_instruction = ""
    if labels:
        label_instruction = (
            f"The diagram MUST clearly label these specific parts with arrows and text callouts: "
            f"{', '.join(labels)}. "
        )

    try:
        response = litellm.image_generation(
            model=IMAGE_MODEL,
            prompt=(
                f"Simple educational textbook diagram for: {topic}. "
                f"{label_instruction}"
                "Clean line drawing with labeled arrows pointing to each part. "
                "The diagram must be perfectly upright, horizontal, and centered — no rotation, no tilt, no perspective. "
                "All labels and diagram elements must be fully visible within the frame with generous white margins on all sides. "
                "Minimal flat color, white background. "
                "Style: labeled school textbook illustration, flat 2D, top-down or side-view only."
            ),
            n=1,
            size="1024x1024",
            **_llm_kwargs(),
        )
        item = response.data[0]
        # Some providers (Vertex AI / Gemini Imagen) return base64 instead of a URL
        if getattr(item, "url", None):
            return item.url
        if getattr(item, "b64_json", None):
            return f"data:image/png;base64,{item.b64_json}"
        return None
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning("Image generation failed: %s", e)
        return None
