from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field, computed_field
from app.schemas.scheduling import UTCDateTime, ReminderOffsets, schedule_revision


class EntryCreate(BaseModel):
    title: str = Field(min_length=2, max_length=200)
    description: str | None = None
    project_id: int | None = None
    due_at: UTCDateTime
    assignee_ids: list[int] = Field(min_length=1)
    reminder_offsets: ReminderOffsets = Field(default_factory=lambda: [0])


class EventCreate(EntryCreate):
    ends_at: UTCDateTime | None = None


class EntryUpdate(BaseModel):
    expected_revision: str | None = Field(default=None, pattern=r"^[0-9a-f]{64}$")
    title: str | None = Field(default=None, min_length=2, max_length=200)
    description: str | None = None
    project_id: int | None = None
    due_at: UTCDateTime | None = None
    assignee_ids: list[int] | None = None
    reminder_offsets: ReminderOffsets | None = None
    completed: bool | None = None


class EventUpdate(EntryUpdate):
    ends_at: UTCDateTime | None = None


class EntryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    description: str | None
    project_id: int | None
    due_at: datetime
    ends_at: datetime | None = None
    assignee_ids: list[int]
    reminder_offsets: list[int]
    completed: bool
    created_by_id: int

    @computed_field
    @property
    def revision(self) -> str:
        return schedule_revision(self)


class NotificationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    target_type: str
    target_id: int
    title: str
    due_at: datetime
    read_at: datetime | None
