from datetime import date, datetime
from enum import Enum

from sqlalchemy import (
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class ProjectStageStatus(str, Enum):
    PLANNED = "planned"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"


class ProjectStage(Base):
    __tablename__ = "project_stages"

    __table_args__ = (
        UniqueConstraint(
            "project_id",
            "position",
            name="uq_project_stage_position"
        ),
    )

    id: Mapped[int] = mapped_column(
        primary_key=True
    )

    project_id: Mapped[int] = mapped_column(
        ForeignKey("projects.id"),
        nullable=False,
        index=True
    )

    name: Mapped[str] = mapped_column(
        String(150),
        nullable=False
    )

    position: Mapped[int] = mapped_column(
        Integer,
        nullable=False
    )

    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default=ProjectStageStatus.PLANNED.value
    )

    deadline: Mapped[date | None] = mapped_column(
        Date,
        nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )