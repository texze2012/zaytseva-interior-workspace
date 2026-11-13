from datetime import datetime, timedelta, timezone
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from app.models.project import Project
from app.models.user import User
from app.models.task import Task
from app.models.waiting_item import WaitingItem
from app.models.scheduling import Reminder, StudioEvent, Notification
from app.schemas.scheduling import schedule_revision


def aware(value):
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)


def validate_schedule(db, values, default_user_id):
    ids = list(dict.fromkeys(values.get("assignee_ids") or [default_user_id]))
    if any(db.get(User, uid) is None for uid in ids):
        raise HTTPException(400, "Исполнитель не найден")
    values["assignee_ids"] = ids
    if values.get("reminder_offsets") and not values.get("due_at"):
        raise HTTPException(400, "Для напоминаний укажите точное время")
    if values.get("ends_at") and aware(values["ends_at"]) <= aware(values["due_at"]):
        raise HTTPException(400, "Окончание должно быть позже начала")
    if values.get("project_id") is not None and db.get(Project, values["project_id"]) is None:
        raise HTTPException(404, "Проект не найден")


def require_editor(entry, user):
    if user.role != "owner" and user.id not in entry.assignee_ids and user.id != entry.created_by_id:
        raise HTTPException(403, "Изменять запись могут участники, автор и руководитель")


def create_entry(db, model, data, user):
    values = data.model_dump()
    validate_schedule(db, values, user.id)
    entry = model(**values, created_by_id=user.id)
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


def update_entry(db, model, entry_id, data, user):
    entry = db.scalar(select(model).where(model.id == entry_id).with_for_update().execution_options(populate_existing=True))
    if entry is None:
        raise HTTPException(404, "Запись не найдена")
    if data.expected_revision is not None and data.expected_revision != schedule_revision(entry):
        db.rollback()
        raise HTTPException(409, "Запись уже изменилась. Обновите её и повторите действие.")
    require_editor(entry, user)
    changes = data.model_dump(exclude_unset=True, exclude={"expected_revision"})
    for key in ("title", "due_at", "assignee_ids", "reminder_offsets", "completed"):
        if key in changes and changes[key] is None:
            raise HTTPException(400, f"Поле {key} не может быть пустым")
    if "assignee_ids" in changes and not changes["assignee_ids"]:
        raise HTTPException(400, "Выберите хотя бы одного участника")
    values = {key: getattr(entry, key) for key in ("due_at", "assignee_ids", "reminder_offsets", "project_id")}
    if model is StudioEvent:
        values["ends_at"] = entry.ends_at
    values.update(changes)
    validate_schedule(db, values, user.id)
    for key, value in changes.items():
        setattr(entry, key, value)
    db.commit()
    db.refresh(entry)
    return entry


def active_sources(db):
    for model, kind, condition in (
        (Task, "task", Task.status != "done"),
        (WaitingItem, "waiting", WaitingItem.status == "waiting"),
        (Reminder, "reminder", Reminder.completed.is_(False)),
        (StudioEvent, "event", StudioEvent.completed.is_(False)),
    ):
        for item in db.scalars(select(model).where(condition, model.due_at.is_not(None))):
            yield kind, item


def materialize_notifications(db, now=None):
    """Durable, per-recipient delivery. Safe for concurrent API/worker polling.

    The schedule key includes the instant and offset, so rescheduling invalidates
    old alerts and creates exactly one delivery for each new occurrence.
    """
    now = aware(now or datetime.now(timezone.utc))
    for kind, item in active_sources(db):
        anchor = aware(item.due_at)
        for offset in item.reminder_offsets:
            fire_at = anchor - timedelta(minutes=offset)
            if fire_at > now:
                continue
            key = f"{anchor.isoformat()}:{offset}"
            for uid in item.assignee_ids or [item.created_by_id]:
                exists = db.scalar(select(Notification.id).where(Notification.user_id == uid, Notification.target_type == kind, Notification.target_id == item.id, Notification.schedule_key == key))
                if exists:
                    continue
                try:
                    with db.begin_nested():
                        db.add(Notification(user_id=uid, target_type=kind, target_id=item.id, schedule_key=key, title=item.title, due_at=fire_at))
                        db.flush()
                except IntegrityError:
                    pass  # another worker delivered this same occurrence
    db.commit()


def notifications_for(db, user):
    materialize_notifications(db)
    # Hide stale alerts after moving/completing a source or changing its recipients.
    active = {}
    for kind, item in active_sources(db):
        if user.id in (item.assignee_ids or [item.created_by_id]):
            active[(kind, item.id)] = {f"{aware(item.due_at).isoformat()}:{offset}" for offset in item.reminder_offsets}
    rows = db.scalars(select(Notification).where(Notification.user_id == user.id, Notification.read_at.is_(None)).order_by(Notification.due_at.desc()))
    return [row for row in rows if row.schedule_key in active.get((row.target_type, row.target_id), set())]
