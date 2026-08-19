from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.task import (
    TaskCreate,
    TaskRead,
    TaskStatusUpdate,
    TaskUpdate,
)
from app.services.task_service import (
    change_task_status,
    create_new_task,
    get_project_task,
    get_project_tasks,
    update_existing_task,
)


router = APIRouter(
    prefix="/projects/{project_id}/tasks",
    tags=["Tasks"]
)

@router.patch(
    "/{task_id}/status",
    response_model=TaskRead
)
def change_task_status_endpoint(
    project_id: int,
    task_id: int,
    data: TaskStatusUpdate,
    db: Annotated[
        Session,
        Depends(get_db)
    ],
    current_user: Annotated[
        User,
        Depends(get_current_user)
    ]
):
    return change_task_status(
        db=db,
        project_id=project_id,
        task_id=task_id,
        data=data,
        current_user=current_user
    )

@router.post(
    "",
    response_model=TaskRead,
    status_code=status.HTTP_201_CREATED
)
def create_task_endpoint(
    project_id: int,
    data: TaskCreate,
    db: Annotated[
        Session,
        Depends(get_db)
    ],
    current_user: Annotated[
        User,
        Depends(get_current_user)
    ]
):
    return create_new_task(
        db=db,
        project_id=project_id,
        data=data,
        current_user=current_user
    )


@router.get(
    "",
    response_model=list[TaskRead]
)
def get_tasks_endpoint(
    project_id: int,
    db: Annotated[
        Session,
        Depends(get_db)
    ],
    current_user: Annotated[
        User,
        Depends(get_current_user)
    ]
):
    return get_project_tasks(
        db=db,
        project_id=project_id
    )


@router.get(
    "/{task_id}",
    response_model=TaskRead
)
def get_task_endpoint(
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
    return get_project_task(
        db=db,
        project_id=project_id,
        task_id=task_id
    )


@router.patch(
    "/{task_id}",
    response_model=TaskRead
)
def update_task_endpoint(
    project_id: int,
    task_id: int,
    data: TaskUpdate,
    db: Annotated[
        Session,
        Depends(get_db)
    ],
    current_user: Annotated[
        User,
        Depends(get_current_user)
    ]
):
    return update_existing_task(
        db=db,
        project_id=project_id,
        task_id=task_id,
        data=data
    )