from datetime import date, datetime
from enum import Enum

from sqlalchemy import Date, DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class ProjectType(str, Enum):
    APARTMENT = "apartment"
    HOUSE = "house"
    TOWNHOUSE = "townhouse"
    APARTMENTS = "apartments"
    COMMERCIAL = "commercial"


class ProjectStatus(str, Enum):
    PLANNED = "planned"
    IN_PROGRESS = "in_progress"
    REVIEW = "review"
    COMPLETED = "completed"
    ARCHIVED = "archived"


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(
        primary_key=True
    )

    name: Mapped[str] = mapped_column(
        String(150),
        nullable=False
    )

    object_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False
    )

    area: Mapped[float] = mapped_column(
        Numeric(8, 2),
        nullable=False
    )

    city: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True
    )

    address: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True
    )

    client_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )

    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False
    )

    start_date: Mapped[date | None] = mapped_column(
        Date,
        nullable=True
    )

    deadline: Mapped[date | None] = mapped_column(
        Date,
        nullable=True
    )

    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )

    # Legacy value retained for migration compatibility, no longer assigned.
    responsible_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    cover_color: Mapped[str] = mapped_column(String(7), default="#c8b8a6", server_default="#c8b8a6")
    cover_attachment_id: Mapped[int | None] = mapped_column(ForeignKey("attachments.id", ondelete="SET NULL"), nullable=True)

    created_by_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )