from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.dependencies import (
    get_current_user,
    require_owner,
)
from app.db.session import get_db
from app.models.user import User
from app.schemas.user import (
    UserCreate,
    UserOptionRead,
    UserRead,
    UserRoleUpdate,
)
from app.services.user_service import (
    change_user_role,
    get_user,
    get_users,
    register_user,
)


router = APIRouter(
    prefix="/users",
    tags=["Users"]
)


@router.post(
    "",
    response_model=UserRead,
    status_code=status.HTTP_201_CREATED
)
def create_user_endpoint(
    data: UserCreate,
    db: Annotated[
        Session,
        Depends(get_db)
    ],
    current_owner: Annotated[
        User,
        Depends(require_owner)
    ]
):
    return register_user(
        db=db,
        data=data
    )


@router.get(
    "",
    response_model=list[UserRead]
)
def get_users_endpoint(
    db: Annotated[
        Session,
        Depends(get_db)
    ],
    current_owner: Annotated[
        User,
        Depends(require_owner)
    ]
):
    return get_users(db)


@router.get(
    "/me",
    response_model=UserRead
)
def get_me(
    current_user: Annotated[
        User,
        Depends(get_current_user)
    ]
):
    return current_user


@router.get(
    "/options",
    response_model=list[UserOptionRead]
)
def get_user_options_endpoint(
    db: Annotated[
        Session,
        Depends(get_db)
    ],
    current_user: Annotated[
        User,
        Depends(get_current_user)
    ]
):
    return get_users(db)


@router.patch(
    "/{user_id}/role",
    response_model=UserRead
)
def change_user_role_endpoint(
    user_id: int,
    data: UserRoleUpdate,
    db: Annotated[
        Session,
        Depends(get_db)
    ],
    current_owner: Annotated[
        User,
        Depends(require_owner)
    ]
):
    return change_user_role(
        db=db,
        user_id=user_id,
        data=data,
        current_user=current_owner
    )


@router.get(
    "/{user_id}",
    response_model=UserRead
)
def get_user_endpoint(
    user_id: int,
    db: Annotated[
        Session,
        Depends(get_db)
    ],
    current_owner: Annotated[
        User,
        Depends(require_owner)
    ]
):
    return get_user(
        db=db,
        user_id=user_id
    )