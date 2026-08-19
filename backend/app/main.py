from fastapi import FastAPI
from sqlalchemy import text


from app.api.auth import router as auth_router
from app.api.users import router as users_router
from app.db.session import engine
from app.api.projects import router as projects_router
from app.api.project_stages import (
    router as project_stages_router,
)
from app.api.tasks import router as tasks_router
from app.api.task_comments import (
    router as task_comments_router,
)
from app.api.task_feed import (
    router as task_feed_router,
)
from app.api.dashboard import (
    router as dashboard_router,
)
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Zaytseva Interior Workspace API",
    version="0.1.0",
)

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

app.include_router(auth_router)
app.include_router(users_router)
app.include_router(projects_router)
app.include_router(project_stages_router)
app.include_router(tasks_router)
app.include_router(task_comments_router)
app.include_router(task_feed_router)
app.include_router(dashboard_router)

@app.get("/health", tags=["System"])
def health_check():
    return {
        "status": "ok"
    }


@app.get("/health/db", tags=["System"])
def database_health_check():
    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))

    return {
        "status": "ok",
        "database": "connected"
    }