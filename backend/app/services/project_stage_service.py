from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.repositories.project_repository import (
    get_project_by_id,
)
from app.repositories.project_stage_repository import (
    create_stage,
    get_stage_by_id,
    get_stages_by_project,
    update_stage,
)
from app.schemas.project_stage import (
    ProjectStageCreate,
    ProjectStageUpdate,
)


def create_new_stage(
    db: Session,
    project_id: int,
    data: ProjectStageCreate
):
    project = get_project_by_id(
        db,
        project_id
    )

    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Проект не найден"
        )

    existing_stages = get_stages_by_project(
        db,
        project_id
    )

    for stage in existing_stages:
        if stage.position == data.position:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Этап с такой позицией уже существует"
            )

    return create_stage(
        db=db,
        project_id=project_id,
        name=data.name,
        position=data.position,
        status=data.status.value,
        deadline=data.deadline
    )

def get_project_stages(
    db: Session,
    project_id: int
):
    project = get_project_by_id(
        db,
        project_id
    )

    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Проект не найден"
        )

    return get_stages_by_project(
        db,
        project_id
    )

def get_project_stage(
    db: Session,
    project_id: int,
    stage_id: int
):
    stage = get_stage_by_id(
        db,
        stage_id
    )

    if (
        stage is None
        or stage.project_id != project_id
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Этап не найден"
        )

    return stage

def update_existing_stage(
    db: Session,
    project_id: int,
    stage_id: int,
    data: ProjectStageUpdate
):
    stage = get_project_stage(
        db,
        project_id,
        stage_id
    )

    update_data = data.model_dump(
        exclude_unset=True
    )

    required_fields = {
        "name",
        "position",
        "status",
    }

    for field in required_fields:
        if (
            field in update_data
            and update_data[field] is None
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Поле {field} не может быть пустым"
            )

    if "position" in update_data:
        stages = get_stages_by_project(
            db,
            project_id
        )

        for other_stage in stages:
            if (
                other_stage.id != stage.id
                and other_stage.position
                == update_data["position"]
            ):
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Этап с такой позицией уже существует"
                )

    if "status" in update_data:
        update_data["status"] = (
            update_data["status"].value
        )

    return update_stage(
        db=db,
        stage=stage,
        update_data=update_data
    )