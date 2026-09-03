from sqlalchemy import select
from sqlalchemy.orm import Session

from datetime import date

from app.models.procurement_item import ProcurementItem

from app.models.procurement_item import (
    ProcurementItem,
    ProcurementItemStatus,
)

def get_filtered_procurement_items(
    db: Session,
    *,
    project_id: int | None = None,
    item_status: str | None = None,
    delivery_from: date | None = None,
    delivery_to: date | None = None,
    exclude_delivered: bool = False
) -> list[ProcurementItem]:

    statement = select(ProcurementItem)

    if project_id is not None:
        statement = statement.where(
            ProcurementItem.project_id == project_id
        )

    if item_status is not None:
        statement = statement.where(
            ProcurementItem.status == item_status
        )

    if delivery_from is not None:
        statement = statement.where(
            ProcurementItem.expected_delivery_date
            >= delivery_from
        )

    if delivery_to is not None:
        statement = statement.where(
            ProcurementItem.expected_delivery_date
            <= delivery_to
        )

    if (
        delivery_from is not None
        or delivery_to is not None
    ):
        statement = statement.where(
            ProcurementItem.expected_delivery_date.is_not(
                None
            )
        )

    if exclude_delivered:
        statement = statement.where(
            ~ProcurementItem.status.in_(
                [
                    ProcurementItemStatus.DELIVERED.value,
                    ProcurementItemStatus.COMPLETED.value,
                ]
            )
        )

    statement = statement.order_by(
        ProcurementItem.expected_delivery_date
        .asc()
        .nulls_last(),
        ProcurementItem.id.desc()
    )

    return list(
        db.scalars(statement).all()
    )

def create_procurement_item(
    db: Session,
    *,
    project_id: int,
    created_by_id: int,
    item_data: dict
) -> ProcurementItem:

    item = ProcurementItem(
        project_id=project_id,
        created_by_id=created_by_id,
        **item_data
    )

    db.add(item)
    db.flush()

    return item


def get_procurement_items_by_project(
    db: Session,
    project_id: int
) -> list[ProcurementItem]:

    statement = (
        select(ProcurementItem)
        .where(
            ProcurementItem.project_id == project_id
        )
        .order_by(
            ProcurementItem.id.desc()
        )
    )

    return list(
        db.scalars(statement).all()
    )


def get_procurement_item_by_id(
    db: Session,
    item_id: int
) -> ProcurementItem | None:

    return db.get(
        ProcurementItem,
        item_id
    )


def update_procurement_item(
    db: Session,
    item: ProcurementItem,
    update_data: dict
) -> ProcurementItem:

    for field, value in update_data.items():
        setattr(
            item,
            field,
            value
        )

    db.commit()
    db.refresh(item)

    return item