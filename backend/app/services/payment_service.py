from datetime import date, datetime
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.payment import (
    PaymentKind,
    PaymentStatus,
)
from app.models.user import User
from app.repositories.payment_repository import (
    create_payment,
    get_filtered_payments,
    get_payment_by_id,
    get_payments_by_project,
    update_payment,
    update_payment_status,
)
from app.repositories.procurement_item_repository import (
    get_procurement_item_by_id,
)
from app.repositories.project_repository import (
    get_project_by_id,
)
from app.schemas.payment import (
    PaymentCreate,
    PaymentStatusUpdate,
    PaymentSummaryRead,
    PaymentUpdate,
)

def validate_payment_procurement_item(
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

def create_new_payment(
    db: Session,
    project_id: int,
    data: PaymentCreate,
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

    validate_payment_procurement_item(
        db=db,
        project_id=project_id,
        procurement_item_id=data.procurement_item_id
    )

    payment_data = data.model_dump()

    payment_data["kind"] = data.kind.value
    payment_data["currency"] = (
        data.currency.upper()
    )

    return create_payment(
        db=db,
        project_id=project_id,
        created_by_id=current_user.id,
        payment_data=payment_data
    )

def get_project_payments(
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

    return get_payments_by_project(
        db,
        project_id
    )


def get_payment(
    db: Session,
    payment_id: int
):
    payment = get_payment_by_id(
        db,
        payment_id
    )

    if payment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Платёж не найден"
        )

    return payment

def get_payment_feed(
    db: Session,
    *,
    project_id: int | None = None,
    payment_kind: PaymentKind | None = None,
    payment_status: PaymentStatus | None = None,
    currency: str | None = None,
    overdue: bool = False,
    due_from: date | None = None,
    due_to: date | None = None
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

    return get_filtered_payments(
        db=db,
        project_id=project_id,
        payment_kind=(
            payment_kind.value
            if payment_kind is not None
            else None
        ),
        payment_status=(
            payment_status.value
            if payment_status is not None
            else None
        ),
        currency=(
            currency.upper()
            if currency is not None
            else None
        ),
        overdue=overdue,
        due_from=due_from,
        due_to=due_to,
        today=date.today()
    )

def update_existing_payment(
    db: Session,
    payment_id: int,
    data: PaymentUpdate
):
    payment = get_payment(
        db=db,
        payment_id=payment_id
    )

    update_data = data.model_dump(
        exclude_unset=True
    )

    required_fields = {
        "title",
        "kind",
        "amount",
        "currency",
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
        validate_payment_procurement_item(
            db=db,
            project_id=payment.project_id,
            procurement_item_id=update_data[
                "procurement_item_id"
            ]
        )

    if "kind" in update_data:
        update_data["kind"] = (
            update_data["kind"].value
        )

    if (
        "currency" in update_data
        and update_data["currency"] is not None
    ):
        update_data["currency"] = (
            update_data["currency"].upper()
        )

    return update_payment(
        db=db,
        payment=payment,
        update_data=update_data
    )

PAYMENT_STATUS_TRANSITIONS = {
    PaymentStatus.PENDING: {
        PaymentStatus.PAID,
        PaymentStatus.CANCELLED,
    },

    PaymentStatus.PAID: {
        PaymentStatus.PENDING,
    },

    PaymentStatus.CANCELLED: {
        PaymentStatus.PENDING,
    },
}

def change_payment_status(
    db: Session,
    payment_id: int,
    data: PaymentStatusUpdate
):
    payment = get_payment(
        db=db,
        payment_id=payment_id
    )

    current_status = PaymentStatus(
        payment.status
    )

    new_status = data.status

    allowed_statuses = (
        PAYMENT_STATUS_TRANSITIONS.get(
            current_status,
            set()
        )
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

    paid_at = None

    if new_status == PaymentStatus.PAID:
        paid_at = (
            data.paid_at
            if data.paid_at is not None
            else datetime.utcnow()
        )

        if paid_at > datetime.utcnow():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Дата оплаты не может быть в будущем"
            )

    elif data.paid_at is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Дата оплаты указывается только для оплаченного платежа"
        )

    return update_payment_status(
        db=db,
        payment=payment,
        new_status=new_status.value,
        paid_at=paid_at
    )

def get_payment_summary(
    db: Session,
    *,
    project_id: int | None = None,
    currency: str = "RUB"
) -> PaymentSummaryRead:

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

    currency = currency.upper()

    payments = get_filtered_payments(
        db=db,
        project_id=project_id,
        currency=currency,
        today=date.today()
    )

    client_expected = Decimal("0")
    client_received = Decimal("0")

    supplier_to_pay = Decimal("0")
    supplier_paid = Decimal("0")

    bonuses_received = Decimal("0")

    overdue_count = 0

    for payment in payments:
        if payment.status == PaymentStatus.CANCELLED.value:
            continue

        if (
            payment.kind
            == PaymentKind.CLIENT_PAYMENT.value
        ):
            if payment.status == PaymentStatus.PAID.value:
                client_received += payment.amount
            else:
                client_expected += payment.amount

        elif (
            payment.kind
            == PaymentKind.SUPPLIER_PAYMENT.value
        ):
            if payment.status == PaymentStatus.PAID.value:
                supplier_paid += payment.amount
            else:
                supplier_to_pay += payment.amount

        elif (
            payment.kind
            == PaymentKind.BONUS.value
            and payment.status
            == PaymentStatus.PAID.value
        ):
            bonuses_received += payment.amount

        if payment.is_overdue:
            overdue_count += 1

    return PaymentSummaryRead(
        currency=currency,
        client_expected=client_expected,
        client_received=client_received,
        supplier_to_pay=supplier_to_pay,
        supplier_paid=supplier_paid,
        bonuses_received=bonuses_received,
        overdue_count=overdue_count
    )