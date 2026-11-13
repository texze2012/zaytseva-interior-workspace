from datetime import date

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.payment import PaymentStatus
from app.models.procurement_item import ProcurementItemStatus
from app.models.project_stage import ProjectStageStatus
from app.models.task import TaskStatus
from app.models.user import User, UserRole
from app.models.waiting_item import WaitingItemStatus

from app.repositories.agreement_repository import (
    get_filtered_agreements,
)
from app.repositories.payment_repository import (
    get_filtered_payments,
)
from app.repositories.procurement_item_repository import (
    get_filtered_procurement_items,
)
from app.repositories.project_repository import (
    get_all_projects,
)
from app.repositories.project_stage_repository import (
    get_stages_by_deadline_range,
)
from app.repositories.task_repository import (
    get_filtered_tasks,
)
from app.repositories.waiting_item_repository import (
    get_filtered_waiting_items,
)

from app.schemas.calendar import (
    CalendarEventRead,
    CalendarEventType,
    CalendarRead,
)


def get_calendar(
    db: Session,
    current_user: User,
    *,
    date_from: date,
    date_to: date,
    assignee_id: int | None = None,
    timezone_name: str = "UTC",
    include_completed: bool = False
) -> CalendarRead:

    if date_to < date_from:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Конечная дата не может быть раньше начальной"
        )

    if (date_to - date_from).days > 366:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Период календаря не может превышать 366 дней"
        )

    from datetime import datetime
    from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
    from app.services.scheduling_service import aware
    try:
        zone = ZoneInfo(timezone_name)
    except (ZoneInfoNotFoundError, ValueError):
        raise HTTPException(400, "Неизвестный часовой пояс")
    today = datetime.now(zone).date()

    projects = get_all_projects(db)

    project_names = {
        project.id: project.name
        for project in projects
    }

    def project_name(
        project_id: int | None
    ) -> str:
        if project_id is None:
            return "Общая задача"

        return project_names.get(
            project_id,
            f"Проект #{project_id}"
        )

    events: list[CalendarEventRead] = []

    task_assignee_id = assignee_id

    tasks = get_filtered_tasks(
        db=db,
        assignee_id=task_assignee_id,
        due_from=date_from,
        due_to=date_to,
        today=today
    )

    for task in tasks:
        if (
            not include_completed
            and task.status == TaskStatus.DONE.value
        ):
            continue

        events.append(
            CalendarEventRead(
                id=f"task:{task.id}",
                event_type=CalendarEventType.TASK,
                event_date=task.deadline,
                title=task.title,
                subtitle="Задача",
                due_at=task.due_at,
                assignee_ids=task.assignee_ids,
                created_by_id=task.created_by_id,
                project_id=task.project_id,
                project_name=project_name(
                    task.project_id
                ),
                entity_id=task.id,
                status=task.status,
                priority=task.priority,
                is_overdue=(
                    task.deadline < today
                    and task.status
                    != TaskStatus.DONE.value
                )
            )
        )

    waiting_items = get_filtered_waiting_items(
        db=db,
        reminder_due=False,
        reminder_from=date_from,
        reminder_to=date_to,
        today=today
    )

    for waiting_item in waiting_items:
        if (
            not include_completed
            and waiting_item.status
            != WaitingItemStatus.WAITING.value
        ):
            continue

        events.append(
            CalendarEventRead(
                id=f"waiting:{waiting_item.id}",
                event_type=CalendarEventType.WAITING,
                event_date=(
                    waiting_item.next_reminder_date
                ),
                title=waiting_item.title,
                due_at=waiting_item.due_at,
                assignee_ids=waiting_item.assignee_ids or [waiting_item.created_by_id],
                subtitle=(
                    f"Ждём от: "
                    f"{waiting_item.waiting_from}"
                ),
                project_id=waiting_item.project_id,
                project_name=project_name(
                    waiting_item.project_id
                ),
                entity_id=waiting_item.id,
                procurement_item_id=(
                    waiting_item.procurement_item_id
                ),
                status=waiting_item.status,
                is_overdue=(
                    waiting_item.next_reminder_date
                    < today
                    and waiting_item.status
                    == WaitingItemStatus.WAITING.value
                )
            )
        )

    payments = get_filtered_payments(
        db=db,
        due_from=date_from,
        due_to=date_to,
        today=today
    )

    for payment in payments:
        if (
            not include_completed
            and payment.status
            != PaymentStatus.PENDING.value
        ):
            continue

        events.append(
            CalendarEventRead(
                id=f"payment:{payment.id}",
                event_type=CalendarEventType.PAYMENT,
                event_date=payment.due_date,
                title=payment.title,
                subtitle=payment.counterparty,
                project_id=payment.project_id,
                project_name=project_name(
                    payment.project_id
                ),
                entity_id=payment.id,
                procurement_item_id=(
                    payment.procurement_item_id
                ),
                status=payment.status,
                amount=payment.amount,
                currency=payment.currency,
                is_overdue=payment.is_overdue
            )
        )

    deliveries = get_filtered_procurement_items(
        db=db,
        delivery_from=date_from,
        delivery_to=date_to
    )

    for item in deliveries:
        if (
            not include_completed
            and item.status
            in {
                ProcurementItemStatus.DELIVERED.value,
                ProcurementItemStatus.COMPLETED.value,
            }
        ):
            continue

        events.append(
            CalendarEventRead(
                id=f"delivery:{item.id}",
                event_type=CalendarEventType.DELIVERY,
                event_date=(
                    item.expected_delivery_date
                ),
                title=f"Поставка: {item.name}",
                subtitle=item.supplier_name,
                project_id=item.project_id,
                project_name=project_name(
                    item.project_id
                ),
                entity_id=item.id,
                procurement_item_id=item.id,
                status=item.status,
                is_overdue=(
                    item.expected_delivery_date < today
                    and item.status
                    not in {
                        ProcurementItemStatus.DELIVERED.value,
                        ProcurementItemStatus.COMPLETED.value,
                    }
                )
            )
        )

    stages = get_stages_by_deadline_range(
        db=db,
        deadline_from=date_from,
        deadline_to=date_to
    )

    for stage in stages:
        if (
            not include_completed
            and stage.status
            == ProjectStageStatus.COMPLETED.value
        ):
            continue

        events.append(
            CalendarEventRead(
                id=f"stage:{stage.id}",
                event_type=(
                    CalendarEventType.PROJECT_STAGE
                ),
                event_date=stage.deadline,
                title=f"Этап: {stage.name}",
                subtitle="Дедлайн этапа проекта",
                project_id=stage.project_id,
                project_name=project_name(
                    stage.project_id
                ),
                entity_id=stage.id,
                status=stage.status,
                is_overdue=(
                    stage.deadline < today
                    and stage.status
                    != ProjectStageStatus.COMPLETED.value
                )
            )
        )

    agreements = get_filtered_agreements(
        db=db,
        deadline_from=date_from,
        deadline_to=date_to
    )

    for agreement in agreements:
        title = (
            agreement.action
            if agreement.action
            else agreement.decision
        )

        events.append(
            CalendarEventRead(
                id=f"agreement:{agreement.id}",
                event_type=(
                    CalendarEventType.AGREEMENT
                ),
                event_date=agreement.deadline,
                title=title,
                assignee_ids=[agreement.responsible_id] if agreement.responsible_id else [],
                subtitle=(
                    f"Договорённость с: "
                    f"{agreement.with_whom}"
                ),
                project_id=agreement.project_id,
                project_name=project_name(
                    agreement.project_id
                ),
                entity_id=agreement.id,
                procurement_item_id=(
                    agreement.procurement_item_id
                ),
                is_overdue=False
            )
        )

    from sqlalchemy import select
    from app.models.scheduling import Reminder, StudioEvent
    for model, kind in ((Reminder, CalendarEventType.REMINDER), (StudioEvent, CalendarEventType.EVENT)):
        for item in db.scalars(select(model)):
            event_date = aware(item.due_at).astimezone(zone).date()
            if not (date_from <= event_date <= date_to) or (item.completed and not include_completed):
                continue
            events.append(CalendarEventRead(id=f"{kind.value}:{item.id}", event_type=kind, event_date=event_date, title=item.title, project_id=item.project_id, project_name=project_names.get(item.project_id, "Студия"), entity_id=item.id, status="done" if item.completed else "planned", due_at=item.due_at, assignee_ids=item.assignee_ids, created_by_id=item.created_by_id, is_overdue=aware(item.due_at) < datetime.now(zone) and not item.completed))
    if assignee_id is not None:
        events = [event for event in events if assignee_id in event.assignee_ids]

    events.sort(
        key=lambda event: (
            event.event_date,
            event.due_at.isoformat() if event.due_at else "",
            event.event_type.value,
            event.title.lower()
        )
    )

    return CalendarRead(
        date_from=date_from,
        date_to=date_to,
        events=events
    )
