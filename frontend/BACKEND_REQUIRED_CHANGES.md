# Обязательные изменения backend перед запуском frontend

## 1. CORS

В `app/main.py` добавь импорт:

```python
from fastapi.middleware.cors import CORSMiddleware
```

После создания `app = FastAPI(...)`, но до роутеров:

```python
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

Для production потом добавь настоящий frontend-origin, например:

```python
"https://workspace.zaytseva-interior.ru"
```

Не используй `allow_origins=["*"]` для production-сценария с Authorization/credentials.

---

## 2. Безопасный список пользователей для select

Сейчас `GET /users` доступен только owner, но по нашей матрице и Ольга, и Кристина могут назначать исполнителя.

В `app/schemas/user.py` добавь:

```python
class UserOptionRead(BaseModel):
    id: int
    name: str
    role: str

    model_config = ConfigDict(
        from_attributes=True
    )
```

В `app/api/users.py` добавь импорт:

```python
from app.schemas.user import (
    UserCreate,
    UserOptionRead,
    UserRead,
)
```

Убедись, что импортирован:

```python
from app.api.dependencies import (
    get_current_user,
    require_owner,
)
```

И модель:

```python
from app.models.user import User
```

Добавь endpoint ОБЯЗАТЕЛЬНО ДО `/{user_id}`:

```python
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
```

Почему до `/{user_id}`:

```text
/users/options
```

не должен восприниматься как:

```text
user_id = "options"
```

Теперь оба аккаунта получают только:

```json
[
  {
    "id": 1,
    "name": "Кристина",
    "role": "designer"
  },
  {
    "id": 2,
    "name": "Ольга",
    "role": "owner"
  }
]
```

Email и другие данные для select не нужны.
