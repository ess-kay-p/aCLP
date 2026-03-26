# Lexicon MVP

A personalized learning platform that matches educational explanations to individual students' learning styles using vector-based profiling and cosine similarity matching.

## Overview

Lexicon solves the fundamental EdTech problem: students struggle not from lack of intelligence but from **misaligned explanatory language**. The platform personalizes explanations by:

1. **Understanding learner preference** — User selects their preferred explanation style (sports analogy, step-by-step, narrative, or technical)
2. **Building a learner vector** — Maps the selected style to a 12-dimensional vector representing learning preferences
3. **Matching explanations** — Uses cosine similarity to find the best-fit explanation for each concept
4. **Adaptive feedback** — User ratings continuously refine the learner vector

## Project Structure

```
lexicon/
├── backend/
│   ├── app/
│   │   ├── main.py                 # FastAPI application
│   │   ├── routers/
│   │   │   ├── onboarding.py       # POST /api/onboarding/generate, /select
│   │   │   ├── explain.py          # POST /api/explain
│   │   │   └── feedback.py         # POST /api/feedback
│   │   ├── services/
│   │   │   ├── llm.py              # LiteLLM integration
│   │   │   ├── matching.py         # Cosine similarity engine
│   │   │   └── vector_ops.py       # Vector operations
│   │   ├── models/                 # Pydantic models
│   │   └── data/
│   │       ├── explanations.json   # Pre-written 15 explanations
│   │       └── loader.py
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/
│   ├── app/
│   │   ├── page.tsx                # Home / concept selector
│   │   ├── onboarding/page.tsx     # Onboarding flow
│   │   └── learn/[concept]/page.tsx # Explanation + rating
│   ├── components/
│   │   ├── TopicInput.tsx
│   │   ├── ExplanationVariants.tsx
│   │   ├── ExplanationCard.tsx
│   │   └── RatingWidget.tsx
│   ├── lib/api.ts                  # API client
│   └── package.json
│
└── README.md
```

## Setup

### Backend Setup

1. **Install dependencies**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your LiteLLM API key
   ```

3. **Run the server**
   ```bash
   cd backend
   uvicorn app.main:app --reload
   ```

   The API will be available at `http://localhost:8000`
   - API docs: `http://localhost:8000/docs`
   - Health check: `http://localhost:8000/api/health`

### Frontend Setup

1. **Install dependencies**
   ```bash
   cd frontend
   npm install
   ```

2. **Configure environment** (optional)
   ```bash
   cp .env.example .env.local
   # If backend is not at localhost:8000, update NEXT_PUBLIC_API_URL
   ```

3. **Run the dev server**
   ```bash
   cd frontend
   npm run dev
   ```

   The app will be available at `http://localhost:3000`

## Usage

### Complete User Flow

1. **Visit Home** — Go to `http://localhost:3000`
2. **Start Learning** — Click "Start Learning" button
3. **Onboarding** — Type a topic (e.g., "Why does a car accelerate?")
4. **Choose Style** — Select your preferred explanation style from 4 variants
5. **Learn Concept** — Select a concept (acceleration, energy, or probability)
6. **View Explanation** — Read the best-matched explanation for your style
7. **Rate** — Give 1-5 stars to improve future matches
8. **Repeat** — Your vector updates based on ratings, improving personalization

## API Endpoints

### Onboarding

**POST** `/api/onboarding/generate`
- Generate 4 explanation variants for a topic
- Request: `{ "topic": "string" }`
- Response: 4 variants (sports, step_by_step, narrative, technical)

**POST** `/api/onboarding/select`
- Save learner profile based on selected style
- Request: `{ "session_id": "string", "topic": "string", "selected_style": "string" }`
- Response: Student profile with 12D vector

### Learning

**GET** `/api/concepts`
- List available concepts: ["acceleration", "energy", "probability"]

**POST** `/api/explain`
- Get best-matched explanation for a learner and concept
- Request: `{ "session_id": "string", "concept": "string" }`
- Response: Explanation with ID, text, and metadata

