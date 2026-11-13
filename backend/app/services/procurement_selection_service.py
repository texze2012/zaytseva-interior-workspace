from datetime import datetime, timezone
from fastapi import HTTPException
from sqlalchemy import delete, select, update
from sqlalchemy.exc import IntegrityError
from app.models.project import Project
from app.models.procurement_item import ProcurementItem
from app.models.procurement_selection import ProcurementVariant, ProjectRoom

COMMERCIAL_FIELDS = ("brand", "article", "product_url", "supplier_name", "unit_price", "currency")
ORDER_STATES = {"ordered", "in_production", "in_delivery", "delivered", "completed"}


def room_for_name(db, project_id, name):
    name = " ".join(name.split())
    if not name:
        raise HTTPException(400, "Введите название помещения")
    if len(name) > 100:
        raise HTTPException(400, "Название помещения не должно превышать 100 символов")
    key = name.lower()
    room = db.scalar(select(ProjectRoom).where(ProjectRoom.project_id == project_id, ProjectRoom.name_key == key))
    if room is None:
        try:
            with db.begin_nested():
                room = ProjectRoom(project_id=project_id, name=name, name_key=key)
                db.add(room)
                db.flush()
        except IntegrityError:
            room = db.scalar(select(ProjectRoom).where(ProjectRoom.project_id == project_id, ProjectRoom.name_key == key))
            if room is None:
                raise
    return room


def resolve_room(db, project_id, values):
    if values.get("room_id") is not None:
        room = db.get(ProjectRoom, values["room_id"])
        if room is None or room.project_id != project_id:
            raise HTTPException(400, "Помещение не принадлежит проекту")
        values["room"] = room.name
    elif values.get("room"):
        room = room_for_name(db, project_id, values["room"])
        values.update(room_id=room.id, room=room.name)
    elif "room_id" in values or "room" in values:
        values.update(room_id=None, room=None)


def locked_item(db, project_id, item_id):
    item = db.scalar(select(ProcurementItem).where(ProcurementItem.id == item_id, ProcurementItem.project_id == project_id).with_for_update())
    if item is None:
        raise HTTPException(404, "Позиция не найдена")
    return item


def variant_for_item(db, item, variant_id):
    variant = db.get(ProcurementVariant, variant_id)
    if variant is None or variant.item_id != item.id:
        raise HTTPException(404, "Вариант не найден")
    return variant


def owner_only(user):
    if user.role != "owner":
        raise HTTPException(403, "Отбор и окончательный выбор подтверждает руководитель")


def sync_review_status(db, item):
    db.flush()
    pending = db.scalar(select(ProcurementVariant.id).where(ProcurementVariant.item_id == item.id, ProcurementVariant.status == "studio_review").limit(1))
    if item.status in {"selection", "studio_review"}:
        item.status = "studio_review" if pending else "selection"


def save_variant(db, project_id, item_id, data, user, variant_id=None):
    item = locked_item(db, project_id, item_id)
    if variant_id is None:
        variant = ProcurementVariant(item_id=item.id, created_by_id=user.id, **data.model_dump())
        db.add(variant)
    else:
        variant = variant_for_item(db, item, variant_id)
        if item.selected_variant_id == variant.id:
            raise HTTPException(409, "Сначала отмените окончательный выбор, затем изменяйте вариант")
        for key, value in data.model_dump().items():
            setattr(variant, key, value)
        # Changes invalidate the previous review; send it for review again.
        variant.status = "candidate"
        variant.reviewed_by_id = None
        variant.reviewed_at = None
        variant.reviewer_note = None
    sync_review_status(db, item)
    db.commit()
    db.refresh(variant)
    return variant


