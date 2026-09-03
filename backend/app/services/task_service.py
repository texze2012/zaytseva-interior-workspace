from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from datetime import date

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
    mine: bool = False
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

    assignee_id = None

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

def change_task_status_core(
    db: Session,
    task,
    data: TaskStatusUpdate,
    current_user: User
):
    current_status = TaskStatus(
        task.status
    )

    new_status = data.status

    if current_user.role == UserRole.DESIGNER.value:
        if task.assignee_id != current_user.id:
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

def create_new_task(
    db: Session,
    project_id: int,
    data: TaskCreate,
    current_user: User
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

    if data.stage_id is not None:
        stage = get_stage_by_id(
            db,
            data.stage_id
        )

        if (
            stage is None
            or stage.project_id != project_id
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Этап не принадлежит этому проекту"
            )

    assignee = get_user_by_id(
        db,
        data.assignee_id
    )

    if assignee is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Исполнитель не найден"
        )

    return create_task(
        db=db,
        project_id=project_id,
        stage_id=data.stage_id,
        title=data.title,
        description=data.description,
        priority=data.priority.value,
        assignee_id=data.assignee_id,
        created_by_id=current_user.id,
        deadline=data.deadline
    )

def create_global_task(
    db: Session,
    data: TaskCreate,
    current_user: User
):
    # Если проект всё-таки передан,
    # используем уже существующую логику
    # создания проектной задачи.
    if data.project_id is not None:
        return create_new_task(
            db=db,
            project_id=data.project_id,
            data=data,
            current_user=current_user
        )

    # У общей задачи не может быть этапа,
    # потому что этап существует только внутри проекта.
    if data.stage_id is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="У общей задачи не может быть этапа проекта"
        )

    assignee = get_user_by_id(
        db,
        data.assignee_id
    )

    if assignee is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Исполнитель не найден"
        )

    return create_task(
        db=db,
        project_id=None,
        stage_id=None,
        title=data.title,
        description=data.description,
        priority=data.priority.value,
        assignee_id=data.assignee_id,
        created_by_id=current_user.id,
        deadline=data.deadline
    )


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

def update_existing_task(
    db: Session,
    project_id: int,
    task_id: int,
    data: TaskUpdate
):
    task = get_project_task(
        db,
        project_id,
        task_id
    )

    update_data = data.model_dump(
        exclude_unset=True
    )

    required_fields = {
        "title",
        "priority",
        "assignee_id",
    }

    for field in required_fields:
        if (
            field in update_data
            and update_data[field] is None
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Поле {field} не может быть пустым"
            )

    if (
        "stage_id" in update_data
        and update_data["stage_id"] is not None
    ):
        stage = get_stage_by_id(
            db,
            update_data["stage_id"]
        )

        if (
            stage is None
            or stage.project_id != project_id
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Этап не принадлежит этому проекту"
            )

    if "assignee_id" in update_data:
        assignee = get_user_by_id(
            db,
            update_data["assignee_id"]
        )

        if assignee is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Исполнитель не найден"
            )

    if "priority" in update_data:
        update_data["priority"] = (
            update_data["priority"].value
        )

    return update_task(
        db=db,
        task=task,
        update_data=update_data
    )