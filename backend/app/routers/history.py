"""History routes for Ask-a-Question interactions."""
import logging
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.db_models import QuestionHistory, User
from ..services.auth_service import decode_token

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/history", tags=["history"])


async def get_optional_user(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db),
) -> Optional[User]:
    """Get user if authenticated, otherwise return None."""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization[7:]
    token_data = decode_token(token)
    if not token_data:
        return None
    return db.query(User).filter(User.id == token_data.user_id).first()


class HistoryItemResponse(BaseModel):
    id: int
    topic: str
    explanation: str
    style: str
    image_url: Optional[str] = None
    diagram_svg: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


@router.get("", response_model=List[HistoryItemResponse])
async def get_history(
    session_id: Optional[str] = None,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db),
) -> List[HistoryItemResponse]:
    """Get the 20 most recent history items for the current user or session."""
    try:
        if current_user:
            rows = (
                db.query(QuestionHistory)
                .filter(QuestionHistory.user_id == current_user.id)
                .order_by(QuestionHistory.created_at.desc())
                .limit(20)
                .all()
            )
        elif session_id:
            rows = (
                db.query(QuestionHistory)
                .filter(QuestionHistory.session_id == session_id)
                .order_by(QuestionHistory.created_at.desc())
                .limit(20)
                .all()
            )
        else:
            return []

        return [HistoryItemResponse.model_validate(r) for r in rows]
    except Exception:
        logger.exception("get history failed")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.delete("/{item_id}")
async def delete_history_item(
    item_id: int,
    session_id: Optional[str] = None,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """Delete a single history item owned by the current user or session."""
    try:
        row = db.query(QuestionHistory).filter(QuestionHistory.id == item_id).first()
        if not row:
            raise HTTPException(status_code=404, detail="History item not found")

        # Authorise
        if current_user:
            if row.user_id != current_user.id:
                raise HTTPException(status_code=403, detail="Forbidden")
        elif session_id:
            if row.session_id != session_id:
                raise HTTPException(status_code=403, detail="Forbidden")
        else:
            raise HTTPException(status_code=403, detail="Forbidden")

        db.delete(row)
        db.commit()
        return {"status": "deleted"}
    except HTTPException:
        raise
    except Exception:
        logger.exception("delete history item failed for id=%s", item_id)
        raise HTTPException(status_code=500, detail="Internal server error")
