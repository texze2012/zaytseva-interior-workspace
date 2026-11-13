from datetime import date, datetime

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
)

from app.schemas.scheduling import UTCDateTime, ReminderOffsets

from app.models.waiting_item import WaitingItemStatus


class WaitingItemCreate(BaseModel):
    title: str = Field(
        min_length=2,
        max_length=200
    )

    waiting_from: str = Field(
        min_length=2,
        max_length=255
    )

    procurement_item_id: int | None = None

    requested_at: date | None = None

    next_reminder_date: date | None = None

    due_at: UTCDateTime | None = None
    reminder_offsets: ReminderOffsets = Field(default_factory=list)
    assignee_ids: list[int] = Field(default_factory=list)
    notes: str | None = None


class WaitingItemUpdate(BaseModel):
    title: str | None = Field(
        default=None,
        min_length=2,
        max_length=200
    )

    waiting_from: str | None = Field(
        default=None,
        min_length=2,
        max_length=255
    )

    procurement_item_id: int | None = None

    requested_at: date | None = None

    next_reminder_date: date | None = None

    due_at: UTCDateTime | None = None
    reminder_offsets: ReminderOffsets = Field(default_factory=list)
    assignee_ids: list[int] = Field(default_factory=list)
    notes: str | None = None


class WaitingItemStatusUpdate(BaseModel):
    status: WaitingItemStatus


class WaitingItemRead(BaseModel):
    id: int

    project_id: int
    procurement_item_id: int | None

    title: str
    waiting_from: str

    requested_at: date
    next_reminder_date: date | None

    status: str
    is_reminder_due: bool

    due_at: datetime | None = None
    reminder_offsets: list[int] = Field(default_factory=list)
    assignee_ids: list[int] = Field(default_factory=list)
    notes: str | None

    created_by_id: int
    resolved_at: datetime | None

    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )