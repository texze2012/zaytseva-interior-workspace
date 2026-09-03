from datetime import date, datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field

from app.models.task import (
    TaskPriority,
    TaskStatus,
)



class TaskPeriod(str, Enum):
    TODAY = "today"
    OVERDUE = "overdue"

class TaskCreate(BaseModel):
    project_id: int | None = None
    stage_id: int | None = None

    title: str
    description: str | None = None

    priority: TaskPriority = TaskPriority.MEDIUM
    assignee_id: int

    deadline: date | None = None


class TaskUpdate(BaseModel):
    title: str | None = Field(
        default=None,
        min_length=2,
        max_length=200
    )

    description: str | None = None

    stage_id: int | None = None

    priority: TaskPriority | None = None

    assignee_id: int | None = None

    deadline: date | None = None

class TaskStatusUpdate(BaseModel):
    status: TaskStatus

    comment: str | None = Field(
        default=None,
        min_length=1,
        max_length=5000
    )

class TaskRead(BaseModel):
    id: int
    project_id: int | None
    stage_id: int | None

    title: str
    description: str | None

    status: str
    priority: str

    assignee_id: int
    created_by_id: int

    deadline: date | None

    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )