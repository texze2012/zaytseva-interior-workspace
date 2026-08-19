from pydantic import BaseModel

from app.schemas.task import TaskRead


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