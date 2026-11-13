from datetime import datetime
from decimal import Decimal
from typing import Literal
from urllib.parse import urlsplit
from pydantic import BaseModel, ConfigDict, Field, field_validator


def safe_product_url(value):
    if value is None or not value.strip():
        return None
    value = value.strip()
    parsed = urlsplit(value)
    if parsed.scheme.lower() not in {"http", "https"} or not parsed.hostname or parsed.username or parsed.password:
        raise ValueError("Укажите ссылку http:// или https:// без логина и пароля")
    return value


class RoomCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)


class RoomRead(RoomCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    project_id: int


class VariantWrite(BaseModel):
    title: str = Field(min_length=2, max_length=200)
    product_url: str | None = Field(default=None, max_length=1000)
    brand: str | None = Field(default=None, max_length=100)
    article: str | None = Field(default=None, max_length=100)
    supplier_name: str | None = Field(default=None, max_length=255)
    unit_price: Decimal | None = Field(default=None, ge=0, lt=10**12)
    currency: str = Field(default="RUB", pattern=r"^[A-Z]{3}$")
    notes: str | None = Field(default=None, max_length=10000)

    _url = field_validator("product_url")(safe_product_url)

    @field_validator("title")
    @classmethod
    def title_not_blank(cls, value):
        if len(value.strip()) < 2:
            raise ValueError("Введите название варианта")
        return value.strip()


class VariantRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    item_id: int
    title: str
    product_url: str | None
    brand: str | None
    article: str | None
    supplier_name: str | None
    unit_price: Decimal | None
    currency: str
    notes: str | None
    status: str
    reviewer_note: str | None
    reviewed_by_id: int | None
    reviewed_at: datetime | None


class VariantDecision(BaseModel):
    status: Literal["studio_review", "shortlisted", "rejected", "selected", "candidate"]
    reviewer_note: str | None = Field(default=None, max_length=5000)
