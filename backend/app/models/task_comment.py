from datetime import datetime

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class TaskComment(Base):
    __tablename__ = "task_comments"

    id: Mapped[int] = mapped_column(
        primary_key=True
    )

    task_id: Mapped[int] = mapped_column(
        ForeignKey("tasks.id"),
        nullable=False,
        index=True
    )

    author_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False,
        index=True
    )

    text: Mapped[str] = mapped_column(
        Text,
        nullable=False
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )