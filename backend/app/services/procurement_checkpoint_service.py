from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.user import User
from app.repositories.procurement_checkpoint_repository import (
    get_checkpoint_by_id,
    get_checkpoints_by_item,
    set_checkpoint_state,
)
from app.schemas.procurement_checkpoint import (
    ProcurementCheckpointUpdate,
)
from app.services.procurement_item_service import (
    get_project_procurement_item,
)


def get_item_checkpoints(
    db: Session,
    project_id: int,
    item_id: int,
):
    item = get_project_procurement_item(
        db=db,
        project_id=project_id,
        item_id=item_id,
    )

    return get_checkpoints_by_item(
        db=db,
        item_id=item.id,
    )


def update_item_checkpoint(
    db: Session,
    project_id: int,
    item_id: int,
    checkpoint_id: int,
    data: ProcurementCheckpointUpdate,
    current_user: User,
):
    item = get_project_procurement_item(
        db=db,
        project_id=project_id,
        item_id=item_id,
    )

    checkpoint = get_checkpoint_by_id(
        db,
        checkpoint_id,
    )

    if (
        checkpoint is None
        or checkpoint.item_id != item.id
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Контрольная точка не найдена",
        )

    return set_checkpoint_state(
        db=db,
        checkpoint=checkpoint,
        is_completed=data.is_completed,
        user_id=current_user.id,
    )