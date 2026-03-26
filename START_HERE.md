# 🚀 Lexicon MVP - START HERE

Welcome to Lexicon, a personalized learning platform that matches explanations to your learning style!

## What Is This?

**Lexicon** is an EdTech MVP that:
1. Learns your preferred explanation style (sports analogy, step-by-step, narrative, or technical)
2. Matches you with explanations that click for you using AI vector matching
3. Improves over time based on your feedback

## Get Started in 2 Minutes

### Terminal 1: Backend
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env        # Add your LITELLM_API_KEY
uvicorn app.main:app --reload
# 🟢 Backend ready at http://localhost:8000
```

### Terminal 2: Frontend
```bash
cd frontend
npm install
npm run dev
# 🟢 Frontend ready at http://localhost:3000
```

### Open App
Visit **http://localhost:3000** and try the app! 🎓

---

## 📚 Documentation

### Quick References
- **QUICKSTART.md** ← Start here for setup instructions
- **README.md** ← Full technical documentation
- **PROJECT_SUMMARY.md** ← What was built and why
- **CLAUDE.md** ← Development guide

### For Developers
- **Implementation Plan**: `.claude/plans/ethereal-sauteeing-bear.md`
- **API Docs**: `http://localhost:8000/docs` (after backend starts)
- **Project Structure**: See directory tree below

---

## 📁 Project Structure

```
lexicon/
├── backend/              # FastAPI server
│   ├── app/
│   │   ├── main.py              # FastAPI entry point
│   │   ├── routers/             # API endpoints
│   │   ├── services/            # Vector matching, LLM
│   │   ├── models/              # Data types
│   │   └── data/explanations.json  # 15 explanations
│   └── requirements.txt
│
├── frontend/             # Next.js app
│   ├── app/
│   │   ├── page.tsx             # Home
│   │   ├── onboarding/page.tsx  # Style selection
│   │   └── learn/[concept]/page.tsx  # Learn + rate
│   ├── components/              # React components
│   ├── lib/api.ts               # API client
│   └── package.json
│
├── QUICKSTART.md         ← Quick setup guide
├── README.md             ← Full documentation
├── PROJECT_SUMMARY.md    ← What was built
├── CLAUDE.md             ← Dev guidelines
└── START_HERE.md         ← This file
```

---

## 🎯 How It Works

1. **Type a topic** — "Why does a car accelerate?"
2. **Choose a style** — Get 4 variants (sports, step-by-step, narrative, technical)
3. **Pick a concept** — Learn acceleration, energy, or probability
4. **Get best explanation** — System finds the perfect match for you
5. **Rate it** ⭐ — Your feedback improves future matches
6. **Repeat** — System personalizes as you learn!

---

## 🔧 Tech Stack

- **Backend**: FastAPI + Python 3.10 + NumPy + LiteLLM
- **Frontend**: Next.js 14 + TypeScript + Tailwind CSS
- **Matching**: 12-dimensional vectors + cosine similarity
- **Data**: JSON + in-memory storage (MVP)

---

## ⚙️ Setup Help

### I get "ModuleNotFoundError"
```bash
# Activate virtual environment
source .venv/bin/activate
# Install requirements
pip install -r backend/requirements.txt
```

### I get CORS errors
- Make sure backend is running at `http://localhost:8000`
- Check frontend `.env.local` has `NEXT_PUBLIC_API_URL=http://localhost:8000`

### LLM generation fails
- Check `.env` has valid `LITELLM_API_KEY`
- Verify API key has proper permissions
- Check `LITELLM_MODEL` and `LITELLM_BASE_URL`

### Frontend won't load
- Make sure Node.js 18+ is installed: `node --version`
- Try: `npm install` again
- Check backend is running: `curl http://localhost:8000/api/health`

---

## 📖 Next Steps

1. **Follow QUICKSTART.md** for detailed setup
2. **Test the app** — Complete one full flow
3. **Read README.md** for API reference
4. **Explore code** — Start with `backend/app/main.py`
5. **Add features** — See CLAUDE.md for development tips

---

## 🎓 What You Can Learn

- **Vector spaces** — How semantic matching works
- **FastAPI** — Building REST APIs in Python
- **Next.js** — Building modern React apps
- **AI/ML basics** — Cosine similarity, vector operations
- **Full-stack development** — Complete app architecture

---

## 📊 Key Files to Understand

**Backend**:
- `backend/app/services/vector_ops.py` — Vector mathematics
- `backend/app/services/matching.py` — Similarity calculation
- `backend/app/routers/onboarding.py` — User profiling
- `backend/app/data/explanations.json` — Explanation library

**Frontend**:
- `frontend/lib/api.ts` — API communication
- `frontend/app/onboarding/page.tsx` — Onboarding flow
- `frontend/app/learn/[concept]/page.tsx` — Learning interface

---

## 🚀 Ready?

1. Run the setup commands above
2. Visit http://localhost:3000
3. Start learning!

For detailed help, see **QUICKSTART.md** or **README.md**.

---

**Happy learning! 🎉**
