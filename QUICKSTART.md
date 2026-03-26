# Lexicon MVP - Quick Start

Get the project running in 5 minutes.

## Prerequisites

- **Python 3.10+** — Check: `python --version`
- **Node.js 18+** — Check: `node --version`
- **LiteLLM API Key** — Get from your LiteLLM account (for onboarding explanation generation)
- **Virtual environment** — Already at `.venv/` (Python 3.10)

## 1. Start Backend (Terminal 1)

```bash
# Navigate to backend
cd backend

# Install dependencies
pip install -r requirements.txt

# Configure API key
cp .env.example .env
# Edit .env and add your LITELLM_API_KEY

# Run FastAPI server
uvicorn app.main:app --reload
```

✓ Backend running at: **http://localhost:8000**
✓ API docs: **http://localhost:8000/docs**

## 2. Start Frontend (Terminal 2)

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Run Next.js dev server
npm run dev
```

✓ Frontend running at: **http://localhost:3000**

## 3. Open App

1. Go to **http://localhost:3000** in your browser
2. Click **"Start Learning"**
3. Type a question (e.g., "Why does a car accelerate?")
4. Select your preferred explanation style
5. Choose a concept (acceleration, energy, probability)
6. Rate the explanation (1-5 stars)
7. See your vector update!

## What's Happening

**User Flow:**
1. User types a topic → Backend calls LiteLLM → Generates 4 style variants
2. User selects a style → Creates 12D learner vector
3. User picks a concept → Backend finds best-matching explanation via cosine similarity
4. User rates explanation → Learner vector updates based on feedback
5. Next explanation is even better matched!

## Key Files

**Backend:**
- `backend/app/main.py` — FastAPI application
- `backend/app/services/vector_ops.py` — Vector mathematics (cosine similarity, normalization)
- `backend/app/data/explanations.json` — 15 pre-written explanations
- `backend/app/routers/` — API endpoints

**Frontend:**
- `frontend/app/page.tsx` — Home / concept selector
- `frontend/app/onboarding/page.tsx` — Topic input + style selection
- `frontend/app/learn/[concept]/page.tsx` — Explanation + rating
- `frontend/lib/api.ts` — API client

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/onboarding/generate` | POST | Generate 4 style variants |
| `/api/onboarding/select` | POST | Save learner profile |
| `/api/concepts` | GET | List concepts |
| `/api/explain` | POST | Get best explanation |
| `/api/feedback` | POST | Submit rating + update vector |
| `/api/health` | GET | Health check |

## 12D Vector Space

Each learner & explanation has a 12D vector:

```
[sports, science, music, systems, narrative, analogy,
 step_by_step, visual, mathematical,
 complexity_low, complexity_med, complexity_high]
```

**Style → Vector Mapping:**
- **Sports**: emphasizes sports & analogy & simple language
- **Step-by-step**: emphasizes sequential & systems & moderate complexity
- **Narrative**: emphasizes story & analogy & simple language
- **Technical**: emphasizes science & math & advanced language

## 3 Concepts, 5 Styles = 15 Explanations

- **Acceleration** × 5 styles
- **Energy** × 5 styles
- **Probability** × 5 styles

All stored in `backend/app/data/explanations.json` with semantic vectors.

## Troubleshooting

**Backend won't start?**
- Make sure Python 3.10+: `python --version`
- Check venv: `source .venv/bin/activate`
- Try: `pip install --upgrade -r requirements.txt`
- Check LiteLLM key in `.env`

**Frontend won't load?**
- Make sure Node.js 18+: `node --version`
- Try: `npm install` again
- Check API URL in `frontend/.env.local` (should be http://localhost:8000)
- Check backend is running

**CORS errors?**
- Backend CORS is configured for localhost:3000
- If using different ports, update `backend/app/main.py`

**LLM Generation Fails?**
- Check your LITELLM_API_KEY in `.env`
- Check LITELLM_BASE_URL matches your setup
- Check your API key has permissions

## Next Steps

1. **Test the complete flow** — onboarding → concept → explanation → rating
2. **Check API docs** — Go to http://localhost:8000/docs
3. **Inspect vectors** — Open browser DevTools to see localStorage session ID
4. **Add new concepts** — Edit `backend/app/data/explanations.json`
5. **Customize styles** — Edit `backend/app/services/vector_ops.py`

## Full Documentation

See `README.md` for:
- Complete API reference
- Vector space explanation
- Tech stack details
- Deployment instructions
- Development guide

See `CLAUDE.md` for:
- Project structure
- Development tips
- Architecture notes

See `.claude/plans/ethereal-sauteeing-bear.md` for:
- Implementation plan
- Design decisions
- Verification steps

---

**Happy learning! 🚀**
