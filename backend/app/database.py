"""Database configuration and setup for Lexicon."""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os
from pathlib import Path

# Use SQLite database in backend directory
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./lexicon.db")

# Ensure the database file exists in the project directory
if DATABASE_URL.startswith("sqlite:///"):
    db_path = DATABASE_URL.replace("sqlite:///", "")
    if not db_path.startswith("/"):
        # Relative path - make it relative to backend directory
        backend_dir = Path(__file__).parent.parent
        db_path = str(backend_dir / db_path)
        DATABASE_URL = f"sqlite:///{db_path}"

# Create database engine
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {},
)

# Create session factory
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

# Base class for ORM models
Base = declarative_base()


def get_db():
    """Dependency for getting database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables():
    """Create all tables in the database."""
    Base.metadata.create_all(bind=engine)


def seed_admin_questions():
    """Seed admin questions from questionnaire.json on first startup."""
    import json
    from pathlib import Path
    from .models.db_models import AdminQuestion

    db = SessionLocal()
    try:
        # Check if questions already exist
        existing = db.query(AdminQuestion).first()
        if existing:
            return  # Already seeded

        # Load questions from questionnaire.json
        questions_file = Path(__file__).parent / "data" / "questionnaire.json"
        if not questions_file.exists():
            return

        with open(questions_file, "r") as f:
            data = json.load(f)

        # Add each question as an admin question
        for idx, question in enumerate(data.get("questions", [])):
            admin_q = AdminQuestion(
                order=idx,
                question_data=question,
            )
            db.add(admin_q)

        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Error seeding admin questions: {e}")
    finally:
        db.close()
