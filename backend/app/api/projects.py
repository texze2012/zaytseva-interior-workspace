from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.project import (
    ProjectCreate,
    ProjectRead,
    ProjectUpdate,
)
from app.services.project_service import (
    create_new_project,
    get_project,
    get_projects,
    update_existing_project,
)


router = APIRouter(
    prefix="/projects",
    tags=["Projects"]
)


@router.post(
    "",
    response_model=ProjectRead,
    status_code=status.HTTP_201_CREATED
)
def create_project_endpoint(
    data: ProjectCreate,
    db: Annotated[
        Session,
        Depends(get_db)
    ],
    current_user: Annotated[
        User,
        Depends(get_current_user)
    ]
):
    return create_new_project(
        db=db,
        data=data,
        current_user=current_user
    )

@router.get(
    "",
    response_model=list[ProjectRead]
)
def get_projects_endpoint(
    db: Annotated[
        Session,
        Depends(get_db)
    ],
    current_user: Annotated[
        User,
        Depends(get_current_user)
    ]
):
    return get_projects(db)

@router.get(
    "/{project_id}",
    response_model=ProjectRead
)
def get_project_endpoint(
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
    return get_project(
        db=db,
        project_id=project_id
    )

@router.patch(
    "/{project_id}",
    response_model=ProjectRead
)
def update_project_endpoint(
    project_id: int,
    data: ProjectUpdate,
    db: Annotated[
        Session,
        Depends(get_db)
    ],
    current_user: Annotated[
        User,
        Depends(get_current_user)
    ]
):
    return update_existing_project(
        db=db,
        project_id=project_id,
        data=data
    )