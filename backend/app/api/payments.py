from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.db.session import get_db
from app.models.payment import (
    PaymentKind,
    PaymentStatus,
)
from app.models.user import User
from app.schemas.payment import (
    PaymentCreate,
    PaymentRead,
    PaymentStatusUpdate,
    PaymentSummaryRead,
    PaymentUpdate,
)
from app.services.payment_service import (
    change_payment_status,
    create_new_payment,
    get_payment,
    get_payment_feed,
    get_payment_summary,
    get_project_payments,
    update_existing_payment,
)


router = APIRouter(
    tags=["Payments"]
)

@router.post(
    "/projects/{project_id}/payments",
    response_model=PaymentRead,
    status_code=status.HTTP_201_CREATED
)
def create_payment_endpoint(
    project_id: int,
    data: PaymentCreate,
    db: Annotated[
        Session,
        Depends(get_db)
    ],
    current_user: Annotated[
        User,
        Depends(get_current_user)
    ]
):
    return create_new_payment(
        db=db,
        project_id=project_id,
        data=data,
        current_user=current_user
    )


@router.get(
    "/projects/{project_id}/payments",
    response_model=list[PaymentRead]
)
def get_project_payments_endpoint(
    project_id: int,
    db: Annotated[
        Session,
        Depends(get_db)
    ],
    current_user: Annotated[
        User,
        Depends(get_current_user)
    ]
):
    return get_project_payments(
        db=db,
        project_id=project_id
    )

@router.get(
    "/payments",
    response_model=list[PaymentRead]
)
def get_payment_feed_endpoint(
    db: Annotated[
        Session,
        Depends(get_db)
    ],
    current_user: Annotated[
        User,
        Depends(get_current_user)
    ],
    project_id: int | None = None,
    payment_kind: PaymentKind | None = None,
    payment_status: PaymentStatus | None = None,
    currency: str | None = None,
    overdue: bool = False,
    due_from: date | None = None,
    due_to: date | None = None
):
    return get_payment_feed(
        db=db,
        project_id=project_id,
        payment_kind=payment_kind,
        payment_status=payment_status,
        currency=currency,
        overdue=overdue,
        due_from=due_from,
        due_to=due_to
    )

@router.get(
    "/payments/summary",
    response_model=PaymentSummaryRead
)
def get_payment_summary_endpoint(
    db: Annotated[
        Session,
        Depends(get_db)
    ],
    current_user: Annotated[
        User,
        Depends(get_current_user)
    ],
    project_id: int | None = None,
    currency: str = "RUB"
):
    return get_payment_summary(
        db=db,
        project_id=project_id,
        currency=currency
    )

@router.get(
    "/payments/{payment_id}",
    response_model=PaymentRead
)
def get_payment_endpoint(
    payment_id: int,
    db: Annotated[
        Session,
        Depends(get_db)
    ],
    current_user: Annotated[
        User,
        Depends(get_current_user)
    ]
):
    return get_payment(
        db=db,
        payment_id=payment_id
    )


@router.patch(
    "/payments/{payment_id}",
    response_model=PaymentRead
)
def update_payment_endpoint(
    payment_id: int,
    data: PaymentUpdate,
    db: Annotated[
        Session,
        Depends(get_db)
    ],
    current_user: Annotated[
        User,
        Depends(get_current_user)
    ]
):
    return update_existing_payment(
        db=db,
        payment_id=payment_id,
        data=data
    )


@router.patch(
    "/payments/{payment_id}/status",
    response_model=PaymentRead
)
def change_payment_status_endpoint(
    payment_id: int,
    data: PaymentStatusUpdate,
    db: Annotated[
        Session,
        Depends(get_db)
    ],
    current_user: Annotated[
        User,
        Depends(get_current_user)
    ]
):
    return change_payment_status(
        db=db,
        payment_id=payment_id,
        data=data
    )