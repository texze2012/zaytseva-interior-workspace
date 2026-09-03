from datetime import date, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.waiting_item import (
    WaitingItem,
    WaitingItemStatus,
)


def create_waiting_item(
    db: Session,
    *,
    project_id: int,
    created_by_id: int,
    item_data: dict
) -> WaitingItem:

    waiting_item = WaitingItem(
        project_id=project_id,
        created_by_id=created_by_id,
        **item_data
    )

    db.add(waiting_item)
    db.commit()
    db.refresh(waiting_item)

    return waiting_item


def get_waiting_item_by_id(
    db: Session,
    waiting_item_id: int
) -> WaitingItem | None:

    return db.get(
        WaitingItem,
        waiting_item_id
    )


def get_waiting_items_by_project(
    db: Session,
    project_id: int
) -> list[WaitingItem]:

    statement = (
        select(WaitingItem)
        .where(
            WaitingItem.project_id == project_id
        )
        .order_by(
            WaitingItem.next_reminder_date.asc().nulls_last(),
            WaitingItem.id.desc()
        )
    )

    return list(
        db.scalars(statement).all()
    )


def get_filtered_waiting_items(
    db: Session,
    *,
    project_id: int | None = None,
    waiting_status: str | None = None,
    reminder_due: bool = False,
    reminder_from: date | None = None,
    reminder_to: date | None = None,
    today: date
) -> list[WaitingItem]:

    statement = select(WaitingItem)

    if reminder_from is not None:
        statement = statement.where(
            WaitingItem.next_reminder_date
            >= reminder_from
        )

    if reminder_to is not None:
        statement = statement.where(
            WaitingItem.next_reminder_date
            <= reminder_to
        )

    if project_id is not None:
        statement = statement.where(
            WaitingItem.project_id == project_id
        )

    if waiting_status is not None:
        statement = statement.where(
            WaitingItem.status == waiting_status
        )

    if reminder_due:
        statement = statement.where(
            WaitingItem.status
            == WaitingItemStatus.WAITING.value,
            WaitingItem.next_reminder_date.is_not(None),
            WaitingItem.next_reminder_date <= today
        )

    statement = statement.order_by(
        WaitingItem.next_reminder_date.asc().nulls_last(),
        WaitingItem.id.desc()
    )

    return list(
        db.scalars(statement).all()
    )


def update_waiting_item(
    db: Session,
    waiting_item: WaitingItem,
    update_data: dict
) -> WaitingItem:

    for field, value in update_data.items():
        setattr(
            waiting_item,
            field,
            value
        )

    db.commit()
    db.refresh(waiting_item)

    return waiting_item


def update_waiting_item_status(
    db: Session,
    waiting_item: WaitingItem,
    new_status: str
) -> WaitingItem:

    waiting_item.status = new_status

    if new_status == WaitingItemStatus.RESOLVED.value:
        waiting_item.resolved_at = datetime.utcnow()
    else:
        waiting_item.resolved_at = None

    db.commit()
    db.refresh(waiting_item)

    return waiting_item