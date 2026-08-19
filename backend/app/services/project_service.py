from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.user import User
from app.repositories.project_repository import (
    create_project,
    get_all_projects,
    get_project_by_id,
    update_project,
)
from app.repositories.user_repository import get_user_by_id
from app.schemas.project import (
    ProjectCreate,
    ProjectUpdate,
)
from app.repositories.project_stage_repository import (
    create_stages_bulk,
)
from app.services.project_templates import (
    STANDARD_PROJECT_STAGES,
)

def get_projects(
    db: Session
):
    return get_all_projects(db)


def get_project(
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

    return project

def create_new_project(
    db: Session,
    data: ProjectCreate,
    current_user: User
):
    responsible = get_user_by_id(
        db,
        data.responsible_id
    )

    if responsible is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ответственный пользователь не найден"
        )

    if (
        data.start_date is not None
        and data.deadline is not None
        and data.deadline < data.start_date
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Дедлайн не может быть раньше даты начала"
        )

    try:
        project = create_project(
            db=db,
            name=data.name,
            object_type=data.object_type.value,
            area=data.area,
            city=data.city,
            address=data.address,
            client_name=data.client_name,
            status=data.status.value,
            start_date=data.start_date,
            deadline=data.deadline,
            responsible_id=data.responsible_id,
            created_by_id=current_user.id,
            description=data.description
        )

        create_stages_bulk(
            db=db,
            project_id=project.id,
            stages_data=STANDARD_PROJECT_STAGES
        )

        db.commit()
        db.refresh(project)

        return project

    except Exception:
        db.rollback()
        raise

def update_existing_project(
    db: Session,
    project_id: int,
    data: ProjectUpdate
):
    project = get_project(
        db,
        project_id
    )

    update_data = data.model_dump(
        exclude_unset=True
    )

    required_fields = {
        "name",
        "object_type",
        "area",
        "client_name",
        "status",
        "responsible_id",
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

    if "responsible_id" in update_data:
        responsible = get_user_by_id(
            db,
            update_data["responsible_id"]
        )

        if responsible is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ответственный пользователь не найден"
            )

    new_start_date = update_data.get(
        "start_date",
        project.start_date
    )

    new_deadline = update_data.get(
        "deadline",
        project.deadline
    )

    if (
        new_start_date is not None
        and new_deadline is not None
        and new_deadline < new_start_date
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Дедлайн не может быть раньше даты начала"
        )

    if "object_type" in update_data:
        update_data["object_type"] = (
            update_data["object_type"].value
        )

    if "status" in update_data:
        update_data["status"] = (
            update_data["status"].value
        )

    return update_project(
        db=db,
        project=project,
        update_data=update_data
    )