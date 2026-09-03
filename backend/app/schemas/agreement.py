from datetime import date, datetime

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
)


class AgreementCreate(BaseModel):
    procurement_item_id: int | None = None

    agreement_date: date | None = None

    with_whom: str = Field(
        min_length=2,
        max_length=255
    )

    decision: str = Field(
        min_length=2,
        max_length=5000
    )

    action: str | None = Field(
        default=None,
        max_length=5000
    )

    responsible_id: int | None = None

    deadline: date | None = None


class AgreementUpdate(BaseModel):
    procurement_item_id: int | None = None

    agreement_date: date | None = None

    with_whom: str | None = Field(
        default=None,
        min_length=2,
        max_length=255
    )

    decision: str | None = Field(
        default=None,
        min_length=2,
        max_length=5000
    )

    action: str | None = Field(
        default=None,
        max_length=5000
    )

    responsible_id: int | None = None

    deadline: date | None = None


class AgreementRead(BaseModel):
    id: int

    project_id: int
    procurement_item_id: int | None

    agreement_date: date

    with_whom: str
    decision: str
    action: str | None

    responsible_id: int | None
    deadline: date | None

    task_id: int | None

    created_by_id: int

    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )