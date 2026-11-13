from datetime import date, datetime, timedelta
from sqlalchemy import select, or_
from sqlalchemy.orm import Session

from app.models.task import Task

def get_filtered_tasks(
    db: Session,
    *,
    project_id: int | None = None,
    assignee_id: int | None = None,
    task_status: str | None = None,
    period: str | None = None,
    due_from: date | None = None,
    due_to: date | None = None,
    today=None
) -> list[Task]:

    statement = select(Task)

    if project_id is not None:
        statement = statement.where(
            Task.project_id == project_id
        )

    if assignee_id is not None:
        statement = statement.where(
            or_(Task.assignee_id == assignee_id, Task.assignees.any(id=assignee_id))
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

    if due_from is not None:
        statement = statement.where(
            Task.deadline >= due_from
        )

    if due_to is not None:
        statement = statement.where(
            Task.deadline <= due_to
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
    project_id: int | None,
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


def get_task_by_id_for_update(db: Session, task_id: int) -> Task | None:
    # Refresh both the scalar fields and select-in assignees after taking the lock.
    return db.scalar(select(Task).where(Task.id == task_id).with_for_update().execution_options(populate_existing=True))


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

    # Relationship-only assignment changes must also invalidate an outstanding undo.
    task.updated_at = max(datetime.utcnow(), task.updated_at + timedelta(microseconds=1))

    db.commit()
    db.refresh(task)

    return task

def update_task_status(
    db: Session,
    task: Task,
    new_status: str
) -> Task:

    task.status = new_status
    task.updated_at = max(datetime.utcnow(), task.updated_at + timedelta(microseconds=1))

    db.flush()

    return task
