from datetime import date
from decimal import Decimal
from enum import Enum

from pydantic import BaseModel


class CalendarEventType(str, Enum):
    TASK = "task"
    WAITING = "waiting"
    PAYMENT = "payment"
    DELIVERY = "delivery"
    PROJECT_STAGE = "project_stage"
    AGREEMENT = "agreement"


class CalendarEventRead(BaseModel):
    id: str

    event_type: CalendarEventType
    event_date: date

    title: str
    subtitle: str | None = None

    project_id: int | None
    project_name: str

    entity_id: int
    procurement_item_id: int | None = None

    status: str | None = None
    priority: str | None = None

    amount: Decimal | None = None
    currency: str | None = None

    is_overdue: bool = False


class CalendarRead(BaseModel):
    date_from: date
    date_to: date

    events: list[CalendarEventRead]