"""Category management routes for teachers/admins."""
import logging
from fastapi import APIRouter, Depends, HTTPException, status, Header

logger = logging.getLogger(__name__)
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from ..database import get_db
from ..models.db_models import Category, User
from ..routers.auth import get_current_user_from_header

router = APIRouter(prefix="/api/categories", tags=["categories"])


class CategoryCreate(BaseModel):
    """Create a new category."""

    name: str
    description: Optional[str] = None


class CategoryUpdate(BaseModel):
    """Update a category."""

    name: Optional[str] = None
    description: Optional[str] = None


class CategoryResponse(BaseModel):
    """Category response."""

    id: int
    name: str
    description: Optional[str]
    created_by: Optional[int]

    class Config:
        from_attributes = True


async def get_optional_user(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db),
) -> Optional[User]:
    """Get user if authenticated, otherwise return None."""
    if not authorization:
        return None

    from ..services.auth_service import decode_token

    if not authorization.startswith("Bearer "):
        return None

    token = authorization[7:]
    token_data = decode_token(token)

    if not token_data:
        return None

    user = db.query(User).filter(User.id == token_data.user_id).first()
    return user


@router.get("/", response_model=List[CategoryResponse])
async def list_categories(db: Session = Depends(get_db)):
    """Get all categories (public)."""
    try:
        categories = db.query(Category).all()
        return categories
    except Exception:
        logger.exception("list categories failed")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_category(
    category_data: CategoryCreate,
    current_user: User = Depends(get_current_user_from_header),
    db: Session = Depends(get_db),
):
    """Create a new category (admin only)."""
    try:
        if not current_user.is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admins can create categories",
            )

        # Check if category with same name exists
        existing = db.query(Category).filter(Category.name == category_data.name).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Category with this name already exists",
            )

        category = Category(
            name=category_data.name,
            description=category_data.description,
            created_by=current_user.id,
        )
        db.add(category)
        db.commit()
        db.refresh(category)
        return category
    except HTTPException:
        raise
    except Exception:
        logger.exception("create category failed for name='%s'", category_data.name)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/{category_id}", response_model=CategoryResponse)
async def get_category(category_id: int, db: Session = Depends(get_db)):
    """Get a specific category (public)."""
    try:
        category = db.query(Category).filter(Category.id == category_id).first()
        if not category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Category not found",
            )
        return category
    except HTTPException:
        raise
    except Exception:
        logger.exception("get category failed for id=%s", category_id)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.put("/{category_id}", response_model=CategoryResponse)
async def update_category(
    category_id: int,
    category_data: CategoryUpdate,
    current_user: User = Depends(get_current_user_from_header),
    db: Session = Depends(get_db),
):
    """Update a category (admin only)."""
    try:
        if not current_user.is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admins can update categories",
            )

        category = db.query(Category).filter(Category.id == category_id).first()
        if not category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Category not found",
            )

        # Check if new name conflicts
        if category_data.name and category_data.name != category.name:
            existing = (
                db.query(Category).filter(Category.name == category_data.name).first()
            )
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Category with this name already exists",
                )

        if category_data.name:
            category.name = category_data.name
        if category_data.description is not None:
            category.description = category_data.description

        db.commit()
        db.refresh(category)
        return category
    except HTTPException:
        raise
    except Exception:
        logger.exception("update category failed for id=%s", category_id)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(
    category_id: int,
    current_user: User = Depends(get_current_user_from_header),
    db: Session = Depends(get_db),
):
    """Delete a category (admin only)."""
    try:
        if not current_user.is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admins can delete categories",
            )

        category = db.query(Category).filter(Category.id == category_id).first()
        if not category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Category not found",
            )

        db.delete(category)
        db.commit()
        return None
    except HTTPException:
        raise
    except Exception:
        logger.exception("delete category failed for id=%s", category_id)
        raise HTTPException(status_code=500, detail="Internal server error")
