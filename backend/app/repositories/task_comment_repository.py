from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.task_comment import TaskComment


def create_comment(
    db: Session,
    *,
    task_id: int,
    author_id: int,
    text: str
) -> TaskComment:

    comment = TaskComment(
        task_id=task_id,
        author_id=author_id,
        text=text
    )

    db.add(comment)
    db.flush()

    return comment


def get_comments_by_task(
    db: Session,
    task_id: int
) -> list[TaskComment]:

    statement = (
        select(TaskComment)
        .where(
            TaskComment.task_id == task_id
        )
        .order_by(
            TaskComment.created_at.asc()
        )
    )

    return list(
        db.scalars(statement).all()
    )