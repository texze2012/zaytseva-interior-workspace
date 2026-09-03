from datetime import date, datetime
from enum import Enum

from sqlalchemy import (
    Date,
    DateTime,
    ForeignKey,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class WaitingItemStatus(str, Enum):
    WAITING = "waiting"
    RESOLVED = "resolved"
    CANCELLED = "cancelled"


class WaitingItem(Base):
    __tablename__ = "waiting_items"

    id: Mapped[int] = mapped_column(
        primary_key=True
    )

    project_id: Mapped[int] = mapped_column(
        ForeignKey("projects.id"),
        nullable=False,
        index=True
    )

    procurement_item_id: Mapped[int | None] = mapped_column(
        ForeignKey("procurement_items.id"),
        nullable=True,
        index=True
    )

    title: Mapped[str] = mapped_column(
        String(200),
        nullable=False
    )

    waiting_from: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )

    requested_at: Mapped[date] = mapped_column(
        Date,
        default=date.today,
        nullable=False
    )

    next_reminder_date: Mapped[date | None] = mapped_column(
        Date,
        nullable=True,
        index=True
    )

    status: Mapped[str] = mapped_column(
        String(50),
        default=WaitingItemStatus.WAITING.value,
        nullable=False,
        index=True
    )

    notes: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )

    created_by_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False
    )

    resolved_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True
    )

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

    @property
    def is_reminder_due(self) -> bool:
        if self.status != WaitingItemStatus.WAITING.value:
            return False

        if self.next_reminder_date is None:
            return False

        return self.next_reminder_date <= date.today()