"""Compare-and-swap task moves with a single-use, actor-bound undo capability."""
from datetime import datetime, timedelta, timezone
import hashlib
import hmac
import time

import jwt
from fastapi import HTTPException
from sqlalchemy import update

from app.core.config import settings
from app.models.task import Task, TaskStatus
from app.repositories.task_comment_repository import create_comment
from app.repositories.task_repository import get_task_by_id_for_update
from app.schemas.task import TaskMove, TaskMoveUndo, TaskRead
from app.services.task_service import allowed_task_transitions, validate_task_status_transition

UNDO_SECONDS = 30
UNDO_PURPOSE = "task-move-undo-v1"
STATUS_LABELS = {"planned": "Запланировано", "in_progress": "В работе", "review": "На согласовании", "done": "Принято"}


def _undo_key():
    # Separate from bearer JWTs, including when the main JWT algorithm changes.
    return hmac.new(settings.secret_key.encode(), UNDO_PURPOSE.encode(), hashlib.sha256).digest()


def _naive_utc(value):
    return value.astimezone(timezone.utc).replace(tzinfo=None) if value.tzinfo else value


def _locked_task(db, task_id):
    task = get_task_by_id_for_update(db, task_id)
    if task is None:
        raise HTTPException(404, "Задача не найдена")
    return task


def _cas_status(db, task, new_status):
    revision = max(datetime.utcnow(), task.updated_at + timedelta(microseconds=1))
    result = db.execute(update(Task).where(
        Task.id == task.id, Task.status == task.status, Task.updated_at == task.updated_at,
    ).values(status=new_status, updated_at=revision).execution_options(synchronize_session=False))
    if result.rowcount != 1:
        raise HTTPException(409, "Задача уже изменилась. Обновите её и повторите действие.")
    db.refresh(task)
    return revision


def move_task(db, task_id, data: TaskMove, current_user):
    try:
        task = _locked_task(db, task_id)
        validate_task_status_transition(task, data, current_user)
        if task.status != data.expected_status.value or task.updated_at != _naive_utc(data.expected_updated_at):
            raise HTTPException(409, "Задача уже изменилась. Обновите её и повторите действие.")
        before = task.status
        revision = _cas_status(db, task, data.status.value)
        if data.comment and data.comment.strip():
            create_comment(db, task_id=task.id, author_id=current_user.id, text=data.comment.strip())
        # Snapshot before commit: the response/token must describe this exact write,
        # even if another request edits the task immediately after the lock releases.
        response = TaskRead.model_validate(task)
        issued = time.time()
        token = jwt.encode({
            "purpose": UNDO_PURPOSE, "actor": current_user.id, "role": current_user.role,
            "task": task.id, "before": before, "after": task.status,
            "revision": revision.isoformat(timespec="microseconds"),
            "iat": issued, "exp": issued + UNDO_SECONDS,
        }, _undo_key(), algorithm="HS256")
        db.commit()
        return {"task": response, "undo_token": token}
    except Exception:
        db.rollback()
        raise


def undo_task_move(db, task_id, data: TaskMoveUndo, current_user):
    try:
        claims = jwt.decode(data.token, _undo_key(), algorithms=["HS256"], options={
            "require": ["purpose", "actor", "role", "task", "before", "after", "revision", "iat", "exp"],
            "verify_exp": False, "verify_iat": False,
        })
        if claims["purpose"] != UNDO_PURPOSE or claims["task"] != task_id or claims["actor"] != current_user.id:
            raise HTTPException(403, "Отменить перемещение может только его автор.")
        now = time.time()
        if now >= claims["exp"] or claims["iat"] > now + 1:
            raise HTTPException(409, "Время для отмены истекло. Откройте задачу для дальнейших действий.")
        before, after = TaskStatus(claims["before"]), TaskStatus(claims["after"])
        revision = datetime.fromisoformat(claims["revision"])
    except (jwt.InvalidTokenError, ValueError, TypeError, KeyError):
        raise HTTPException(400, "Не удалось проверить отмену перемещения.") from None

    try:
        task = _locked_task(db, task_id)
        # Recheck today's permissions against the ORIGINAL forward operation. Undo
        # is not a general reverse-transition endpoint and cannot confer approval rights.
        transitions = allowed_task_transitions(task, current_user)
        if current_user.role != claims["role"] or after not in transitions.get(before, set()):
            raise HTTPException(403, "Права изменились; отмена этого перемещения недоступна.")
        if task.status != after.value or task.updated_at != revision:
            raise HTTPException(409, "После перемещения задача изменилась; отмена больше недоступна.")
        _cas_status(db, task, before.value)
        create_comment(db, task_id=task.id, author_id=current_user.id,
                       text=f"Отменено перемещение: «{STATUS_LABELS[after.value]}» → «{STATUS_LABELS[before.value]}».")
        response = TaskRead.model_validate(task)
        db.commit()
        return response
    except Exception:
        db.rollback()
        raise
