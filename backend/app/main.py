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

from app.api.procurement_items import (
    router as procurement_items_router,
)
from app.api.procurement_checkpoints import (
    router as procurement_checkpoints_router,
)
from app.api.waiting_items import (
    router as waiting_items_router,
)
from app.api.agreements import (
    router as agreements_router,
)
from app.api.payments import (
    router as payments_router,
)
from app.api.calendar import (
    router as calendar_router,
)
from app.api.attachments import (
    router as attachments_router,
)
from app.api.task_global import (
    router as task_global_router,
)

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
app.include_router(procurement_items_router)
app.include_router(procurement_checkpoints_router)
app.include_router(waiting_items_router)
app.include_router(agreements_router)
app.include_router(payments_router)
app.include_router(calendar_router)
app.include_router(
    attachments_router
)
app.include_router(task_global_router)

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
from app.api.scheduling import router as scheduling_router
from app.api.entity_attachments import router as entity_attachments_router
app.include_router(scheduling_router)
app.include_router(entity_attachments_router)
from app.api.procurement_selection import router as procurement_selection_router
app.include_router(procurement_selection_router)
