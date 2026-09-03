from pydantic import BaseModel

from app.schemas.task import TaskRead

from app.schemas.agreement import AgreementRead
from app.schemas.payment import (
    PaymentRead,
    PaymentSummaryRead,
)
from app.schemas.procurement_item import (
    ProcurementItemRead,
)
from app.schemas.task import TaskRead
from app.schemas.waiting_item import WaitingItemRead


class DashboardCounts(BaseModel):
    today: int
    overdue: int
    in_progress: int
    review: int


class DashboardRead(BaseModel):
    counts: DashboardCounts

    today: list[TaskRead]
    overdue: list[TaskRead]
    in_progress: list[TaskRead]
    review: list[TaskRead]

class ProcurementDashboardCounts(BaseModel):
    problem_items: int

    waiting: int
    reminders_due: int

    overdue_payments: int

    upcoming_deliveries: int

    today_tasks: int
    review_tasks: int

    recent_agreements: int

class DashboardProcurementItemRead(BaseModel):
    project_name: str
    item: ProcurementItemRead


class DashboardWaitingItemRead(BaseModel):
    project_name: str
    waiting_item: WaitingItemRead


class DashboardPaymentRead(BaseModel):
    project_name: str
    payment: PaymentRead


class DashboardTaskRead(BaseModel):
    project_name: str
    task: TaskRead


class DashboardAgreementRead(BaseModel):
    project_name: str
    agreement: AgreementRead

class ProcurementDashboardRead(BaseModel):
    counts: ProcurementDashboardCounts

    money: PaymentSummaryRead

    problem_items: list[
        DashboardProcurementItemRead
    ]

    reminders_due: list[
        DashboardWaitingItemRead
    ]

    overdue_payments: list[
        DashboardPaymentRead
    ]

    upcoming_deliveries: list[
        DashboardProcurementItemRead
    ]

    today_tasks: list[
        DashboardTaskRead
    ]

    review_tasks: list[
        DashboardTaskRead
    ]

    recent_agreements: list[
        DashboardAgreementRead
    ]