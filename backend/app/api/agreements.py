from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.agreement import (
    AgreementCreate,
    AgreementRead,
    AgreementUpdate,
)
from app.services.agreement_service import (
    create_new_agreement,
    get_agreement,
    get_agreement_feed,
    get_project_agreements,
    update_existing_agreement,
)


router = APIRouter(
    tags=["Agreements"]
)


@router.post(
    "/projects/{project_id}/agreements",
    response_model=AgreementRead,
    status_code=status.HTTP_201_CREATED
)
def create_agreement_endpoint(
    project_id: int,
    data: AgreementCreate,
    db: Annotated[
        Session,
        Depends(get_db)
    ],
    current_user: Annotated[
        User,
        Depends(get_current_user)
    ]
):
    return create_new_agreement(
        db=db,
        project_id=project_id,
        data=data,
        current_user=current_user
    )


@router.get(
    "/projects/{project_id}/agreements",
    response_model=list[AgreementRead]
)
def get_project_agreements_endpoint(
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
    return get_project_agreements(
        db=db,
        project_id=project_id
    )

@router.get(
    "/agreements",
    response_model=list[AgreementRead]
)
def get_agreement_feed_endpoint(
    db: Annotated[
        Session,
        Depends(get_db)
    ],
    current_user: Annotated[
        User,
        Depends(get_current_user)
    ],
    project_id: int | None = None,
    responsible_id: int | None = None,
    mine: bool = False
):
    return get_agreement_feed(
        db=db,
        project_id=project_id,
        responsible_id=responsible_id,
        current_user=current_user,
        mine=mine
    )


@router.get(
    "/agreements/{agreement_id}",
    response_model=AgreementRead
)
def get_agreement_endpoint(
    agreement_id: int,
    db: Annotated[
        Session,
        Depends(get_db)
    ],
    current_user: Annotated[
        User,
        Depends(get_current_user)
    ]
):
    return get_agreement(
        db=db,
        agreement_id=agreement_id
    )


@router.patch(
    "/agreements/{agreement_id}",
    response_model=AgreementRead
)
def update_agreement_endpoint(
    agreement_id: int,
    data: AgreementUpdate,
    db: Annotated[
        Session,
        Depends(get_db)
    ],
    current_user: Annotated[
        User,
        Depends(get_current_user)
    ]
):
    return update_existing_agreement(
        db=db,
        agreement_id=agreement_id,
        data=data
    )