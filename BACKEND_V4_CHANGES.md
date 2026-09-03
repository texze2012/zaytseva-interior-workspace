# Zaytseva Interior v4 — backend contract

Frontend v4 expects the backend to support global tasks and owner-managed user roles.

## 1. Task.project_id becomes nullable

In `app/models/task.py`:

```python
project_id: Mapped[int | None] = mapped_column(
    ForeignKey("projects.id"),
    nullable=True,
    index=True,
)
```

`stage_id` remains nullable. A global task must have `project_id=None` and `stage_id=None`.

In `app/schemas/task.py`, change `TaskRead.project_id` to:

```python
project_id: int | None
```

Do not add project_id to the existing `TaskCreate`; the project endpoint still gets project_id from the URL. The new global endpoint creates a task with project_id=None.

Create an Alembic migration and make `tasks.project_id` nullable.

## 2. Global task endpoint

Add:

- `POST /tasks` — create a task with `project_id=None`, `stage_id=None`.
- `PATCH /tasks/{task_id}/status` — same workflow rules as project tasks.
- `GET /tasks/{task_id}/comments`
- `POST /tasks/{task_id}/comments`
- `GET /tasks/{task_id}/comments/{comment_id}/attachments`
- `POST /tasks/{task_id}/comments/{comment_id}/attachments`

The existing project-scoped routes must remain intact.

For global task creation validate the assignee exactly as for a project task. Ignore/reject non-null stage_id when project_id is None.

The existing `GET /tasks` feed must include both project tasks and global tasks. Filters `mine`, `task_status`, `period` continue to work.

Dashboard/calendar must accept tasks with `project_id=None`; use project name `"Общая задача"` when needed, and do not try to look up a project for them.

## 3. User role endpoint

Add owner-only endpoint:

`PATCH /users/{user_id}/role`

Request body:

```json
{ "role": "designer" }
```

or

```json
{ "role": "owner" }
```

Response: existing `UserRead`.

Recommended schema:

```python
class UserRoleUpdate(BaseModel):
    role: UserRole
```

Use `Depends(require_owner)`.

Protect against accidentally removing the last owner from the workspace. At minimum, do not allow the currently authenticated owner to demote themselves until another owner-management flow exists.

## 4. No changes to payment tables

Payment backend can remain for now. Frontend v4 does not use it.
