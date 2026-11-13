import importlib.util
from pathlib import Path
import sqlalchemy as sa
from alembic.migration import MigrationContext
from alembic.operations import Operations
from app.db.session import Base


def test_upgrade_preserves_existing_project_task_and_assignment(tmp_path):
    """Exercise the new revision over a legacy-shaped database, with real rows."""
    legacy = sa.MetaData()
    added_tables = {"task_assignees", "reminders", "studio_events", "notifications"}
    added_columns = {"projects":{"cover_color", "cover_attachment_id"}, "tasks":{"due_at", "reminder_offsets"}, "waiting_items":{"due_at", "reminder_offsets", "assignee_ids"}}
    for table in Base.metadata.tables.values():
        if table.name in added_tables:
            continue
        columns = [c._copy() for c in table.columns if c.name not in added_columns.get(table.name, set())]
        sa.Table(table.name, legacy, *columns)
    legacy.tables["projects"].c.responsible_id.nullable = False
    engine = sa.create_engine(f"sqlite:///{tmp_path / 'legacy.db'}")
    legacy.create_all(engine)
    with engine.begin() as connection:
        connection.execute(legacy.tables["users"].insert(), {"id":1,"name":"Ольга","email":"test@example.com","password_hash":"test","role":"owner"})
        connection.execute(legacy.tables["projects"].insert(), {"id":1,"name":"Медведевка","object_type":"house","area":120,"client_name":"Клиент","status":"in_progress","responsible_id":1,"created_by_id":1})
        connection.execute(legacy.tables["tasks"].insert(), {"id":1,"title":"Старый счёт","project_id":1,"assignee_id":1,"created_by_id":1})
        migration_file = Path(__file__).parents[1]/"migrations/versions/b7a20260906_workspace_scheduling.py"
        spec = importlib.util.spec_from_file_location("upgrade_workspace", migration_file)
        migration = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(migration)
        with Operations.context(MigrationContext.configure(connection)):
            migration.upgrade()
        assert connection.execute(sa.text("SELECT name FROM projects WHERE id=1")).scalar() == "Медведевка"
        assert connection.execute(sa.text("SELECT user_id FROM task_assignees WHERE task_id=1")).scalar() == 1
        assert connection.execute(sa.text("SELECT reminder_offsets FROM tasks WHERE id=1")).scalar() == "[]"
        assert connection.execute(sa.text("SELECT cover_color FROM projects WHERE id=1")).scalar() == "#c8b8a6"
        assert connection.execute(sa.text("PRAGMA foreign_key_check")).all() == []
    engine.dispose()
