from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.procurement_checkpoint import (
    ProcurementCheckpointRead,
    ProcurementCheckpointUpdate,
)
from app.services.procurement_checkpoint_service import (
    get_item_checkpoints,
    update_item_checkpoint,
)


router = APIRouter(
    prefix=(
        "/projects/{project_id}"
        "/procurement-items/{item_id}"
        "/checkpoints"
    ),
    tags=["Procurement Checklist"],
)


@router.get(
    "",
    response_model=list[ProcurementCheckpointRead],
)
def get_item_checkpoints_endpoint(
    project_id: int,
    item_id: int,
    db: Annotated[
        Session,
        Depends(get_db)
    ],
    current_user: Annotated[
        User,
        Depends(get_current_user)
    ],
):
    return get_item_checkpoints(
        db=db,
        project_id=project_id,
        item_id=item_id,
    )


@router.patch(
    "/{checkpoint_id}",
    response_model=ProcurementCheckpointRead,
)
def update_item_checkpoint_endpoint(
    project_id: int,
    item_id: int,
    checkpoint_id: int,
    data: ProcurementCheckpointUpdate,
    db: Annotated[
        Session,
        Depends(get_db)
    ],
    current_user: Annotated[
        User,
        Depends(get_current_user)
    ],
):
    return update_item_checkpoint(
        db=db,
        project_id=project_id,
        item_id=item_id,
        checkpoint_id=checkpoint_id,
        data=data,
        current_user=current_user,
    )