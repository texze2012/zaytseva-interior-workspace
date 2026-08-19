from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.task import Task

def get_filtered_tasks(
    db: Session,
    *,
    project_id: int | None = None,
    assignee_id: int | None = None,
    task_status: str | None = None,
    period: str | None = None,
    today=None
) -> list[Task]:

    statement = select(Task)

    if project_id is not None:
        statement = statement.where(
            Task.project_id == project_id
        )

    if assignee_id is not None:
        statement = statement.where(
            Task.assignee_id == assignee_id
        )

    if task_status is not None:
        statement = statement.where(
            Task.status == task_status
        )

    if period == "today":
        statement = statement.where(
            Task.deadline == today,
            Task.status != "done"
        )

    elif period == "overdue":
        statement = statement.where(
            Task.deadline < today,
            Task.status != "done"
        )

    statement = statement.order_by(
        Task.deadline.asc().nulls_last(),
        Task.id.desc()
    )

    return list(
        db.scalars(statement).all()
    )

def create_task(
    db: Session,
    *,
    project_id: int,
    stage_id: int | None,
    title: str,
    description: str | None,
    priority: str,
    assignee_id: int,
    created_by_id: int,
    deadline
) -> Task:

    task = Task(
        project_id=project_id,
        stage_id=stage_id,
        title=title,
        description=description,
        priority=priority,
        assignee_id=assignee_id,
        created_by_id=created_by_id,
        deadline=deadline
    )

    db.add(task)
    db.commit()
    db.refresh(task)

    return task


def get_tasks_by_project(
    db: Session,
    project_id: int
) -> list[Task]:

    statement = (
        select(Task)
        .where(
            Task.project_id == project_id
        )
        .order_by(
            Task.id.desc()
        )
    )

    return list(
        db.scalars(statement).all()
    )


def get_task_by_id(
    db: Session,
    task_id: int
) -> Task | None:

    return db.get(
        Task,
        task_id
    )


def update_task(
    db: Session,
    task: Task,
    update_data: dict
) -> Task:

    for field, value in update_data.items():
        setattr(
            task,
            field,
            value
        )

    db.commit()
    db.refresh(task)

    return task

def update_task_status(
    db: Session,
    task: Task,
    new_status: str
) -> Task:

    task.status = new_status

    db.flush()

    return task