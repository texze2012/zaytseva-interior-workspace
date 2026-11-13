from typing import Annotated, Literal
from fastapi import APIRouter, Depends, HTTPException, UploadFile
from sqlalchemy.orm import Session
from app.api.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.models.project import Project
from app.models.task import Task
from app.models.waiting_item import WaitingItem
from app.models.scheduling import Reminder, StudioEvent
from app.schemas.attachment import AttachmentRead
from app.core.storage import save_upload_file, delete_upload_file
from app.repositories.attachment_repository import create_attachment, get_attachments_by_target

router = APIRouter(prefix="/entity-attachments", tags=["Attachments"])
Target = Literal["project", "task", "waiting", "reminder", "event"]
DB = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]


def validate_target(db, kind, entity_id):
    model = {"project": Project, "task": Task, "waiting": WaitingItem, "reminder": Reminder, "event": StudioEvent}[kind]
    if db.get(model, entity_id) is None:
        raise HTTPException(404, "Запись не найдена")


@router.get("/{kind}/{entity_id}", response_model=list[AttachmentRead])
def attachments(kind: Target, entity_id: int, db: DB, user: CurrentUser):
    validate_target(db, kind, entity_id)
    return get_attachments_by_target(db=db, target_type=kind, target_id=entity_id)


@router.post("/{kind}/{entity_id}", response_model=AttachmentRead, status_code=201)
async def upload(kind: Target, entity_id: int, file: UploadFile, db: DB, user: CurrentUser):
    validate_target(db, kind, entity_id)
    saved = await save_upload_file(file)
    try:
        return create_attachment(db=db, target_type=kind, target_id=entity_id, uploaded_by_id=user.id, attachment_data=saved)
    except Exception:
        db.rollback()
        delete_upload_file(saved["relative_path"])
        raise
