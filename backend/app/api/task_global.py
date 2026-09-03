from typing import Annotated

from fastapi import (
    APIRouter,
    Depends,
    status,
)
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.task import (
    TaskCreate,
    TaskRead,
    TaskStatusUpdate,
)
from app.services.task_service import (
    change_global_task_status,
    create_global_task,
    get_task,
)
from app.schemas.task_comment import (
    TaskCommentCreate,
    TaskCommentRead,
)
from app.services.task_comment_service import (
    create_task_comment,
    get_task_comments,
)


router = APIRouter(
    prefix="/tasks",
    tags=["Tasks"],
)


@router.post(
    "",
    response_model=TaskRead,
    status_code=status.HTTP_201_CREATED,
)
def create_global_task_endpoint(
    data: TaskCreate,
    db: Annotated[
        Session,
        Depends(get_db)
    ],
    current_user: Annotated[
        User,
        Depends(get_current_user)
    ],
):
    return create_global_task(
        db=db,
        data=data,
        current_user=current_user,
    )


@router.get(
    "/{task_id}",
    response_model=TaskRead,
)
def get_task_endpoint(
    task_id: int,
    db: Annotated[
        Session,
        Depends(get_db)
    ],
    current_user: Annotated[
        User,
        Depends(get_current_user)
    ],
):
    return get_task(
        db=db,
        task_id=task_id,
    )

@router.patch(
    "/{task_id}/status",
    response_model=TaskRead,
)
def change_global_task_status_endpoint(
    task_id: int,
    data: TaskStatusUpdate,
    db: Annotated[
        Session,
        Depends(get_db)
    ],
    current_user: Annotated[
        User,
        Depends(get_current_user)
    ],
):
    return change_global_task_status(
        db=db,
        task_id=task_id,
        data=data,
        current_user=current_user,
    )

@router.get(
    "/{task_id}/comments",
    response_model=list[TaskCommentRead],
)
def get_task_comments_endpoint(
    task_id: int,
    db: Annotated[
        Session,
        Depends(get_db)
    ],
    current_user: Annotated[
        User,
        Depends(get_current_user)
    ],
):
    return get_task_comments(
        db=db,
        task_id=task_id,
    )

@router.post(
    "/{task_id}/comments",
    response_model=TaskCommentRead,
    status_code=status.HTTP_201_CREATED,
)
def create_task_comment_endpoint(
    task_id: int,
    data: TaskCommentCreate,
    db: Annotated[
        Session,
        Depends(get_db)
    ],
    current_user: Annotated[
        User,
        Depends(get_current_user)
    ],
):
    return create_task_comment(
        db=db,
        task_id=task_id,
        data=data,
        current_user=current_user,
    )