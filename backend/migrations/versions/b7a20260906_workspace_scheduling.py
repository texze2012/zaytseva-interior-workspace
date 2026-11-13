"""Team assignments, covers, reminders, events and durable notifications."""
from alembic import op
import sqlalchemy as sa

revision = "b7a20260906"
down_revision = "1a90bfae4284"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("projects") as batch:
        batch.alter_column("responsible_id", existing_type=sa.Integer(), nullable=True)
        batch.add_column(sa.Column("cover_color", sa.String(7), nullable=False, server_default="#c8b8a6"))
        batch.add_column(sa.Column("cover_attachment_id", sa.Integer(), nullable=True))
        batch.create_foreign_key("fk_project_cover", "attachments", ["cover_attachment_id"], ["id"], ondelete="SET NULL")
    # Existing responsible values are retained only as historical data.
    op.create_table("task_assignees",
        sa.Column("task_id", sa.Integer(), sa.ForeignKey("tasks.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), primary_key=True))
    op.execute("INSERT INTO task_assignees (task_id, user_id) SELECT id, assignee_id FROM tasks")
    for table in ("tasks", "waiting_items"):
        op.add_column(table, sa.Column("due_at", sa.DateTime(timezone=True), nullable=True))
        op.add_column(table, sa.Column("reminder_offsets", sa.JSON(), nullable=False, server_default="[]"))
    op.add_column("waiting_items", sa.Column("assignee_ids", sa.JSON(), nullable=False, server_default="[]"))
    for table in ("reminders", "studio_events"):
        columns = [
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("title", sa.String(200), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("project_id", sa.Integer(), sa.ForeignKey("projects.id"), nullable=True),
            sa.Column("due_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("assignee_ids", sa.JSON(), nullable=False),
            sa.Column("reminder_offsets", sa.JSON(), nullable=False),
            sa.Column("completed", sa.Boolean(), nullable=False),
            sa.Column("created_by_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        ]
        if table == "studio_events":
            columns.append(sa.Column("ends_at", sa.DateTime(timezone=True), nullable=True))
        op.create_table(table, *columns)
        op.create_index(f"ix_{table}_due_at", table, ["due_at"])
    op.create_table("notifications",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("target_type", sa.String(30), nullable=False),
        sa.Column("target_id", sa.Integer(), nullable=False),
        sa.Column("schedule_key", sa.String(80), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("due_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("user_id", "target_type", "target_id", "schedule_key", name="uq_notification_delivery"))
    op.create_index("ix_notifications_user_id", "notifications", ["user_id"])


def downgrade():
    # Deliberately refuse a destructive downgrade after users have entered data.
    raise RuntimeError("Для отката восстановите резервную копию БД и предыдущую версию приложения вместе.")
