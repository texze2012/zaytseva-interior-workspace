from datetime import date, datetime
from typing import Literal
from pydantic import field_validator
from app.schemas.procurement_selection import safe_product_url
from decimal import Decimal

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
)

from app.models.procurement_item import (
    ProcurementItemStatus,
)


class ProcurementItemCreate(BaseModel):
    room_id: int | None = None
    sourcing_type: Literal["retail", "custom"] = "retail"
    _url = field_validator("product_url", check_fields=False)(safe_product_url)
    name: str = Field(
        min_length=2,
        max_length=200
    )

    room: str | None = Field(
        default=None,
        max_length=100
    )

    category: str | None = Field(
        default=None,
        max_length=100
    )

    brand: str | None = Field(
        default=None,
        max_length=100
    )

    article: str | None = Field(
        default=None,
        max_length=100
    )

    product_url: str | None = Field(
        default=None,
        max_length=1000
    )

    quantity: Decimal = Field(
        default=Decimal("1"),
        gt=0
    )

    unit: str = Field(
        default="шт.",
        min_length=1,
        max_length=30
    )

    unit_price: Decimal | None = Field(
        default=None,
        ge=0
    )

    currency: str = Field(
        default="RUB",
        min_length=3,
        max_length=3
    )

    supplier_name: str | None = Field(
        default=None,
        max_length=255
    )

    status: ProcurementItemStatus = (
        ProcurementItemStatus.SELECTION
    )

    expected_delivery_date: date | None = None

    notes: str | None = None


class ProcurementItemUpdate(BaseModel):
    room_id: int | None = None
    sourcing_type: Literal["retail", "custom"] | None = None
    _url = field_validator("product_url", check_fields=False)(safe_product_url)
    name: str | None = Field(
        default=None,
        min_length=2,
        max_length=200
    )

    room: str | None = Field(
        default=None,
        max_length=100
    )

    category: str | None = Field(
        default=None,
        max_length=100
    )

    brand: str | None = Field(
        default=None,
        max_length=100
    )

    article: str | None = Field(
        default=None,
        max_length=100
    )

    product_url: str | None = Field(
        default=None,
        max_length=1000
    )

    quantity: Decimal | None = Field(
        default=None,
        gt=0
    )

    unit: str | None = Field(
        default=None,
        min_length=1,
        max_length=30
    )

    unit_price: Decimal | None = Field(
        default=None,
        ge=0
    )

    currency: str | None = Field(
        default=None,
        min_length=3,
        max_length=3
    )

    supplier_name: str | None = Field(
        default=None,
        max_length=255
    )

    status: ProcurementItemStatus | None = None

    expected_delivery_date: date | None = None

    notes: str | None = None


class ProcurementItemRead(BaseModel):
    room_id: int | None
    sourcing_type: str
    selected_variant_id: int | None
    id: int
    project_id: int

    name: str
    room: str | None
    category: str | None
    brand: str | None
    article: str | None
    product_url: str | None

    quantity: Decimal
    unit: str

    unit_price: Decimal | None
    total_amount: Decimal | None
    currency: str

    supplier_name: str | None

    status: str

    expected_delivery_date: date | None

    notes: str | None

    created_by_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )