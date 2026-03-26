"""Lexicon MVP - Setup and run instructions"""

def print_setup_instructions():
    """Print setup and run instructions for Lexicon."""
    instructions = """
╔════════════════════════════════════════════════════════════════╗
║                    LEXICON MVP - SETUP GUIDE                  ║
╚════════════════════════════════════════════════════════════════╝

📚 A personalized learning platform matching explanations to your learning style.

─────────────────────────────────────────────────────────────────
STEP 1: BACKEND SETUP
─────────────────────────────────────────────────────────────────

1. Install backend dependencies:
   $ cd backend
   $ pip install -r requirements.txt

2. Configure LiteLLM API key:
   $ cp .env.example .env
   $ # Edit .env with your LiteLLM API key

3. Run the backend server:
   $ uvicorn app.main:app --reload

   ✓ API running at: http://localhost:8000
   ✓ API docs at: http://localhost:8000/docs

─────────────────────────────────────────────────────────────────
STEP 2: FRONTEND SETUP
─────────────────────────────────────────────────────────────────

1. Install frontend dependencies:
   $ cd frontend
   $ npm install

2. (Optional) Configure API URL:
   $ cp .env.example .env.local
   $ # If backend is not at localhost:8000, update NEXT_PUBLIC_API_URL

3. Run the frontend dev server:
   $ npm run dev

   ✓ App running at: http://localhost:3000

─────────────────────────────────────────────────────────────────
STEP 3: USE THE APP
─────────────────────────────────────────────────────────────────

1. Open http://localhost:3000 in your browser
2. Click "Start Learning"
3. Type a question (e.g., "Why does a car accelerate?")
4. Select your preferred explanation style
5. Choose a concept to learn (acceleration, energy, probability)
6. Rate the explanation to personalize your profile
7. Your vector updates based on your ratings!

─────────────────────────────────────────────────────────────────
PROJECT STRUCTURE
─────────────────────────────────────────────────────────────────

backend/
  ├── app/
  │   ├── main.py              ← FastAPI app
  │   ├── routers/             ← API endpoints
  │   ├── services/            ← Vector matching, LLM
  │   ├── models/              ← Pydantic models
  │   └── data/                ← Explanations (15 pre-written)
  └── requirements.txt

frontend/
  ├── app/
  │   ├── page.tsx             ← Home / concept selector
  │   ├── onboarding/page.tsx  ← Style selection
  │   └── learn/[concept]/page.tsx ← Learning + rating
  ├── components/              ← UI components
  ├── lib/api.ts               ← API client
  └── package.json

─────────────────────────────────────────────────────────────────
KEY FEATURES
─────────────────────────────────────────────────────────────────

✨ Dynamic Style Generation
   User types a topic → LiteLLM generates 4 explanation variants

📊 Vector-based Matching
   12-dimensional learner profile matched to explanations via
   cosine similarity

🎓 3 Concepts, 15 Explanations
   Pre-written for: acceleration, energy, probability
   Each in 5 styles: sports, step-by-step, narrative, technical, visual

⭐ Adaptive Feedback
   Ratings update your vector → better matches over time

─────────────────────────────────────────────────────────────────
TROUBLESHOOTING
─────────────────────────────────────────────────────────────────

Backend won't start?
  → Make sure .venv is activated
  → Check Python 3.10+ with: python --version
  → Try: pip install --upgrade -r requirements.txt

Frontend won't load?
  → Check Node.js 18+ with: node --version
  → Try: npm install again
  → Ensure backend is running at localhost:8000

CORS errors?
  → Backend CORS is configured for localhost:3000
  → Check your API_URL in frontend .env.local

─────────────────────────────────────────────────────────────────
DOCUMENTATION
─────────────────────────────────────────────────────────────────

Full README: See ./README.md
API Docs: http://localhost:8000/docs (Swagger UI)
Plan: .claude/plans/ethereal-sauteeing-bear.md

─────────────────────────────────────────────────────────────────
Ready to go! Happy learning! 🚀
    """
    print(instructions)


if __name__ == '__main__':
    print_setup_instructions()

