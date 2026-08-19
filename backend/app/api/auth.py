from typing import Annotated

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.security import create_access_token
from app.db.session import get_db
from app.schemas.auth import TokenResponse
from app.services.user_service import authenticate_user


router = APIRouter(
    prefix="/auth",
    tags=["Auth"]
)


@router.post(
    "/login",
    response_model=TokenResponse
)
def login(
    form_data: Annotated[
        OAuth2PasswordRequestForm,
        Depends()
    ],
    db: Annotated[
        Session,
        Depends(get_db)
    ]
):
    user = authenticate_user(
        db=db,
        email=form_data.username,
        password=form_data.password
    )

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный email или пароль",
            headers={
                "WWW-Authenticate": "Bearer"
            }
        )

    access_token = create_access_token(
        subject=str(user.id)
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer"
    )