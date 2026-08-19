from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.project_stage import (
    ProjectStageCreate,
    ProjectStageRead,
    ProjectStageUpdate,
)
from app.services.project_stage_service import (
    create_new_stage,
    get_project_stage,
    get_project_stages,
    update_existing_stage,
)


router = APIRouter(
    prefix="/projects/{project_id}/stages",
    tags=["Project Stages"]
)


@router.post(
    "",
    response_model=ProjectStageRead,
    status_code=status.HTTP_201_CREATED
)
def create_stage_endpoint(
    project_id: int,
    data: ProjectStageCreate,
    db: Annotated[
        Session,
        Depends(get_db)
    ],
    current_user: Annotated[
        User,
        Depends(get_current_user)
    ]
):
    return create_new_stage(
        db=db,
        project_id=project_id,
        data=data
    )


@router.get(
    "",
    response_model=list[ProjectStageRead]
)
def get_stages_endpoint(
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
    return get_project_stages(
        db=db,
        project_id=project_id
    )


@router.get(
    "/{stage_id}",
    response_model=ProjectStageRead
)
def get_stage_endpoint(
    project_id: int,
    stage_id: int,
    db: Annotated[
        Session,
        Depends(get_db)
    ],
    current_user: Annotated[
        User,
        Depends(get_current_user)
    ]
):
    return get_project_stage(
        db=db,
        project_id=project_id,
        stage_id=stage_id
    )


@router.patch(
    "/{stage_id}",
    response_model=ProjectStageRead
)
def update_stage_endpoint(
    project_id: int,
    stage_id: int,
    data: ProjectStageUpdate,
    db: Annotated[
        Session,
        Depends(get_db)
    ],
    current_user: Annotated[
        User,
        Depends(get_current_user)
    ]
):
    return update_existing_stage(
        db=db,
        project_id=project_id,
        stage_id=stage_id,
        data=data
    )