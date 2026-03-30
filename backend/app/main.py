"""Lexicon FastAPI backend application."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv
from contextlib import asynccontextmanager

# Load environment variables
load_dotenv()

# Import routers
from .routers import onboarding, explain, feedback, auth, questionnaire, categories
from .database import create_tables, seed_admin_questions, SessionLocal
from .models.db_models import User
from .services.auth_service import hash_password

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database and seed data on startup."""
    # Startup
    create_tables()
    seed_admin_questions()

    # Seed admin user if it doesn't exist
    db = SessionLocal()
    try:
        admin_exists = db.query(User).filter(User.email == "admin@example.com").first()
        if not admin_exists:
            admin_user = User(
                email="admin@example.com",
                hashed_password=hash_password("admin123"),
                is_admin=True
            )
            db.add(admin_user)
            db.commit()
            print("✓ Admin user created: admin@example.com / admin123")
    finally:
        db.close()

    yield
    # Shutdown
    pass


# Create FastAPI app
app = FastAPI(
    title="Lexicon API",
    description="Personalized learning platform using vector-based explanation matching",
    version="0.1.0",
    lifespan=lifespan,
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(categories.router)
app.include_router(questionnaire.router)
app.include_router(onboarding.router)
app.include_router(explain.router)
app.include_router(feedback.router)


@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "ok",
        "version": "0.2.0",
    }


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "Welcome to Lexicon API",
        "docs": "/docs",
        "health": "/api/health",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )
