from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.dashboard import (
    DashboardRead,
    ProcurementDashboardRead,
)
from app.services.dashboard_service import (
    get_dashboard,
    get_procurement_dashboard,
)


router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"]
)


@router.get(
    "",
    response_model=DashboardRead
)
def get_dashboard_endpoint(
    db: Annotated[
        Session,
        Depends(get_db)
    ],
    current_user: Annotated[
        User,
        Depends(get_current_user)
    ]
):
    return get_dashboard(
        db=db,
        current_user=current_user
    )

@router.get(
    "/procurement",
    response_model=ProcurementDashboardRead
)
def get_procurement_dashboard_endpoint(
    db: Annotated[
        Session,
        Depends(get_db)
    ],
    current_user: Annotated[
        User,
        Depends(get_current_user)
    ]
):
    return get_procurement_dashboard(
        db=db,
        current_user=current_user
    )