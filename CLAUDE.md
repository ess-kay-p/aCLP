# CLAUDE.md

Guidance for working with the Lexicon MVP project (https://lexicon-learning.vercel.app/).

## Project Overview

**Lexicon** is a personalized learning platform MVP that matches educational explanations to individual learner styles using vector-based profiling and cosine similarity matching.

**Key Innovation**: Instead of generic explanations, the system learns each student's preferred explanation style (sports analogy, step-by-step, narrative, or technical) and automatically picks the best explanation for them.

## Project Structure

```
lexicon/
├── backend/              # FastAPI + Python 3.10
│   ├── app/
│   │   ├── main.py              # FastAPI app entry
│   │   ├── routers/             # API routes (onboarding, explain, feedback)
│   │   ├── services/            # Vector matching, LLM integration
│   │   ├── models/              # Pydantic models
│   │   └── data/
│   │       └── explanations.json # 15 pre-written explanations
│   └── requirements.txt
│
├── frontend/             # Next.js 14 + TypeScript + Tailwind
│   ├── app/
│   │   ├── page.tsx             # Home / concept selector
│   │   ├── onboarding/page.tsx  # Style selection flow
│   │   └── learn/[concept]/page.tsx # Explanation + rating
│   ├── components/              # Reusable UI components
│   ├── lib/api.ts               # API client
│   └── package.json
│
└── README.md             # Full project documentation
```

## Setup

### Backend

```bash
cd backend
pip install -r requirements.txt

# Configure LiteLLM API key
cp .env.example .env
# Edit .env with your API key

# Run
uvicorn app.main:app --reload
# API: http://localhost:8000
```

### Frontend

```bash
cd frontend
npm install

# Optional: configure API URL
cp .env.example .env.local
# Update NEXT_PUBLIC_API_URL if backend is not at localhost:8000

# Run
npm run dev
# App: http://localhost:3000
```

## Development

### Vector Space (12 dimensions)

Each learner and explanation has a 12D vector:
- sports, science, music, systems, narrative, analogy
- step_by_step, visual, mathematical
- complexity_low, complexity_med, complexity_high

Stored in `backend/app/services/vector_ops.py` as `DIMENSIONS`.

### Explanations Data

All 15 pre-written explanations in `backend/app/data/explanations.json`:
- 3 concepts: acceleration, energy, probability
- 5 styles each: sports, step_by_step, narrative, technical, visual
- Each tagged with semantic vector

To add more explanations:
1. Add entry to `explanations.json` with concept, style, text, vector
2. Explanations auto-load — no code changes needed

### API Endpoints

- **POST** `/api/onboarding/generate` — Generate 4 variants for a topic
- **POST** `/api/onboarding/select` — Save learner profile from selected style
- **GET** `/api/concepts` — List available concepts
- **POST** `/api/explain` — Get best-matched explanation
- **POST** `/api/feedback` — Rate explanation, update learner vector
- **GET** `/api/health` — Health check

See API docs at `http://localhost:8000/docs` (Swagger).

### Key Components

**Backend Services**:
- `services/vector_ops.py` — Vector math (normalize, cosine similarity, update)
- `services/matching.py` — Find best explanation via cosine similarity
- `services/llm.py` — LiteLLM integration for generating style variants

**Frontend Components**:
- `TopicInput.tsx` — User enters topic for learning
- `ExplanationVariants.tsx` — Shows 4 style variants side-by-side
- `ExplanationCard.tsx` — Displays best-matched explanation
- `RatingWidget.tsx` — 1-5 star rating interface

## Matching Algorithm

```
Best explanation = argmax(cosine_similarity(learner_vector, explanation_vector))

Vector update (when user rates):
S_{t+1} = S_t + α * (r_t - r̄) * Ê_t
  where α=0.1, r̄=3.0, Ê_t = normalized explanation vector
```

## Tech Stack

- **Backend**: FastAPI 0.104.1, Python 3.10, NumPy, LiteLLM
- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, Axios
- **Storage**: JSON file (MVP), in-memory session vectors

## Development Tips

### Python Environment

- Virtual environment: `.venv/` (Python 3.10)
- Use PyCharm's built-in run/debug for backend
- FastAPI docs: http://localhost:8000/docs

### Frontend Development

- Next.js dev mode with hot reload: `npm run dev`
- Build: `npm run build`
- Tailwind configured for app/** and components/**
- Session ID persisted in localStorage

### Adding Features

- **New concept**: Add 5 explanations to explanations.json
- **New explanation style**: Update DIMENSIONS, style_mapping in vector_ops.py
- **Backend route**: Add router in routers/, include in main.py
- **Frontend page**: Add .tsx file in app/ directory

## IDE

Project is configured for PyCharm (`.idea/` directory). Use PyCharm's built-in tools for running backend and debugging.

## References

- Full documentation: `README.md`
- Implementation plan: `.claude/plans/ethereal-sauteeing-bear.md`
- Original concept: https://lexicon-learning.vercel.app/
