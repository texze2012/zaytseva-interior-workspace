from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from datetime import date, timezone

from app.models.user import User, UserRole
from app.repositories.project_repository import (
    get_project_by_id,
)
from app.repositories.project_stage_repository import (
    get_stage_by_id,
)
from app.repositories.task_repository import (
    create_task,
    get_filtered_tasks,
    get_task_by_id,
    get_task_by_id_for_update,
    get_tasks_by_project,
    update_task,
    update_task_status,
)
from app.repositories.user_repository import (
    get_user_by_id,
)
from app.schemas.task import (
    TaskCreate,
    TaskStatusUpdate,
    TaskUpdate,
    TaskPeriod,
)
from app.models.task import TaskStatus
from app.repositories.task_comment_repository import (
    create_comment,
)

DESIGNER_STATUS_TRANSITIONS = {
    TaskStatus.PLANNED: {
        TaskStatus.IN_PROGRESS,
    },
    TaskStatus.IN_PROGRESS: {
        TaskStatus.REVIEW,
    },
}


OWNER_STATUS_TRANSITIONS = {
    TaskStatus.PLANNED: {
        TaskStatus.IN_PROGRESS,
    },
    TaskStatus.IN_PROGRESS: {
        TaskStatus.REVIEW,
    },
    TaskStatus.REVIEW: {
        TaskStatus.DONE,
        TaskStatus.IN_PROGRESS,
    },
}

def get_task_feed(
    db: Session,
    current_user: User,
    *,
    project_id: int | None = None,
    task_status: TaskStatus | None = None,
    period: TaskPeriod | None = None,
    mine: bool = False,
    assignee_id: int | None = None
):
    if project_id is not None:
        project = get_project_by_id(
            db,
            project_id
        )

        if project is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Проект не найден"
            )

    if mine:
        assignee_id = current_user.id

    today = date.today()

    return get_filtered_tasks(
        db=db,
        project_id=project_id,
        assignee_id=assignee_id,
        task_status=(
            task_status.value
            if task_status is not None
            else None
        ),
        period=(
            period.value
            if period is not None
            else None
        ),
        today=today
    )

def allowed_task_transitions(task, current_user: User):
    if current_user.role == UserRole.DESIGNER.value:
        if current_user.id not in task.assignee_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Можно менять статус только своих задач"
            )

        allowed_transitions = (
            DESIGNER_STATUS_TRANSITIONS
        )

    elif current_user.role == UserRole.OWNER.value:
        allowed_transitions = (
            OWNER_STATUS_TRANSITIONS
        )

    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав"
        )

    return allowed_transitions


def validate_task_status_transition(task, data: TaskStatusUpdate, current_user: User):
    current_status = TaskStatus(task.status)
    new_status = data.status
    allowed_transitions = allowed_task_transitions(task, current_user)

    allowed_statuses = allowed_transitions.get(
        current_status,
        set()
    )

    if new_status not in allowed_statuses:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Нельзя изменить статус "
                f"с '{current_status.value}' "
                f"на '{new_status.value}'"
            )
        )

    is_return_to_work = (
        current_status == TaskStatus.REVIEW
        and new_status == TaskStatus.IN_PROGRESS
    )

    if is_return_to_work:
        if (
            data.comment is None
            or not data.comment.strip()
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="При возврате задачи укажите причину"
            )


def change_task_status_core(
    db: Session,
    task,
    data: TaskStatusUpdate,
    current_user: User
):
    task = get_task_by_id_for_update(db, task.id)
    if task is None:
        raise HTTPException(404, "Задача не найдена")
    validate_task_status_transition(task, data, current_user)
    new_status = data.status
    try:
        task = update_task_status(
            db=db,
            task=task,
            new_status=new_status.value
        )

        if data.comment is not None:
            comment_text = data.comment.strip()

            if comment_text:
                create_comment(
                    db=db,
                    task_id=task.id,
                    author_id=current_user.id,
                    text=comment_text
                )

        db.commit()
        db.refresh(task)

        return task

    except Exception:
        db.rollback()
        raise


def change_project_task_status(
    db: Session,
    project_id: int,
    task_id: int,
    data: TaskStatusUpdate,
    current_user: User
):
    task = get_project_task(
        db=db,
        project_id=project_id,
        task_id=task_id
    )

    return change_task_status_core(
        db=db,
        task=task,
        data=data,
        current_user=current_user
    )


def change_global_task_status(
    db: Session,
    task_id: int,
    data: TaskStatusUpdate,
    current_user: User
):
    task = get_task(
        db=db,
        task_id=task_id
    )

    return change_task_status_core(
        db=db,
        task=task,
        data=data,
        current_user=current_user
    )

