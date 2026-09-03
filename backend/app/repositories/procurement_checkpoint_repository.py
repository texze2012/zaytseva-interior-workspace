from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.procurement_checkpoint import (
    ProcurementCheckpoint,
)


def create_checkpoints_bulk(
    db: Session,
    item_id: int,
    checkpoints_data: list[dict],
) -> list[ProcurementCheckpoint]:

    checkpoints = []

    for checkpoint_data in checkpoints_data:
        checkpoint = ProcurementCheckpoint(
            item_id=item_id,
            code=checkpoint_data["code"],
            label=checkpoint_data["label"],
            phase=checkpoint_data["phase"],
            position=checkpoint_data["position"],
        )

        checkpoints.append(checkpoint)

    db.add_all(checkpoints)
    db.flush()

    return checkpoints


def get_checkpoints_by_item(
    db: Session,
    item_id: int,
) -> list[ProcurementCheckpoint]:

    statement = (
        select(ProcurementCheckpoint)
        .where(
            ProcurementCheckpoint.item_id == item_id
        )
        .order_by(
            ProcurementCheckpoint.position
        )
    )

    return list(
        db.scalars(statement).all()
    )


def get_checkpoint_by_id(
    db: Session,
    checkpoint_id: int,
) -> ProcurementCheckpoint | None:

    return db.get(
        ProcurementCheckpoint,
        checkpoint_id
    )


def set_checkpoint_state(
    db: Session,
    checkpoint: ProcurementCheckpoint,
    *,
    is_completed: bool,
    user_id: int,
) -> ProcurementCheckpoint:

    checkpoint.is_completed = is_completed

    if is_completed:
        checkpoint.completed_at = datetime.utcnow()
        checkpoint.completed_by_id = user_id
    else:
        checkpoint.completed_at = None
        checkpoint.completed_by_id = None

    db.commit()
    db.refresh(checkpoint)

    return checkpoint