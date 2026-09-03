from datetime import datetime
from enum import Enum

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class AttachmentTargetType(str, Enum):
    TASK_COMMENT = "task_comment"
    PROCUREMENT_ITEM = "procurement_item"


class Attachment(Base):
    __tablename__ = "attachments"

    __table_args__ = (
        Index(
            "ix_attachments_target",
            "target_type",
            "target_id",
        ),
    )

    id: Mapped[int] = mapped_column(
        primary_key=True
    )

    target_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )

    target_id: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    original_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    stored_name: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False,
    )

    relative_path: Mapped[str] = mapped_column(
        String(500),
        unique=True,
        nullable=False,
    )

    content_type: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    size_bytes: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    uploaded_by_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    @property
    def file_url(self) -> str:
        return f"/attachments/{self.id}/file"