def validate_task_data(db, values, project_id):
    from app.models.user import User
    if project_id is not None and get_project_by_id(db, project_id) is None:
        raise HTTPException(404, "Проект не найден")
    if values.get("stage_id") is not None:
        stage = get_stage_by_id(db, values["stage_id"])
        if stage is None or stage.project_id != project_id:
            raise HTTPException(400, "Этап не принадлежит этому проекту")
    ids = values.pop("assignee_ids", None)
    if ids is None:
        ids = [values["assignee_id"]] if values.get("assignee_id") else []
    ids = list(dict.fromkeys(ids))
    if not ids:
        raise HTTPException(400, "Выберите хотя бы одного исполнителя")
    people = [db.get(User, uid) for uid in ids]
    if any(person is None for person in people):
        raise HTTPException(400, "Исполнитель не найден")
    values["assignees"] = people
    values["assignee_id"] = ids[0]
    if values.get("reminder_offsets") and not values.get("due_at"):
        raise HTTPException(400, "Для напоминаний укажите дату и точное время")
    if values.get("due_at") and not values.get("deadline"):
        raise HTTPException(400, "Для точного времени укажите дату дедлайна")
    if hasattr(values.get("priority"), "value"):
        values["priority"] = values["priority"].value
    return values

def create_new_task(db, project_id, data, current_user):
    from app.models.task import Task
    values = data.model_dump(exclude={"project_id"})
    if not values["assignee_ids"] and data.assignee_id:
        values["assignee_ids"] = [data.assignee_id]
    task = Task(project_id=project_id, created_by_id=current_user.id,
                **validate_task_data(db, values, project_id))
    db.add(task)
    db.commit()
    db.refresh(task)
    return task

def create_global_task(db, data, current_user):
    return create_new_task(db, data.project_id, data, current_user)

def get_project_tasks(
    db: Session,
    project_id: int
):
    project = get_project_by_id(
        db,
        project_id
    )

    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Проект не найден"
        )

    return get_tasks_by_project(
        db,
        project_id
    )

def get_task(
    db: Session,
    task_id: int
):
    task = get_task_by_id(
        db,
        task_id
    )

    if task is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Задача не найдена"
        )

    return task

def get_project_task(
    db: Session,
    project_id: int,
    task_id: int
):
    task = get_task_by_id(
        db,
        task_id
    )

    if (
        task is None
        or task.project_id != project_id
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Задача не найдена"
        )

    return task

def require_task_editor(task, user):
    if user.role != UserRole.OWNER.value and user.id not in task.assignee_ids and user.id != task.created_by_id:
        raise HTTPException(403, "Изменять задачу могут исполнители, автор и руководитель")

def update_existing_task(db, project_id, task_id, data, current_user=None):
    task = get_task_by_id_for_update(db, task_id)
    if task is None or (project_id is not None and task.project_id != project_id):
        raise HTTPException(404, "Задача не найдена")
    if current_user is not None:
        require_task_editor(task, current_user)
    if data.expected_updated_at is not None:
        expected = data.expected_updated_at
        expected = expected.astimezone(timezone.utc).replace(tzinfo=None) if expected.tzinfo else expected
        actual = task.updated_at
        actual = actual.astimezone(timezone.utc).replace(tzinfo=None) if actual.tzinfo else actual
        if expected != actual:
            db.rollback()
            raise HTTPException(409, "Задача уже изменилась. Обновите её и повторите действие.")
    changes = data.model_dump(exclude_unset=True, exclude={"expected_updated_at"})
    for key in ("title", "priority", "assignee_ids", "assignee_id", "reminder_offsets"):
        if key in changes and changes[key] is None:
            raise HTTPException(400, f"Поле {key} не может быть пустым")
    values = {key: getattr(task, key) for key in ("title", "description", "stage_id", "priority", "assignee_id", "deadline", "due_at", "reminder_offsets")}
    values["assignee_ids"] = task.assignee_ids
    if "assignee_id" in changes and "assignee_ids" not in changes:
        changes["assignee_ids"] = [changes["assignee_id"]]
    # A legacy date-only client may move a task; clear the obsolete exact schedule.
    if "deadline" in changes and changes["deadline"] != task.deadline and "due_at" not in changes:
        changes.update(due_at=None, reminder_offsets=[])
    if changes.get("due_at", task.due_at) is None and "reminder_offsets" not in changes:
        changes["reminder_offsets"] = []
    values.update(changes)
    return update_task(db, task, validate_task_data(db, values, task.project_id))

def delete_existing_task(db, task_id, current_user, project_id=None):
    from sqlalchemy import select, delete, update, and_, or_
    from app.models.task_comment import TaskComment
    from app.models.attachment import Attachment
    from app.models.agreement import Agreement
    from app.models.scheduling import Notification
    from app.core.storage import delete_upload_file
    task = get_task(db, task_id)
    if project_id is not None and task.project_id != project_id:
        raise HTTPException(404, "Задача не найдена")
    require_task_editor(task, current_user)
    comment_ids = select(TaskComment.id).where(TaskComment.task_id == task_id)
    files = list(db.scalars(select(Attachment).where(or_(and_(Attachment.target_type == "task", Attachment.target_id == task_id), and_(Attachment.target_type == "task_comment", Attachment.target_id.in_(comment_ids))))))
    paths = [f.relative_path for f in files]
    for f in files:
        db.delete(f)
    db.execute(delete(TaskComment).where(TaskComment.task_id == task_id))
    db.execute(update(Agreement).where(Agreement.task_id == task_id).values(task_id=None))
    db.execute(delete(Notification).where(Notification.target_type == "task", Notification.target_id == task_id))
    db.delete(task)
    db.commit()
    for path in paths:
        delete_upload_file(path)
