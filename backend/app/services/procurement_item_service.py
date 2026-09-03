from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.user import User
from app.repositories.procurement_item_repository import (
    create_procurement_item,
    get_procurement_item_by_id,
    get_procurement_items_by_project,
    update_procurement_item,
)
from app.repositories.project_repository import (
    get_project_by_id,
)
from app.schemas.procurement_item import (
    ProcurementItemCreate,
    ProcurementItemUpdate,
)
from app.repositories.procurement_checkpoint_repository import (
    create_checkpoints_bulk,
)
from app.services.procurement_templates import (
    STANDARD_PROCUREMENT_CHECKPOINTS,
)


def create_new_procurement_item(
    db: Session,
    project_id: int,
    data: ProcurementItemCreate,
    current_user: User
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

    item_data = data.model_dump()

    item_data["status"] = data.status.value

    try:
        item = create_procurement_item(
            db=db,
            project_id=project_id,
            created_by_id=current_user.id,
            item_data=item_data
        )

        create_checkpoints_bulk(
            db=db,
            item_id=item.id,
            checkpoints_data=STANDARD_PROCUREMENT_CHECKPOINTS
        )

        db.commit()
        db.refresh(item)

        return item

    except Exception:
        db.rollback()
        raise


def get_project_procurement_items(
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

    return get_procurement_items_by_project(
        db,
        project_id
    )


def get_project_procurement_item(
    db: Session,
    project_id: int,
    item_id: int
):
    item = get_procurement_item_by_id(
        db,
        item_id
    )

    if (
        item is None
        or item.project_id != project_id
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Позиция комплектации не найдена"
        )

    return item


def update_existing_procurement_item(
    db: Session,
    project_id: int,
    item_id: int,
    data: ProcurementItemUpdate
):
    item = get_project_procurement_item(
        db=db,
        project_id=project_id,
        item_id=item_id
    )

    update_data = data.model_dump(
        exclude_unset=True
    )

    required_fields = {
        "name",
        "quantity",
        "unit",
        "currency",
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

    if "status" in update_data:
        update_data["status"] = (
            update_data["status"].value
        )

    return update_procurement_item(
        db=db,
        item=item,
        update_data=update_data
    )