from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.task_comment import (
    TaskCommentCreate,
    TaskCommentRead,
)
from app.services.task_comment_service import (
    add_task_comment,
    get_project_task_comments,
)


router = APIRouter(
    prefix="/projects/{project_id}/tasks/{task_id}/comments",
    tags=["Task Comments"]
)


@router.post(
    "",
    response_model=TaskCommentRead,
    status_code=status.HTTP_201_CREATED
)
def create_comment_endpoint(
    project_id: int,
    task_id: int,
    data: TaskCommentCreate,
    db: Annotated[
        Session,
        Depends(get_db)
    ],
    current_user: Annotated[
        User,
        Depends(get_current_user)
    ]
):
    return add_task_comment(
        db=db,
        project_id=project_id,
        task_id=task_id,
        data=data,
        current_user=current_user
    )


@router.get(
    "",
    response_model=list[TaskCommentRead]
)
def get_comments_endpoint(
    project_id: int,
    task_id: int,
    db: Annotated[
        Session,
        Depends(get_db)
    ],
    current_user: Annotated[
        User,
        Depends(get_current_user)
    ]
):
    return get_project_task_comments(
        db=db,
        project_id=project_id,
        task_id=task_id
    )