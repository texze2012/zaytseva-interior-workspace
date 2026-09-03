from datetime import date, datetime

from sqlalchemy import (
    Date,
    DateTime,
    ForeignKey,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class Agreement(Base):
    __tablename__ = "agreements"

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

    agreement_date: Mapped[date] = mapped_column(
        Date,
        default=date.today,
        nullable=False,
        index=True
    )

    with_whom: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )

    decision: Mapped[str] = mapped_column(
        Text,
        nullable=False
    )

    action: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )

    responsible_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id"),
        nullable=True,
        index=True
    )

    deadline: Mapped[date | None] = mapped_column(
        Date,
        nullable=True,
        index=True
    )

    task_id: Mapped[int | None] = mapped_column(
        ForeignKey("tasks.id"),
        nullable=True,
        unique=True
    )

    created_by_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False
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