from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.db.session import get_db
from app.models.task import TaskStatus
from app.models.user import User
from app.schemas.task import (
    TaskPeriod,
    TaskRead,
)
from app.services.task_service import (
    get_task_feed,
)


router = APIRouter(
    prefix="/tasks",
    tags=["Task Feed"]
)


@router.get(
    "",
    response_model=list[TaskRead]
)
def get_task_feed_endpoint(
    db: Annotated[
        Session,
        Depends(get_db)
    ],
    current_user: Annotated[
        User,
        Depends(get_current_user)
    ],
    project_id: int | None = None,
    task_status: TaskStatus | None = None,
    period: TaskPeriod | None = None,
    assignee_id: int | None = None,
    mine: bool = False
):
    return get_task_feed(
        db=db,
        current_user=current_user,
        project_id=project_id,
        task_status=task_status,
        period=period,
        assignee_id=assignee_id,
        mine=mine
    )