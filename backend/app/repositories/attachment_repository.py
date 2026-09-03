from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.attachment import Attachment


def create_attachment(
    db: Session,
    *,
    target_type: str,
    target_id: int,
    uploaded_by_id: int,
    attachment_data: dict
) -> Attachment:

    attachment = Attachment(
        target_type=target_type,
        target_id=target_id,
        uploaded_by_id=uploaded_by_id,
        **attachment_data
    )

    db.add(attachment)
    db.commit()
    db.refresh(attachment)

    return attachment


def get_attachment_by_id(
    db: Session,
    attachment_id: int
) -> Attachment | None:

    return db.get(
        Attachment,
        attachment_id
    )


def get_attachments_by_target(
    db: Session,
    *,
    target_type: str,
    target_id: int
) -> list[Attachment]:

    statement = (
        select(Attachment)
        .where(
            Attachment.target_type
            == target_type,
            Attachment.target_id
            == target_id
        )
        .order_by(
            Attachment.created_at.asc()
        )
    )

    return list(
        db.scalars(statement).all()
    )


def delete_attachment_record(
    db: Session,
    attachment: Attachment
) -> None:

    db.delete(attachment)
    db.commit()