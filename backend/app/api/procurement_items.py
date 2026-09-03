from typing import Annotated

from fastapi import (
    APIRouter,
    Depends,
    status,
)
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.procurement_item import (
    ProcurementItemCreate,
    ProcurementItemRead,
    ProcurementItemUpdate,
)
from app.services.procurement_item_service import (
    create_new_procurement_item,
    get_project_procurement_item,
    get_project_procurement_items,
    update_existing_procurement_item,
)


router = APIRouter(
    prefix="/projects/{project_id}/procurement-items",
    tags=["Procurement"]
)


@router.post(
    "",
    response_model=ProcurementItemRead,
    status_code=status.HTTP_201_CREATED
)
def create_procurement_item_endpoint(
    project_id: int,
    data: ProcurementItemCreate,
    db: Annotated[
        Session,
        Depends(get_db)
    ],
    current_user: Annotated[
        User,
        Depends(get_current_user)
    ]
):
    return create_new_procurement_item(
        db=db,
        project_id=project_id,
        data=data,
        current_user=current_user
    )


@router.get(
    "",
    response_model=list[ProcurementItemRead]
)
def get_procurement_items_endpoint(
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
    return get_project_procurement_items(
        db=db,
        project_id=project_id
    )


@router.get(
    "/{item_id}",
    response_model=ProcurementItemRead
)
def get_procurement_item_endpoint(
    project_id: int,
    item_id: int,
    db: Annotated[
        Session,
        Depends(get_db)
    ],
    current_user: Annotated[
        User,
        Depends(get_current_user)
    ]
):
    return get_project_procurement_item(
        db=db,
        project_id=project_id,
        item_id=item_id
    )


@router.patch(
    "/{item_id}",
    response_model=ProcurementItemRead
)
def update_procurement_item_endpoint(
    project_id: int,
    item_id: int,
    data: ProcurementItemUpdate,
    db: Annotated[
        Session,
        Depends(get_db)
    ],
    current_user: Annotated[
        User,
        Depends(get_current_user)
    ]
):
    return update_existing_procurement_item(
        db=db,
        project_id=project_id,
        item_id=item_id,
        data=data
    )