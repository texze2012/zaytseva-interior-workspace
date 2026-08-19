from sqlalchemy.orm import Session

from app.models.user import User
from app.repositories.task_comment_repository import (
    create_comment,
    get_comments_by_task,
)
from app.schemas.task_comment import TaskCommentCreate
from app.services.task_service import get_project_task


def add_task_comment(
    db: Session,
    project_id: int,
    task_id: int,
    data: TaskCommentCreate,
    current_user: User
):
    task = get_project_task(
        db=db,
        project_id=project_id,
        task_id=task_id
    )

    comment = create_comment(
        db=db,
        task_id=task.id,
        author_id=current_user.id,
        text=data.text
    )

    db.commit()
    db.refresh(comment)

    return comment


def get_task_comments(
    db: Session,
    project_id: int,
    task_id: int
):
    task = get_project_task(
        db=db,
        project_id=project_id,
        task_id=task_id
    )

    return get_comments_by_task(
        db=db,
        task_id=task.id
    )