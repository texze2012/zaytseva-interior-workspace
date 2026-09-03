from datetime import date, timedelta

from sqlalchemy.orm import Session

from app.models.procurement_item import ProcurementItemStatus
from app.models.task import TaskStatus
from app.models.user import User, UserRole
from app.models.waiting_item import WaitingItemStatus

from app.repositories.agreement_repository import (
    get_filtered_agreements,
)
from app.repositories.payment_repository import (
    get_filtered_payments,
)
from app.repositories.procurement_item_repository import (
    get_filtered_procurement_items,
)
from app.repositories.project_repository import (
    get_all_projects,
)
from app.repositories.task_repository import (
    get_filtered_tasks,
)
from app.repositories.waiting_item_repository import (
    get_filtered_waiting_items,
)

from app.schemas.agreement import AgreementRead
from app.schemas.dashboard import (
    DashboardAgreementRead,
    DashboardCounts,
    DashboardPaymentRead,
    DashboardProcurementItemRead,
    DashboardRead,
    DashboardTaskRead,
    DashboardWaitingItemRead,
    ProcurementDashboardCounts,
    ProcurementDashboardRead,
)
from app.schemas.payment import PaymentRead
from app.schemas.procurement_item import ProcurementItemRead
from app.schemas.task import TaskRead
from app.schemas.waiting_item import WaitingItemRead

from app.services.payment_service import (
    get_payment_summary,
)


def get_dashboard(
    db: Session,
    current_user: User
) -> DashboardRead:

    today_date = date.today()

    assignee_id = None

    if current_user.role == UserRole.DESIGNER.value:
        assignee_id = current_user.id

    today_tasks = get_filtered_tasks(
        db=db,
        assignee_id=assignee_id,
        period="today",
        today=today_date
    )

    overdue_tasks = get_filtered_tasks(
        db=db,
        assignee_id=assignee_id,
        period="overdue",
        today=today_date
    )

    in_progress_tasks = get_filtered_tasks(
        db=db,
        assignee_id=assignee_id,
        task_status=TaskStatus.IN_PROGRESS.value,
        today=today_date
    )

    review_tasks = get_filtered_tasks(
        db=db,
        assignee_id=assignee_id,
        task_status=TaskStatus.REVIEW.value,
        today=today_date
    )

    return DashboardRead(
        counts=DashboardCounts(
            today=len(today_tasks),
            overdue=len(overdue_tasks),
            in_progress=len(in_progress_tasks),
            review=len(review_tasks)
        ),
        today=today_tasks,
        overdue=overdue_tasks,
        in_progress=in_progress_tasks,
        review=review_tasks
    )

def get_procurement_dashboard(
    db: Session,
    current_user: User
) -> ProcurementDashboardRead:

    today = date.today()

    delivery_until = (
        today + timedelta(days=30)
    )

    agreements_from = (
        today - timedelta(days=6)
    )

    projects = get_all_projects(db)

    project_names = {
        project.id: project.name
        for project in projects
    }

    def get_project_name(
            project_id: int | None
    ) -> str:
        if project_id is None:
            return "Общая задача"

        return project_names.get(
            project_id,
            f"Проект #{project_id}"
        )

    # -------------------------
    # Комплектация
    # -------------------------

    problem_items = (
        get_filtered_procurement_items(
            db=db,
            item_status=(
                ProcurementItemStatus.PROBLEM.value
            )
        )
    )

    upcoming_deliveries = (
        get_filtered_procurement_items(
            db=db,
            delivery_from=today,
            delivery_to=delivery_until,
            exclude_delivered=True
        )
    )

    # -------------------------
    # Жду
    # -------------------------

    waiting_items = get_filtered_waiting_items(
        db=db,
        waiting_status=(
            WaitingItemStatus.WAITING.value
        ),
        reminder_due=False,
        today=today
    )

    reminders_due = get_filtered_waiting_items(
        db=db,
        waiting_status=(
            WaitingItemStatus.WAITING.value
        ),
        reminder_due=True,
        today=today
    )

    # -------------------------
    # Деньги
    # -------------------------

    overdue_payments = get_filtered_payments(
        db=db,
        overdue=True,
        today=today
    )

    money = get_payment_summary(
        db=db,
        currency="RUB"
    )

    # -------------------------
    # Задачи
    # -------------------------

    task_assignee_id = None

    if (
        current_user.role
        == UserRole.DESIGNER.value
    ):
        task_assignee_id = current_user.id

    today_tasks = get_filtered_tasks(
        db=db,
        assignee_id=task_assignee_id,
        period="today",
        today=today
    )

    review_tasks = get_filtered_tasks(
        db=db,
        assignee_id=task_assignee_id,
        task_status=TaskStatus.REVIEW.value,
        today=today
    )

    # -------------------------
    # Договорённости
    # -------------------------

    recent_agreements = get_filtered_agreements(
        db=db,
        agreement_from=agreements_from,
        agreement_to=today
    )

    # -------------------------
    # Ответ
    # -------------------------

    return ProcurementDashboardRead(
        counts=ProcurementDashboardCounts(
            problem_items=len(problem_items),
            waiting=len(waiting_items),
            reminders_due=len(reminders_due),
            overdue_payments=len(
                overdue_payments
            ),
            upcoming_deliveries=len(
                upcoming_deliveries
            ),
            today_tasks=len(today_tasks),
            review_tasks=len(review_tasks),
            recent_agreements=len(
                recent_agreements
            ),
        ),

        money=money,

        problem_items=[
            DashboardProcurementItemRead(
                project_name=get_project_name(
                    item.project_id
                ),
                item=ProcurementItemRead.model_validate(
                    item
                )
            )
            for item in problem_items[:10]
        ],

        reminders_due=[
            DashboardWaitingItemRead(
                project_name=get_project_name(
                    waiting_item.project_id
                ),
                waiting_item=(
                    WaitingItemRead.model_validate(
                        waiting_item
                    )
                )
            )
            for waiting_item in reminders_due[:10]
        ],

        overdue_payments=[
            DashboardPaymentRead(
                project_name=get_project_name(
                    payment.project_id
                ),
                payment=PaymentRead.model_validate(
                    payment
                )
            )
            for payment in overdue_payments[:10]
        ],

        upcoming_deliveries=[
            DashboardProcurementItemRead(
                project_name=get_project_name(
                    item.project_id
                ),
                item=ProcurementItemRead.model_validate(
                    item
                )
            )
            for item in upcoming_deliveries[:10]
        ],

        today_tasks=[
            DashboardTaskRead(
                project_name=get_project_name(
                    task.project_id
                ),
                task=TaskRead.model_validate(
                    task
                )
            )
            for task in today_tasks[:10]
        ],

        review_tasks=[
            DashboardTaskRead(
                project_name=get_project_name(
                    task.project_id
                ),
                task=TaskRead.model_validate(
                    task
                )
            )
            for task in review_tasks[:10]
        ],

        recent_agreements=[
            DashboardAgreementRead(
                project_name=get_project_name(
                    agreement.project_id
                ),
                agreement=AgreementRead.model_validate(
                    agreement
                )
            )
            for agreement
            in recent_agreements[:10]
        ]
    )