def decide_variant(db, project_id, item_id, variant_id, data, user):
    item = locked_item(db, project_id, item_id)
    variant = variant_for_item(db, item, variant_id)
    target = data.status
    if target in {"shortlisted", "rejected", "selected"} or variant.status == "selected":
        owner_only(user)
    allowed = {"candidate":{"studio_review"}, "studio_review":{"shortlisted", "rejected", "candidate"}, "shortlisted":{"selected", "rejected", "studio_review"}, "rejected":{"studio_review"}, "selected":{"candidate"}}
    if target not in allowed.get(variant.status, set()):
        raise HTTPException(409, "Недопустимый переход: сначала отправьте вариант на отбор")
    if (target == "selected" or variant.status == "selected") and item.status in ORDER_STATES:
        raise HTTPException(409, "Позиция уже заказана или закрыта. Сначала верните её к согласованию")
    if target == "selected":
        previous = db.get(ProcurementVariant, item.selected_variant_id) if item.selected_variant_id else None
        if previous:
            previous.status = "shortlisted"
        for key in COMMERCIAL_FIELDS:
            setattr(item, key, getattr(variant, key))
        item.selected_variant_id = variant.id
        item.status = "approved"
    elif item.selected_variant_id == variant.id:
        item.selected_variant_id = None
        for key in COMMERCIAL_FIELDS:
            setattr(item, key, "RUB" if key == "currency" else None)
        item.status = "selection"
    variant.status = target
    if target in {"shortlisted", "rejected", "selected"}:
        variant.reviewed_by_id = user.id
        variant.reviewed_at = datetime.now(timezone.utc)
        variant.reviewer_note = data.reviewer_note
    sync_review_status(db, item)
    db.commit()
    db.refresh(variant)
    return variant


def delete_variant(db, project_id, item_id, variant_id, user):
    from app.models.attachment import Attachment
    from app.core.storage import delete_upload_file
    item = locked_item(db, project_id, item_id)
    variant = variant_for_item(db, item, variant_id)
    if item.selected_variant_id == variant.id:
        raise HTTPException(409, "Сначала отмените окончательный выбор или выберите другой вариант")
    if user.role != "owner" and (variant.created_by_id != user.id or variant.status not in {"candidate", "rejected"}):
        raise HTTPException(403, "Отправленные на отбор варианты удаляет руководитель")
    files = list(db.scalars(select(Attachment).where(Attachment.target_type == "procurement_variant", Attachment.target_id == variant.id)))
    paths = [file.relative_path for file in files]
    for file in files:
        db.delete(file)
    db.delete(variant)
    sync_review_status(db, item)
    db.commit()

    for path in paths:
        delete_upload_file(path)


def delete_item(db, project_id, item_id, user):
    from app.models.agreement import Agreement
    from app.models.payment import Payment
    from app.models.waiting_item import WaitingItem
    from app.models.attachment import Attachment
    from app.models.procurement_checkpoint import ProcurementCheckpoint
    from app.core.storage import delete_upload_file
    item = locked_item(db, project_id, item_id)
    if user.role != "owner" and item.created_by_id != user.id:
        raise HTTPException(403, "Удалить позицию может её автор или руководитель")
    variant_ids = select(ProcurementVariant.id).where(ProcurementVariant.item_id == item.id)
    files = list(db.scalars(select(Attachment).where(
        ((Attachment.target_type == "procurement_item") & (Attachment.target_id == item.id)) |
        ((Attachment.target_type == "procurement_variant") & Attachment.target_id.in_(variant_ids))
    )))
    paths = [f.relative_path for f in files]
    for file in files:
        db.delete(file)
    # Keep financial and operational history while removing its optional link.
    for model in (Agreement, Payment, WaitingItem):
        db.execute(update(model).where(model.procurement_item_id == item.id).values(procurement_item_id=None))
    item.selected_variant_id = None
    db.flush()
    db.execute(delete(ProcurementVariant).where(ProcurementVariant.item_id == item.id))
    db.execute(delete(ProcurementCheckpoint).where(ProcurementCheckpoint.item_id == item.id))
    db.delete(item)
    db.commit()
    for path in paths:
        delete_upload_file(path)
