from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.calendar import CalendarRead
from app.services.calendar_service import (
    get_calendar,
)


router = APIRouter(
    prefix="/calendar",
    tags=["Calendar"]
)


@router.get(
    "",
    response_model=CalendarRead
)
def get_calendar_endpoint(
    date_from: date,
    date_to: date,
    db: Annotated[
        Session,
        Depends(get_db)
    ],
    current_user: Annotated[
        User,
        Depends(get_current_user)
    ],
    include_completed: bool = False
):
    return get_calendar(
        db=db,
        current_user=current_user,
        date_from=date_from,
        date_to=date_to,
        include_completed=include_completed
    )