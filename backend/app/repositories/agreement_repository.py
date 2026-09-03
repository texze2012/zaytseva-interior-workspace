from sqlalchemy import select
from sqlalchemy.orm import Session

from datetime import date

from app.models.agreement import Agreement


def create_agreement(
    db: Session,
    *,
    project_id: int,
    created_by_id: int,
    agreement_data: dict
) -> Agreement:

    agreement = Agreement(
        project_id=project_id,
        created_by_id=created_by_id,
        **agreement_data
    )

    db.add(agreement)
    db.commit()
    db.refresh(agreement)

    return agreement


def get_agreement_by_id(
    db: Session,
    agreement_id: int
) -> Agreement | None:

    return db.get(
        Agreement,
        agreement_id
    )


def get_agreements_by_project(
    db: Session,
    project_id: int
) -> list[Agreement]:

    statement = (
        select(Agreement)
        .where(
            Agreement.project_id == project_id
        )
        .order_by(
            Agreement.agreement_date.desc(),
            Agreement.id.desc()
        )
    )

    return list(
        db.scalars(statement).all()
    )


def get_filtered_agreements(
    db: Session,
    *,
    project_id: int | None = None,
    responsible_id: int | None = None,
    agreement_from: date | None = None,
    deadline_from: date | None = None,
    deadline_to: date | None = None,
    agreement_to: date | None = None
) -> list[Agreement]:

    statement = select(Agreement)

    if deadline_from is not None:
        statement = statement.where(
            Agreement.deadline >= deadline_from
        )

    if deadline_to is not None:
        statement = statement.where(
            Agreement.deadline <= deadline_to
        )

    if project_id is not None:
        statement = statement.where(
            Agreement.project_id == project_id
        )

    if responsible_id is not None:
        statement = statement.where(
            Agreement.responsible_id == responsible_id
        )

    if agreement_from is not None:
        statement = statement.where(
            Agreement.agreement_date >= agreement_from
        )

    if agreement_to is not None:
        statement = statement.where(
            Agreement.agreement_date <= agreement_to
        )

    statement = statement.order_by(
        Agreement.agreement_date.desc(),
        Agreement.id.desc()
    )

    return list(
        db.scalars(statement).all()
    )

def update_agreement(
    db: Session,
    agreement: Agreement,
    update_data: dict
) -> Agreement:

    for field, value in update_data.items():
        setattr(
            agreement,
            field,
            value
        )

    db.commit()
    db.refresh(agreement)

    return agreement