from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import (
    hash_password,
    verify_password,
)
from app.models.user import User, UserRole
from app.repositories.user_repository import (
    create_user,
    get_all_users,
    get_user_by_email,
    get_user_by_id,
    update_user_role,
)
from app.schemas.user import UserCreate
from app.schemas.user import UserRoleUpdate

def authenticate_user(
    db: Session,
    email: str,
    password: str
):
    user = get_user_by_email(
        db,
        email
    )

    if user is None:
        return None

    if not verify_password(
        password,
        user.password_hash
    ):
        return None

    return user

def register_user(
    db: Session,
    data: UserCreate
):
    existing_user = get_user_by_email(
        db,
        str(data.email)
    )

    if existing_user is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Пользователь с таким email уже существует"
        )

    hashed_password = hash_password(
        data.password
    )

    return create_user(
        db=db,
        name=data.name,
        email=str(data.email),
        password_hash=hashed_password,
        role=data.role.value
    )

def get_users(
    db: Session
):
    return get_all_users(db)


def get_user(
    db: Session,
    user_id: int
):
    user = get_user_by_id(
        db,
        user_id
    )

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Пользователь не найден"
        )

    return user

def change_user_role(
    db: Session,
    user_id: int,
    data: UserRoleUpdate,
    current_user: User
):
    user = get_user_by_id(
        db,
        user_id
    )

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Пользователь не найден"
        )

    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Нельзя изменить собственную роль"
        )

    if user.role == data.role.value:
        return user

    return update_user_role(
        db=db,
        user=user,
        role=data.role.value
    )