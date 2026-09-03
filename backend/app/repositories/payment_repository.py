from datetime import date, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.payment import (
    Payment,
    PaymentStatus,
)


def create_payment(
    db: Session,
    *,
    project_id: int,
    created_by_id: int,
    payment_data: dict
) -> Payment:

    payment = Payment(
        project_id=project_id,
        created_by_id=created_by_id,
        **payment_data
    )

    db.add(payment)
    db.commit()
    db.refresh(payment)

    return payment


def get_payment_by_id(
    db: Session,
    payment_id: int
) -> Payment | None:

    return db.get(
        Payment,
        payment_id
    )


def get_payments_by_project(
    db: Session,
    project_id: int
) -> list[Payment]:

    statement = (
        select(Payment)
        .where(
            Payment.project_id == project_id
        )
        .order_by(
            Payment.due_date.asc().nulls_last(),
            Payment.id.desc()
        )
    )

    return list(
        db.scalars(statement).all()
    )


def get_filtered_payments(
    db: Session,
    *,
    project_id: int | None = None,
    payment_kind: str | None = None,
    payment_status: str | None = None,
    currency: str | None = None,
    overdue: bool = False,
    due_from: date | None = None,
    due_to: date | None = None,
    today: date
) -> list[Payment]:

    statement = select(Payment)

    if project_id is not None:
        statement = statement.where(
            Payment.project_id == project_id
        )

    if payment_kind is not None:
        statement = statement.where(
            Payment.kind == payment_kind
        )

    if payment_status is not None:
        statement = statement.where(
            Payment.status == payment_status
        )

    if currency is not None:
        statement = statement.where(
            Payment.currency == currency
        )

    if overdue:
        statement = statement.where(
            Payment.status
            == PaymentStatus.PENDING.value,
            Payment.due_date.is_not(None),
            Payment.due_date < today
        )

    if due_from is not None:
        statement = statement.where(
            Payment.due_date >= due_from
        )

    if due_to is not None:
        statement = statement.where(
            Payment.due_date <= due_to
        )

    statement = statement.order_by(
        Payment.due_date.asc().nulls_last(),
        Payment.id.desc()
    )

    return list(
        db.scalars(statement).all()
    )


def update_payment(
    db: Session,
    payment: Payment,
    update_data: dict
) -> Payment:

    for field, value in update_data.items():
        setattr(
            payment,
            field,
            value
        )

    db.commit()
    db.refresh(payment)

    return payment


def update_payment_status(
    db: Session,
    payment: Payment,
    *,
    new_status: str,
    paid_at: datetime | None
) -> Payment:

    payment.status = new_status
    payment.paid_at = paid_at

    db.commit()
    db.refresh(payment)

    return payment