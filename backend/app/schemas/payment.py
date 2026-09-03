from datetime import date, datetime
from decimal import Decimal

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
)

from app.models.payment import (
    PaymentKind,
    PaymentStatus,
)


class PaymentCreate(BaseModel):
    procurement_item_id: int | None = None

    title: str = Field(
        min_length=2,
        max_length=200
    )

    kind: PaymentKind

    amount: Decimal = Field(
        gt=0
    )

    currency: str = Field(
        default="RUB",
        min_length=3,
        max_length=3
    )

    counterparty: str | None = Field(
        default=None,
        max_length=255
    )

    due_date: date | None = None

    notes: str | None = None


class PaymentUpdate(BaseModel):
    procurement_item_id: int | None = None

    title: str | None = Field(
        default=None,
        min_length=2,
        max_length=200
    )

    kind: PaymentKind | None = None

    amount: Decimal | None = Field(
        default=None,
        gt=0
    )

    currency: str | None = Field(
        default=None,
        min_length=3,
        max_length=3
    )

    counterparty: str | None = Field(
        default=None,
        max_length=255
    )

    due_date: date | None = None

    notes: str | None = None


class PaymentStatusUpdate(BaseModel):
    status: PaymentStatus

    paid_at: datetime | None = None


class PaymentRead(BaseModel):
    id: int

    project_id: int
    procurement_item_id: int | None

    title: str
    kind: str

    amount: Decimal
    currency: str

    counterparty: str | None

    status: str

    due_date: date | None
    paid_at: datetime | None

    is_overdue: bool

    notes: str | None

    created_by_id: int

    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )


class PaymentSummaryRead(BaseModel):
    currency: str

    client_expected: Decimal
    client_received: Decimal

    supplier_to_pay: Decimal
    supplier_paid: Decimal

    bonuses_received: Decimal

    overdue_count: int