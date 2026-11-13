from datetime import datetime, timezone
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.api.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.models.scheduling import Reminder, StudioEvent, Notification
from app.schemas.scheduled_entry import EntryCreate, EntryUpdate, EventCreate, EventUpdate, EntryRead, NotificationRead
from app.services.scheduling_service import create_entry, update_entry, notifications_for

router = APIRouter(tags=["Scheduling"])
DB = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]


@router.get("/reminders", response_model=list[EntryRead])
def reminders(db: DB, user: CurrentUser, assignee_id: int | None = None, project_id: int | None = None):
    rows = db.scalars(select(Reminder).order_by(Reminder.due_at))
    return [r for r in rows if (assignee_id is None or assignee_id in r.assignee_ids) and (project_id is None or r.project_id == project_id)]


@router.post("/reminders", response_model=EntryRead, status_code=201)
def add_reminder(data: EntryCreate, db: DB, user: CurrentUser):
    return create_entry(db, Reminder, data, user)


@router.patch("/reminders/{entry_id}", response_model=EntryRead)
def edit_reminder(entry_id: int, data: EntryUpdate, db: DB, user: CurrentUser):
    return update_entry(db, Reminder, entry_id, data, user)


@router.get("/events", response_model=list[EntryRead])
def events(db: DB, user: CurrentUser):
    return list(db.scalars(select(StudioEvent).order_by(StudioEvent.due_at)))


@router.post("/events", response_model=EntryRead, status_code=201)
def add_event(data: EventCreate, db: DB, user: CurrentUser):
    return create_entry(db, StudioEvent, data, user)


@router.patch("/events/{entry_id}", response_model=EntryRead)
def edit_event(entry_id: int, data: EventUpdate, db: DB, user: CurrentUser):
    return update_entry(db, StudioEvent, entry_id, data, user)


@router.get("/notifications", response_model=list[NotificationRead])
def notifications(db: DB, user: CurrentUser):
    return notifications_for(db, user)


@router.patch("/notifications/{notification_id}/read", status_code=204)
def read_notification(notification_id: int, db: DB, user: CurrentUser):
    row = db.get(Notification, notification_id)
    if row is None or row.user_id != user.id:
        raise HTTPException(404, "Уведомление не найдено")
    row.read_at = datetime.now(timezone.utc)
    db.commit()