**POST** `/api/feedback`
- Submit rating and update learner vector
- Request: `{ "session_id": "string", "concept": "string", "explanation_id": int, "rating": 1-5 }`
- Response: Updated student profile

**GET** `/api/health`
- Health check

## Vector Space

### 12 Dimensions

| Index | Dimension | Meaning |
|-------|-----------|---------|
| 0 | sports | Preference for sports analogies |
| 1 | science | Preference for scientific framing |
| 2 | music | Preference for music analogies |
| 3 | systems | Preference for systems thinking |
| 4 | narrative | Preference for story-based learning |
| 5 | analogy | Preference for metaphor/analogy format |
| 6 | step_by_step | Preference for sequential instructions |
| 7 | visual | Preference for descriptive/visual formats |
| 8 | mathematical | Preference for formulas and logic |
| 9 | complexity_low | Preference for simple language |
| 10 | complexity_med | Preference for moderate complexity |
| 11 | complexity_high | Preference for advanced/technical language |

### Style → Vector Mapping

Selecting a style during onboarding creates a vector:
- **Sports**: sports=1.0, analogy=1.0, complexity_low=0.8
- **Step-by-step**: step_by_step=1.0, systems=0.7, complexity_med=0.8
- **Narrative**: narrative=1.0, analogy=0.7, complexity_low=0.8
- **Technical**: science=1.0, mathematical=1.0, complexity_high=1.0

## Matching Algorithm

```
Best explanation = argmax(cosine_similarity(learner_vector, explanation_vector))

Vector update formula:
S_{t+1} = S_t + α * (r_t - r̄) * Ê_t
where:
  S_t = current learner vector
  α = 0.1 (learning rate)
  r_t = rating (1-5)
  r̄ = 3.0 (baseline rating)
  Ê_t = normalized explanation vector
```

## Data

### Pre-written Explanations

3 concepts × 5 explanation styles = 15 total explanations:

**Acceleration**
- Sports analogy
- Step-by-step
- Narrative
- Technical
- Visual

**Energy**
- Sports analogy
- Step-by-step
- Narrative
- Technical
- Visual

**Probability**
- Sports analogy
- Step-by-step
- Narrative
- Technical
- Visual

All explanations are stored in `backend/app/data/explanations.json` with semantic vectors.

## Tech Stack

### Backend
- **Framework**: FastAPI 0.104.1
- **Language**: Python 3.10
- **Vector ops**: NumPy
- **LLM**: LiteLLM (OpenAI-compatible)
- **API docs**: Swagger/OpenAPI

### Frontend
- **Framework**: Next.js 14
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **HTTP**: Axios

## Environment Variables

### Backend (.env)
```
LITELLM_API_KEY=your_litellm_key_here
LITELLM_MODEL=gpt-3.5-turbo
LITELLM_BASE_URL=https://api.openai.com/v1
DEBUG=False
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Development

### Adding New Concepts

1. **Add explanations** to `backend/app/data/explanations.json`
   - Create 5 variants (sports, step_by_step, narrative, technical, visual)
   - Assign semantic vectors (12 dimensions)

2. **Explanations auto-load** — No code changes needed

### Customizing Vector Dimensions

Edit `backend/app/services/vector_ops.py`:
- `DIMENSIONS` list defines 12 dimensions
- `create_style_vector()` maps styles to dimensions
- Explanations tagged with 12D vectors in JSON

### Running Tests

```bash
# Backend (add pytest tests as needed)
cd backend
pytest

# Frontend (add Jest tests as needed)
cd frontend
npm test
```

## Deployment

### Backend
```bash
cd backend
gunicorn -w 4 -k uvicorn.workers.UvicornWorker app.main:app
```

### Frontend
```bash
cd frontend
npm run build
npm run start
```

## Future Enhancements

- User authentication & persistent profiles
- Automated explanation generation via LLM
- Teacher/admin dashboard for analytics
- Multi-language support
- Advanced vector profiling (20+ dimensions)
- Database persistence (PostgreSQL)
- A/B testing framework for explanations
- Real-time feedback visualization

## License

MIT

## Author

Built as a personalized learning MVP for Lexicon platform.
