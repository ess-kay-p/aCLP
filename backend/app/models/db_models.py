"""SQLAlchemy ORM models for Lexicon."""
from sqlalchemy import Column, Integer, String, JSON, Boolean, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime
from ..database import Base


class Category(Base):
    """Learning category (e.g., Physics, Chemistry, Mathematics)."""

    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    description = Column(String, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)  # Admin who created it
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    admin_questions = relationship("AdminQuestion", back_populates="category", cascade="all, delete-orphan")
    user_questions = relationship("UserQuestion", back_populates="category", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Category(id={self.id}, name={self.name})>"


class User(Base):
    """User account model."""

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user_vector = relationship("UserVector", back_populates="user", uselist=False, cascade="all, delete-orphan")
    user_questions = relationship("UserQuestion", back_populates="user", cascade="all, delete-orphan")
    question_history = relationship("QuestionHistory", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User(id={self.id}, email={self.email})>"


class UserVector(Base):
    """Learner profile vector for a user."""

    __tablename__ = "user_vectors"
    __table_args__ = (UniqueConstraint("user_id", name="uq_user_id"),)

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    vector = Column(JSON, nullable=False)  # 8D vector as list or dict

    # Relationships
    user = relationship("User", back_populates="user_vector")

    def __repr__(self):
        return f"<UserVector(user_id={self.user_id})>"


class SessionVector(Base):
    """Learner profile vector for session-based (unauthenticated) users."""

    __tablename__ = "session_vectors"
    __table_args__ = (UniqueConstraint("session_id", name="uq_session_id"),)

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, nullable=False, unique=True, index=True)
    vector = Column(JSON, nullable=False)  # 8D vector as list
    created_at = Column(DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"<SessionVector(session_id={self.session_id})>"


class UserQuestion(Base):
    """Custom questions configured by a user."""

    __tablename__ = "user_questions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    order = Column(Integer, nullable=False)
    question_data = Column(JSON, nullable=False)  # Full question JSON structure

    # Relationships
    user = relationship("User", back_populates="user_questions")
    category = relationship("Category", back_populates="user_questions")

    def __repr__(self):
        return f"<UserQuestion(user_id={self.user_id}, category_id={self.category_id}, order={self.order})>"


class AdminQuestion(Base):
    """Default questions configured by admin."""

    __tablename__ = "admin_questions"

    id = Column(Integer, primary_key=True, index=True)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    order = Column(Integer, nullable=False)
    question_data = Column(JSON, nullable=False)  # Full question JSON structure

    # Relationships
    category = relationship("Category", back_populates="admin_questions")

    def __repr__(self):
        return f"<AdminQuestion(category_id={self.category_id}, order={self.order})>"


class QuestionHistory(Base):
    """Records of past Ask-a-Question interactions."""

    __tablename__ = "question_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    session_id = Column(String, nullable=True, index=True)
    topic = Column(String, nullable=False)
    explanation = Column(String, nullable=False)
    style = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="question_history")

    def __repr__(self):
        return f"<QuestionHistory(id={self.id}, user_id={self.user_id}, session_id={self.session_id})>"
