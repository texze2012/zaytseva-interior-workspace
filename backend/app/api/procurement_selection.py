from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.api.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.models.project import Project
from app.models.procurement_selection import ProjectRoom, ProcurementVariant
from app.schemas.procurement_selection import RoomCreate, RoomRead, VariantWrite, VariantRead, VariantDecision
from app.services.procurement_item_service import get_project_procurement_item
from app.services.procurement_selection_service import room_for_name, save_variant, decide_variant, delete_variant, delete_item
from app.services.procurement_selection_service import variant_for_item, locked_item
from app.schemas.attachment import AttachmentRead
from app.repositories.attachment_repository import create_attachment, get_attachments_by_target
from app.core.storage import save_upload_file, delete_upload_file

router = APIRouter(prefix="/projects/{project_id}", tags=["Procurement selection"])
DB = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]


@router.get("/procurement-items/{item_id}/variants/{variant_id}/attachments", response_model=list[AttachmentRead])
def variant_attachments(project_id: int, item_id: int, variant_id: int, db: DB, user: CurrentUser):
    item = get_project_procurement_item(db, project_id, item_id)
    variant_for_item(db, item, variant_id)
    return get_attachments_by_target(db=db, target_type="procurement_variant", target_id=variant_id)


@router.post("/procurement-items/{item_id}/variants/{variant_id}/attachments", response_model=AttachmentRead, status_code=201)
async def upload_variant_attachment(project_id: int, item_id: int, variant_id: int, db: DB, user: CurrentUser, file: Annotated[UploadFile, File()]):
    item = locked_item(db, project_id, item_id)
    variant_for_item(db, item, variant_id)
    saved = await save_upload_file(file)
    try:
        return create_attachment(db=db, target_type="procurement_variant", target_id=variant_id, uploaded_by_id=user.id, attachment_data=saved)
    except Exception:
        db.rollback()
        delete_upload_file(saved["relative_path"])
        raise


@router.get("/rooms", response_model=list[RoomRead])
def rooms(project_id: int, db: DB, user: CurrentUser):
    if db.get(Project, project_id) is None:
        raise HTTPException(404, "Проект не найден")
    return list(db.scalars(select(ProjectRoom).where(ProjectRoom.project_id == project_id).order_by(ProjectRoom.name)))


@router.post("/rooms", response_model=RoomRead, status_code=201)
def create_room(project_id: int, data: RoomCreate, db: DB, user: CurrentUser):
    if db.get(Project, project_id) is None:
        raise HTTPException(404, "Проект не найден")
    room = room_for_name(db, project_id, data.name)
    db.commit()
    return room


@router.get("/procurement-items/{item_id}/variants", response_model=list[VariantRead])
def variants(project_id: int, item_id: int, db: DB, user: CurrentUser):
    get_project_procurement_item(db, project_id, item_id)
    return list(db.scalars(select(ProcurementVariant).where(ProcurementVariant.item_id == item_id).order_by(ProcurementVariant.id)))


@router.post("/procurement-items/{item_id}/variants", response_model=VariantRead, status_code=201)
def add_variant(project_id: int, item_id: int, data: VariantWrite, db: DB, user: CurrentUser):
    return save_variant(db, project_id, item_id, data, user)


@router.put("/procurement-items/{item_id}/variants/{variant_id}", response_model=VariantRead)
def edit_variant(project_id: int, item_id: int, variant_id: int, data: VariantWrite, db: DB, user: CurrentUser):
    return save_variant(db, project_id, item_id, data, user, variant_id)


@router.patch("/procurement-items/{item_id}/variants/{variant_id}/decision", response_model=VariantRead)
def decision(project_id: int, item_id: int, variant_id: int, data: VariantDecision, db: DB, user: CurrentUser):
    return decide_variant(db, project_id, item_id, variant_id, data, user)


@router.delete("/procurement-items/{item_id}/variants/{variant_id}", status_code=204)
def remove_variant(project_id: int, item_id: int, variant_id: int, db: DB, user: CurrentUser):
    delete_variant(db, project_id, item_id, variant_id, user)


@router.delete("/procurement-items/{item_id}", status_code=204)
def remove_item(project_id: int, item_id: int, db: DB, user: CurrentUser):
    delete_item(db, project_id, item_id, user)
