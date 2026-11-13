from datetime import date

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.waiting_item import WaitingItemStatus
from app.repositories.procurement_item_repository import (
    get_procurement_item_by_id,
)
from app.repositories.project_repository import (
    get_project_by_id,
)
from app.repositories.waiting_item_repository import (
    create_waiting_item,
    get_filtered_waiting_items,
    get_waiting_item_by_id,
    get_waiting_items_by_project,
    update_waiting_item,
    update_waiting_item_status,
)
from app.schemas.waiting_item import (
    WaitingItemCreate,
    WaitingItemStatusUpdate,
    WaitingItemUpdate,
)


def validate_procurement_item(
    db: Session,
    project_id: int,
    procurement_item_id: int | None
):
    if procurement_item_id is None:
        return

    item = get_procurement_item_by_id(
        db,
        procurement_item_id
    )

    if (
        item is None
        or item.project_id != project_id
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Позиция комплектации не принадлежит этому проекту"
        )


def create_new_waiting_item(
    db: Session,
    project_id: int,
    data: WaitingItemCreate,
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

    validate_procurement_item(
        db=db,
        project_id=project_id,
        procurement_item_id=data.procurement_item_id
    )

    requested_at = (
        data.requested_at
        if data.requested_at is not None
        else date.today()
    )

    if (
        data.next_reminder_date is not None
        and data.next_reminder_date < requested_at
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Дата напоминания не может быть раньше даты запроса"
        )

    item_data = data.model_dump()

    item_data["requested_at"] = requested_at
    from app.services.scheduling_service import validate_schedule
    validate_schedule(db, item_data, current_user.id)

    return create_waiting_item(
        db=db,
        project_id=project_id,
        created_by_id=current_user.id,
        item_data=item_data
    )


def get_project_waiting_items(
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

    return get_waiting_items_by_project(
        db,
        project_id
    )


def get_waiting_item(
    db: Session,
    waiting_item_id: int
):
    waiting_item = get_waiting_item_by_id(
        db,
        waiting_item_id
    )

    if waiting_item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ожидание не найдено"
        )

    return waiting_item

def get_waiting_feed(
    db: Session,
    *,
    project_id: int | None = None,
    waiting_status: WaitingItemStatus | None = None,
    reminder_due: bool = False
):
    if project_id is not None:
        project = get_project_by_id(
            db,
            project_id
        )

        if project is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Проект не найден"
            )

    return get_filtered_waiting_items(
        db=db,
        project_id=project_id,
        waiting_status=(
            waiting_status.value
            if waiting_status is not None
            else None
        ),
        reminder_due=reminder_due,
        today=date.today()
    )

def update_existing_waiting_item(
    db: Session,
    waiting_item_id: int,
    data: WaitingItemUpdate
):
    waiting_item = get_waiting_item(
        db=db,
        waiting_item_id=waiting_item_id
    )

    update_data = data.model_dump(
        exclude_unset=True
    )

    required_fields = {
        "title",
        "waiting_from",
        "requested_at",
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

    if "procurement_item_id" in update_data:
        validate_procurement_item(
            db=db,
            project_id=waiting_item.project_id,
            procurement_item_id=update_data[
                "procurement_item_id"
            ]
        )

    new_requested_at = update_data.get(
        "requested_at",
        waiting_item.requested_at
    )

    new_reminder_date = update_data.get(
        "next_reminder_date",
        waiting_item.next_reminder_date
    )

    if (
        new_reminder_date is not None
        and new_reminder_date < new_requested_at
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Дата напоминания не может быть раньше даты запроса"
        )

    from app.services.scheduling_service import validate_schedule
    schedule = {key: getattr(waiting_item, key) for key in ("due_at", "reminder_offsets", "assignee_ids")}
    if "next_reminder_date" in update_data and update_data["next_reminder_date"] != waiting_item.next_reminder_date and "due_at" not in update_data:
        update_data.update(due_at=None, reminder_offsets=[])
    schedule.update(update_data)
    validate_schedule(db, schedule, waiting_item.created_by_id)

    return update_waiting_item(
        db=db,
        waiting_item=waiting_item,
        update_data=update_data
    )

WAITING_STATUS_TRANSITIONS = {
    WaitingItemStatus.WAITING: {
        WaitingItemStatus.RESOLVED,
        WaitingItemStatus.CANCELLED,
    },

    WaitingItemStatus.RESOLVED: {
        WaitingItemStatus.WAITING,
    },

    WaitingItemStatus.CANCELLED: {
        WaitingItemStatus.WAITING,
    },
}

def change_waiting_item_status(
    db: Session,
    waiting_item_id: int,
    data: WaitingItemStatusUpdate
):
    waiting_item = get_waiting_item(
        db=db,
        waiting_item_id=waiting_item_id
    )

    current_status = WaitingItemStatus(
        waiting_item.status
    )

    new_status = data.status

    allowed_statuses = WAITING_STATUS_TRANSITIONS.get(
        current_status,
        set()
    )

    if new_status not in allowed_statuses:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Нельзя изменить статус "
                f"с '{current_status.value}' "
                f"на '{new_status.value}'"
            )
        )

    return update_waiting_item_status(
        db=db,
        waiting_item=waiting_item,
        new_status=new_status.value
    )