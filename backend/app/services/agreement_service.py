from datetime import date

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.user import User
from app.repositories.agreement_repository import (
    create_agreement,
    get_agreement_by_id,
    get_agreements_by_project,
    get_filtered_agreements,
    update_agreement,
)
from app.repositories.procurement_item_repository import (
    get_procurement_item_by_id,
)
from app.repositories.project_repository import (
    get_project_by_id,
)
from app.repositories.user_repository import (
    get_user_by_id,
)
from app.schemas.agreement import (
    AgreementCreate,
    AgreementUpdate,
)

def validate_agreement_procurement_item(
    db: Session,
    project_id: int,
    procurement_item_id: int | None
):
    if procurement_item_id is None:
        return

    item = get_procurement_item_by_id(
        db,
        procurement_item_id
    )

    if (
        item is None
        or item.project_id != project_id
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Позиция комплектации не принадлежит этому проекту"
        )


def validate_agreement_responsible(
    db: Session,
    responsible_id: int | None
):
    if responsible_id is None:
        return

    user = get_user_by_id(
        db,
        responsible_id
    )

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ответственный пользователь не найден"
        )

def create_new_agreement(
    db: Session,
    project_id: int,
    data: AgreementCreate,
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

    validate_agreement_procurement_item(
        db=db,
        project_id=project_id,
        procurement_item_id=data.procurement_item_id
    )

    validate_agreement_responsible(
        db=db,
        responsible_id=data.responsible_id
    )

    agreement_date = (
        data.agreement_date
        if data.agreement_date is not None
        else date.today()
    )

    if (
        data.deadline is not None
        and data.deadline < agreement_date
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Срок действия не может быть раньше даты договорённости"
        )

    agreement_data = data.model_dump()

    agreement_data["agreement_date"] = (
        agreement_date
    )

    return create_agreement(
        db=db,
        project_id=project_id,
        created_by_id=current_user.id,
        agreement_data=agreement_data
    )

def get_project_agreements(
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

    return get_agreements_by_project(
        db,
        project_id
    )

def get_agreement(
    db: Session,
    agreement_id: int
):
    agreement = get_agreement_by_id(
        db,
        agreement_id
    )

    if agreement is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Договорённость не найдена"
        )

    return agreement

def get_agreement_feed(
    db: Session,
    *,
    project_id: int | None = None,
    responsible_id: int | None = None,
    current_user: User,
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

    if mine:
        responsible_id = current_user.id

    return get_filtered_agreements(
        db=db,
        project_id=project_id,
        responsible_id=responsible_id
    )

def update_existing_agreement(
    db: Session,
    agreement_id: int,
    data: AgreementUpdate
):
    agreement = get_agreement(
        db=db,
        agreement_id=agreement_id
    )

    update_data = data.model_dump(
        exclude_unset=True
    )

    required_fields = {
        "agreement_date",
        "with_whom",
        "decision",
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

    if "procurement_item_id" in update_data:
        validate_agreement_procurement_item(
            db=db,
            project_id=agreement.project_id,
            procurement_item_id=update_data[
                "procurement_item_id"
            ]
        )

    if "responsible_id" in update_data:
        validate_agreement_responsible(
            db=db,
            responsible_id=update_data[
                "responsible_id"
            ]
        )

    new_agreement_date = update_data.get(
        "agreement_date",
        agreement.agreement_date
    )

    new_deadline = update_data.get(
        "deadline",
        agreement.deadline
    )

    if (
        new_deadline is not None
        and new_deadline < new_agreement_date
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Срок действия не может быть раньше даты договорённости"
        )

    return update_agreement(
        db=db,
        agreement=agreement,
        update_data=update_data
    )