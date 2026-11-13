from datetime import date, datetime
from enum import Enum

from sqlalchemy import (
    Date,
    JSON,
    Column,
    Table,
    DateTime,
    ForeignKey,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class TaskStatus(str, Enum):
    PLANNED = "planned"
    IN_PROGRESS = "in_progress"
    REVIEW = "review"
    DONE = "done"


class TaskPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


task_assignees = Table(
    "task_assignees", Base.metadata,
    Column("task_id", ForeignKey("tasks.id", ondelete="CASCADE"), primary_key=True),
    Column("user_id", ForeignKey("users.id"), primary_key=True),
)

class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(
        primary_key=True
    )

    project_id: Mapped[int | None] = mapped_column(
        ForeignKey("projects.id"),
        nullable=True,
        index=True,
    )

    stage_id: Mapped[int | None] = mapped_column(
        ForeignKey("project_stages.id"),
        nullable=True,
        index=True
    )

    title: Mapped[str] = mapped_column(
        String(200),
        nullable=False
    )

    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )

    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default=TaskStatus.PLANNED.value,
        index=True
    )

    priority: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default=TaskPriority.MEDIUM.value
    )

    assignee_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False,
        index=True
    )

    created_by_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False
    )

    deadline: Mapped[date | None] = mapped_column(
        Date,
        nullable=True
    )

    assignees: Mapped[list["User"]] = relationship("User", secondary=task_assignees, lazy="selectin")
    due_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    reminder_offsets: Mapped[list[int]] = mapped_column(JSON, default=list, server_default="[]")

    @property
    def assignee_ids(self) -> list[int]:
        return [u.id for u in self.assignees] or [self.assignee_id]

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )
