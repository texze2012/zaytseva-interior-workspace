from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.models.waiting_item import WaitingItemStatus
from app.schemas.waiting_item import (
    WaitingItemCreate,
    WaitingItemRead,
    WaitingItemStatusUpdate,
    WaitingItemUpdate,
)
from app.services.waiting_item_service import (
    change_waiting_item_status,
    create_new_waiting_item,
    get_project_waiting_items,
    get_waiting_feed,
    get_waiting_item,
    update_existing_waiting_item,
)


router = APIRouter(
    tags=["Waiting"]
)


@router.post(
    "/projects/{project_id}/waiting-items",
    response_model=WaitingItemRead,
    status_code=status.HTTP_201_CREATED
)
def create_waiting_item_endpoint(
    project_id: int,
    data: WaitingItemCreate,
    db: Annotated[
        Session,
        Depends(get_db)
    ],
    current_user: Annotated[
        User,
        Depends(get_current_user)
    ]
):
    return create_new_waiting_item(
        db=db,
        project_id=project_id,
        data=data,
        current_user=current_user
    )


@router.get(
    "/projects/{project_id}/waiting-items",
    response_model=list[WaitingItemRead]
)
def get_project_waiting_items_endpoint(
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
    return get_project_waiting_items(
        db=db,
        project_id=project_id
    )


@router.get(
    "/waiting-items",
    response_model=list[WaitingItemRead]
)
def get_waiting_feed_endpoint(
    db: Annotated[
        Session,
        Depends(get_db)
    ],
    current_user: Annotated[
        User,
        Depends(get_current_user)
    ],
    project_id: int | None = None,
    waiting_status: WaitingItemStatus | None = None,
    reminder_due: bool = False
):
    return get_waiting_feed(
        db=db,
        project_id=project_id,
        waiting_status=waiting_status,
        reminder_due=reminder_due
    )

@router.get(
    "/waiting-items/{waiting_item_id}",
    response_model=WaitingItemRead
)
def get_waiting_item_endpoint(
    waiting_item_id: int,
    db: Annotated[
        Session,
        Depends(get_db)
    ],
    current_user: Annotated[
        User,
        Depends(get_current_user)
    ]
):
    return get_waiting_item(
        db=db,
        waiting_item_id=waiting_item_id
    )


@router.patch(
    "/waiting-items/{waiting_item_id}",
    response_model=WaitingItemRead
)
def update_waiting_item_endpoint(
    waiting_item_id: int,
    data: WaitingItemUpdate,
    db: Annotated[
        Session,
        Depends(get_db)
    ],
    current_user: Annotated[
        User,
        Depends(get_current_user)
    ]
):
    return update_existing_waiting_item(
        db=db,
        waiting_item_id=waiting_item_id,
        data=data
    )


@router.patch(
    "/waiting-items/{waiting_item_id}/status",
    response_model=WaitingItemRead
)
def change_waiting_item_status_endpoint(
    waiting_item_id: int,
    data: WaitingItemStatusUpdate,
    db: Annotated[
        Session,
        Depends(get_db)
    ],
    current_user: Annotated[
        User,
        Depends(get_current_user)
    ]
):
    return change_waiting_item_status(
        db=db,
        waiting_item_id=waiting_item_id,
        data=data
    )