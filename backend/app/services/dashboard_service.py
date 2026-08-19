from datetime import date

from sqlalchemy.orm import Session

from app.models.task import TaskStatus
from app.models.user import User, UserRole
from app.repositories.task_repository import (
    get_filtered_tasks,
)
from app.schemas.dashboard import (
    DashboardCounts,
    DashboardRead,
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