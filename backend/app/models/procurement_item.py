from datetime import date, datetime
from decimal import Decimal
from enum import Enum

from sqlalchemy import (
    Date,
    DateTime,
    ForeignKey,
    Numeric,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class ProcurementItemStatus(str, Enum):
    SELECTION = "selection"
    STUDIO_REVIEW = "studio_review"
    QUOTE_REQUESTED = "quote_requested"
    QUOTE_RECEIVED = "quote_received"
    APPROVAL = "approval"
    APPROVED = "approved"
    ORDERED = "ordered"
    IN_PRODUCTION = "in_production"
    IN_DELIVERY = "in_delivery"
    DELIVERED = "delivered"
    PROBLEM = "problem"
    COMPLETED = "completed"


class ProcurementItem(Base):
    __tablename__ = "procurement_items"

    id: Mapped[int] = mapped_column(
        primary_key=True
    )

    project_id: Mapped[int] = mapped_column(
        ForeignKey("projects.id"),
        nullable=False,
        index=True
    )

    room_id: Mapped[int | None] = mapped_column(ForeignKey("project_rooms.id"), nullable=True, index=True)
    sourcing_type: Mapped[str] = mapped_column(String(20), default="retail", server_default="retail")
    selected_variant_id: Mapped[int | None] = mapped_column(ForeignKey("procurement_variants.id", name="fk_procurement_selected_variant", use_alter=True, ondelete="SET NULL"), nullable=True)

    name: Mapped[str] = mapped_column(
        String(200),
        nullable=False
    )

    room: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True
    )

    category: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True
    )

    brand: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True
    )

    article: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True
    )

    product_url: Mapped[str | None] = mapped_column(
        String(1000),
        nullable=True
    )

    quantity: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        default=Decimal("1"),
        nullable=False
    )

    unit: Mapped[str] = mapped_column(
        String(30),
        default="шт.",
        nullable=False
    )

    unit_price: Mapped[Decimal | None] = mapped_column(
        Numeric(14, 2),
        nullable=True
    )

    currency: Mapped[str] = mapped_column(
        String(3),
        default="RUB",
        nullable=False
    )

    supplier_name: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True
    )

    status: Mapped[str] = mapped_column(
        String(50),
        default=ProcurementItemStatus.SELECTION.value,
        nullable=False,
        index=True
    )

    expected_delivery_date: Mapped[date | None] = mapped_column(
        Date,
        nullable=True,
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
    def total_amount(self) -> Decimal | None:
        if self.unit_price is None:
            return None

        return self.quantity * self.unit_price