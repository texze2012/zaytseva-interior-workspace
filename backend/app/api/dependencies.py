from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jwt.exceptions import InvalidTokenError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.models.user import User, UserRole
from app.repositories.user_repository import get_user_by_id


oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/auth/login"
)


def get_current_user(
    token: Annotated[
        str,
        Depends(oauth2_scheme)
    ],
    db: Annotated[
        Session,
        Depends(get_db)
    ]
) -> User:

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Не удалось подтвердить авторизацию",
        headers={
            "WWW-Authenticate": "Bearer"
        }
    )

    try:
        payload = jwt.decode(
            token,
            settings.secret_key,
            algorithms=[settings.algorithm]
        )

        subject = payload.get("sub")

        if subject is None:
            raise credentials_exception

        user_id = int(subject)

    except (
        InvalidTokenError,
        ValueError
    ):
        raise credentials_exception

    user = get_user_by_id(
        db,
        user_id
    )

    if user is None:
        raise credentials_exception

    return user

def require_owner(
    current_user: Annotated[
        User,
        Depends(get_current_user)
    ]
) -> User:

    if current_user.role != UserRole.OWNER.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав"
        )

    return current_user