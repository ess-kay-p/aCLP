"""
One-time seed script: replaces all categories with Physics, Chemistry, Biology,
and Mathematics, each with 3 generic learning-style questions.

Run from the backend/ directory:
    python seed_science_categories.py
"""
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from app.database import SessionLocal, create_tables
from app.models.db_models import Category, AdminQuestion

CATEGORIES = [
    {"name": "Physics", "description": "Mechanics, energy, waves, electromagnetism, and more"},
    {"name": "Chemistry", "description": "Reactions, elements, bonding, and chemical processes"},
    {"name": "Biology", "description": "Cells, evolution, genetics, ecology, and living systems"},
    {"name": "Mathematics", "description": "Algebra, calculus, statistics, geometry, and proofs"},
]

QUESTIONS = {
    "Physics": [
        {
            "id": 101,
            "question": "When studying physics, I prefer explanations that are:",
            "options": [
                {
                    "text": "Grounded in real-world examples and everyday situations",
                    "dimension_updates": {"analogy": 0.2, "simple": 0.1},
                },
                {
                    "text": "Mathematical and equation-based",
                    "dimension_updates": {"academic": 0.2, "systems": 0.1},
                },
                {
                    "text": "Visual with diagrams and graphs",
                    "dimension_updates": {"visual": 0.2, "systems": 0.1},
                },
                {
                    "text": "Broken into clear, sequential steps",
                    "dimension_updates": {"step_by_step": 0.2, "simple": 0.1},
                },
            ],
        },
        {
            "id": 102,
            "question": "How do you best connect new physics ideas to what you already know?",
            "options": [
                {
                    "text": "Through sports or movement analogies",
                    "dimension_updates": {"sports": 0.2, "analogy": 0.1},
                },
                {
                    "text": "By understanding the underlying theory or system",
                    "dimension_updates": {"systems": 0.2, "academic": 0.1},
                },
                {
                    "text": "Through thought experiments or stories",
                    "dimension_updates": {"narrative": 0.2, "analogy": 0.1},
                },
                {
                    "text": "By seeing how parts relate in a diagram",
                    "dimension_updates": {"visual": 0.2, "systems": 0.1},
                },
            ],
        },
        {
            "id": 103,
            "question": "When a physics concept is hard to grasp, I find it helps to:",
            "options": [
                {
                    "text": "See a fully worked example from start to finish",
                    "dimension_updates": {"step_by_step": 0.2, "simple": 0.1},
                },
                {
                    "text": "Go back to the formula and derive the answer",
                    "dimension_updates": {"academic": 0.2, "systems": 0.1},
                },
                {
                    "text": "Draw a diagram of the situation",
                    "dimension_updates": {"visual": 0.2, "step_by_step": 0.1},
                },
                {
                    "text": "Think of an analogy that simplifies it",
                    "dimension_updates": {"analogy": 0.2, "narrative": 0.1},
                },
            ],
        },
    ],
    "Chemistry": [
        {
            "id": 201,
            "question": "When studying chemistry, I prefer explanations that:",
            "options": [
                {
                    "text": "Use analogies to familiar everyday things",
                    "dimension_updates": {"analogy": 0.2, "simple": 0.1},
                },
                {
                    "text": "Show formal equations and reaction mechanisms",
                    "dimension_updates": {"academic": 0.2, "systems": 0.1},
                },
                {
                    "text": "Include visual models of atoms and molecules",
                    "dimension_updates": {"visual": 0.2, "systems": 0.1},
                },
                {
                    "text": "Walk through the process step by step",
                    "dimension_updates": {"step_by_step": 0.2, "narrative": 0.1},
                },
            ],
        },
        {
            "id": 202,
            "question": "How do you prefer chemistry concepts to be introduced?",
            "options": [
                {
                    "text": "With a real-world material or application I have encountered",
                    "dimension_updates": {"simple": 0.2, "narrative": 0.1},
                },
                {
                    "text": "With precise scientific terminology and definitions",
                    "dimension_updates": {"academic": 0.2, "systems": 0.1},
                },
                {
                    "text": "With the history or story behind the discovery",
                    "dimension_updates": {"narrative": 0.2, "analogy": 0.1},
                },
                {
                    "text": "With a visual diagram before any text",
                    "dimension_updates": {"visual": 0.2, "analogy": 0.1},
                },
            ],
        },
        {
            "id": 203,
            "question": "When learning chemistry, understanding comes easiest when:",
            "options": [
                {
                    "text": "Complex ideas are compared to something I already know",
                    "dimension_updates": {"analogy": 0.2, "simple": 0.1},
                },
                {
                    "text": "I can follow a systematic set of rules",
                    "dimension_updates": {"systems": 0.2, "step_by_step": 0.1},
                },
                {
                    "text": "I can see a detailed structural diagram",
                    "dimension_updates": {"visual": 0.2, "academic": 0.1},
                },
                {
                    "text": "The explanation tells a logical story",
                    "dimension_updates": {"narrative": 0.2, "simple": 0.1},
                },
            ],
        },
    ],
    "Biology": [
        {
            "id": 301,
            "question": "When studying biology, I prefer explanations that:",
            "options": [
                {
                    "text": "Use comparisons to familiar systems like machines or cities",
                    "dimension_updates": {"analogy": 0.2, "simple": 0.1},
                },
                {
                    "text": "Include detailed diagrams and illustrations",
                    "dimension_updates": {"visual": 0.2, "systems": 0.1},
                },
                {
                    "text": "Describe processes as a narrative or story",
                    "dimension_updates": {"narrative": 0.2, "analogy": 0.1},
                },
                {
                    "text": "List each step in a clear, ordered sequence",
                    "dimension_updates": {"step_by_step": 0.2, "academic": 0.1},
                },
            ],
        },
        {
            "id": 302,
            "question": "How do you best make sense of biology concepts?",
            "options": [
                {
                    "text": "By relating them to everyday life or my own body",
                    "dimension_updates": {"simple": 0.2, "analogy": 0.1},
                },
                {
                    "text": "By understanding the formal scientific mechanisms",
                    "dimension_updates": {"academic": 0.2, "systems": 0.1},
                },
                {
                    "text": "By seeing how all parts interact as a whole system",
                    "dimension_updates": {"systems": 0.2, "visual": 0.1},
                },
                {
                    "text": "Through survival or competition analogies",
                    "dimension_updates": {"sports": 0.2, "analogy": 0.1},
                },
            ],
        },
        {
            "id": 303,
            "question": "When learning biology, I find it most helpful when:",
            "options": [
                {
                    "text": "Real examples from nature or the human body are given",
                    "dimension_updates": {"narrative": 0.2, "simple": 0.1},
                },
                {
                    "text": "The explanation builds step by step from simple to complex",
                    "dimension_updates": {"step_by_step": 0.2, "systems": 0.1},
                },
                {
                    "text": "Diagrams clearly show the structure",
                    "dimension_updates": {"visual": 0.2, "academic": 0.1},
                },
                {
                    "text": "Comparisons are made to non-biological things I understand",
                    "dimension_updates": {"analogy": 0.2, "simple": 0.1},
                },
            ],
        },
    ],
    "Mathematics": [
        {
            "id": 401,
            "question": "When studying mathematics, I prefer to:",
            "options": [
                {
                    "text": "See worked examples before learning the theory",
                    "dimension_updates": {"step_by_step": 0.2, "simple": 0.1},
                },
                {
                    "text": "Start with formal definitions and proofs",
                    "dimension_updates": {"academic": 0.2, "systems": 0.1},
                },
                {
                    "text": "Understand the visual or geometric meaning first",
                    "dimension_updates": {"visual": 0.2, "analogy": 0.1},
                },
                {
                    "text": "See a real-world application before the abstraction",
                    "dimension_updates": {"narrative": 0.2, "simple": 0.1},
                },
            ],
        },
        {
            "id": 402,
            "question": "How do you best understand mathematical ideas?",
            "options": [
                {
                    "text": "Through analogies to real-world situations",
                    "dimension_updates": {"analogy": 0.2, "narrative": 0.1},
                },
                {
                    "text": "Through rigorous formal proofs",
                    "dimension_updates": {"academic": 0.2, "systems": 0.1},
                },
                {
                    "text": "Through graphs and visual representations",
                    "dimension_updates": {"visual": 0.2, "systems": 0.1},
                },
                {
                    "text": "By working through practice problems step by step",
                    "dimension_updates": {"step_by_step": 0.2, "academic": 0.1},
                },
            ],
        },
        {
            "id": 403,
            "question": "When a mathematical concept is difficult, I prefer to:",
            "options": [
                {
                    "text": "Find a simpler analogy or comparison",
                    "dimension_updates": {"analogy": 0.2, "simple": 0.1},
                },
                {
                    "text": "Re-read the formal definition carefully",
                    "dimension_updates": {"academic": 0.2, "systems": 0.1},
                },
                {
                    "text": "Draw a diagram or picture of the problem",
                    "dimension_updates": {"visual": 0.2, "step_by_step": 0.1},
                },
                {
                    "text": "Work through many examples until I see the pattern",
                    "dimension_updates": {"step_by_step": 0.2, "narrative": 0.1},
                },
            ],
        },
    ],
}


def seed():
    create_tables()
    db = SessionLocal()
    try:
        # Delete all existing category-linked admin questions
        deleted_q = db.query(AdminQuestion).filter(AdminQuestion.category_id.isnot(None)).delete()
        print(f"Deleted {deleted_q} category questions")

        # Delete all categories
        deleted_c = db.query(Category).delete()
        print(f"Deleted {deleted_c} categories")

        db.commit()

        # Insert new categories and their questions
        for cat_data in CATEGORIES:
            category = Category(
                name=cat_data["name"],
                description=cat_data["description"],
            )
            db.add(category)
            db.flush()  # get category.id

            questions = QUESTIONS[cat_data["name"]]
            for order, q in enumerate(questions):
                admin_q = AdminQuestion(
                    category_id=category.id,
                    order=order,
                    question_data=q,
                )
                db.add(admin_q)

            print(f"  + {cat_data['name']} (id={category.id}) — {len(questions)} questions")

        db.commit()
        print("\nDone.")

    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
