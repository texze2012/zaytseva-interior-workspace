from datetime import datetime
from enum import Enum

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class ProcurementCheckpointPhase(str, Enum):
    BEFORE_ORDER = "before_order"
    AFTER_ORDER = "after_order"


class ProcurementCheckpointCode(str, Enum):
    ARTICLE_CHECKED = "article_checked"
    DIMENSIONS_CHECKED = "dimensions_checked"
    MATERIAL_CHECKED = "material_checked"
    QUANTITY_CHECKED = "quantity_checked"
    PRICE_CHECKED = "price_checked"

    QUOTE_RECEIVED = "quote_received"
    CLIENT_APPROVED = "client_approved"
    DELIVERY_TIME_CONFIRMED = "delivery_time_confirmed"
    INVOICE_RECEIVED = "invoice_received"
    PAYMENT_CONFIRMED = "payment_confirmed"

    ORDER_ACCEPTED = "order_accepted"
    SHIPMENT_CONFIRMED = "shipment_confirmed"
    DELIVERY_SCHEDULED = "delivery_scheduled"
    RECEIVED_ON_SITE = "received_on_site"
    ESTIMATE_UPDATED = "estimate_updated"
    SPECIFICATION_UPDATED = "specification_updated"


class ProcurementCheckpoint(Base):
    __tablename__ = "procurement_checkpoints"

    __table_args__ = (
        UniqueConstraint(
            "item_id",
            "code",
            name="uq_procurement_checkpoint_item_code",
        ),
    )

    id: Mapped[int] = mapped_column(
        primary_key=True
    )

    item_id: Mapped[int] = mapped_column(
        ForeignKey("procurement_items.id"),
        nullable=False,
        index=True,
    )

    code: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    label: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
    )

    phase: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )

    position: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    is_completed: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )

    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
    )

    completed_by_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id"),
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )