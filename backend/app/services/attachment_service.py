from pathlib import Path

from fastapi import (
    HTTPException,
    UploadFile,
    status,
)
from sqlalchemy.orm import Session

from app.core.storage import (
    delete_upload_file,
    get_upload_path,
    save_upload_file,
)
from app.models.attachment import (
    AttachmentTargetType,
)
from app.models.user import User, UserRole
from app.repositories.attachment_repository import (
    create_attachment,
    delete_attachment_record,
    get_attachment_by_id,
    get_attachments_by_target,
)
from app.repositories.task_comment_repository import (
    get_comment_by_id,
)
from app.services.procurement_item_service import (
    get_project_procurement_item,
)
from app.services.task_service import (
    get_project_task,
    get_task,
)

def validate_comment_target(
    db: Session,
    *,
    project_id: int,
    task_id: int,
    comment_id: int
):
    task = get_project_task(
        db=db,
        project_id=project_id,
        task_id=task_id
    )

    comment = get_comment_by_id(
        db,
        comment_id
    )

    if (
        comment is None
        or comment.task_id != task.id
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Комментарий не найден"
        )

    return comment

def validate_task_comment_target(
    db: Session,
    *,
    task_id: int,
    comment_id: int
):
    task = get_task(
        db=db,
        task_id=task_id
    )

    comment = get_comment_by_id(
        db,
        comment_id
    )

    if (
        comment is None
        or comment.task_id != task.id
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Комментарий не найден"
        )

    return comment

async def upload_comment_attachment(
    db: Session,
    *,
    project_id: int,
    task_id: int,
    comment_id: int,
    file: UploadFile,
    current_user: User
):
    comment = validate_comment_target(
        db=db,
        project_id=project_id,
        task_id=task_id,
        comment_id=comment_id
    )

    saved_file = await save_upload_file(
        file
    )

    try:
        return create_attachment(
            db=db,
            target_type=(
                AttachmentTargetType
                .TASK_COMMENT
                .value
            ),
            target_id=comment.id,
            uploaded_by_id=current_user.id,
            attachment_data=saved_file
        )

    except Exception:
        db.rollback()

        delete_upload_file(
            saved_file["relative_path"]
        )

        raise

def get_comment_attachments(
    db: Session,
    *,
    project_id: int,
    task_id: int,
    comment_id: int
):
    comment = validate_comment_target(
        db=db,
        project_id=project_id,
        task_id=task_id,
        comment_id=comment_id
    )

    return get_attachments_by_target(
        db=db,
        target_type=(
            AttachmentTargetType
            .TASK_COMMENT
            .value
        ),
        target_id=comment.id
    )

async def upload_procurement_attachment(
    db: Session,
    *,
    project_id: int,
    item_id: int,
    file: UploadFile,
    current_user: User
):
    item = get_project_procurement_item(
        db=db,
        project_id=project_id,
        item_id=item_id
    )

    saved_file = await save_upload_file(
        file
    )

    try:
        return create_attachment(
            db=db,
            target_type=(
                AttachmentTargetType
                .PROCUREMENT_ITEM
                .value
            ),
            target_id=item.id,
            uploaded_by_id=current_user.id,
            attachment_data=saved_file
        )

    except Exception:
        db.rollback()

        delete_upload_file(
            saved_file["relative_path"]
        )

        raise


def get_procurement_attachments(
    db: Session,
    *,
    project_id: int,
    item_id: int
):
    item = get_project_procurement_item(
        db=db,
        project_id=project_id,
        item_id=item_id
    )

    return get_attachments_by_target(
        db=db,
        target_type=(
            AttachmentTargetType
            .PROCUREMENT_ITEM
            .value
        ),
        target_id=item.id
    )

def get_attachment_file(
    db: Session,
    attachment_id: int
) -> tuple:

    attachment = get_attachment_by_id(
        db,
        attachment_id
    )

    if attachment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Вложение не найдено"
        )

    file_path = get_upload_path(
        attachment.relative_path
    )

    if not file_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Файл не найден на диске"
        )

    return attachment, file_path

def delete_attachment(
    db: Session,
    attachment_id: int,
    current_user: User
) -> None:

    attachment = get_attachment_by_id(
        db,
        attachment_id
    )

    if attachment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Вложение не найдено"
        )

    is_owner = (
        current_user.role
        == UserRole.OWNER.value
    )

    is_uploader = (
        attachment.uploaded_by_id
        == current_user.id
    )

    if not is_owner and not is_uploader:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав для удаления файла"
        )

    relative_path = (
        attachment.relative_path
    )

    from sqlalchemy import update
    from app.models.project import Project
    db.execute(update(Project).where(Project.cover_attachment_id == attachment_id).values(cover_attachment_id=None))

    delete_attachment_record(
        db=db,
        attachment=attachment
    )

    delete_upload_file(
        relative_path
    )

async def upload_task_comment_attachment(
    db: Session,
    *,
    task_id: int,
    comment_id: int,
    file: UploadFile,
    current_user: User
):
    comment = validate_task_comment_target(
        db=db,
        task_id=task_id,
        comment_id=comment_id
    )

    saved_file = await save_upload_file(
        file
    )

    try:
        return create_attachment(
            db=db,
            target_type=(
                AttachmentTargetType
                .TASK_COMMENT
                .value
            ),
            target_id=comment.id,
            uploaded_by_id=current_user.id,
            attachment_data=saved_file
        )

    except Exception:
        db.rollback()

        delete_upload_file(
            saved_file["relative_path"]
        )

        raise

def get_task_comment_attachments(
    db: Session,
    *,
    task_id: int,
    comment_id: int
):
    comment = validate_task_comment_target(
        db=db,
        task_id=task_id,
        comment_id=comment_id
    )

    return get_attachments_by_target(
        db=db,
        target_type=(
            AttachmentTargetType
            .TASK_COMMENT
            .value
        ),
        target_id=comment.id
    )