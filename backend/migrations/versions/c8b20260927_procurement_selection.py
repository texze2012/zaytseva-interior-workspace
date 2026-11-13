"""Project rooms and product alternatives with studio review."""
from alembic import op
import sqlalchemy as sa

revision = "c8b20260927"
down_revision = "b7a20260906"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table("project_rooms",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("project_id", sa.Integer(), sa.ForeignKey("projects.id"), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("name_key", sa.String(100), nullable=False),
        sa.UniqueConstraint("project_id", "name_key", name="uq_project_room_name"))
    op.create_index("ix_project_rooms_project_id", "project_rooms", ["project_id"])
    op.create_table("procurement_variants",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("item_id", sa.Integer(), sa.ForeignKey("procurement_items.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("product_url", sa.String(1000), nullable=True),
        sa.Column("brand", sa.String(100), nullable=True),
        sa.Column("article", sa.String(100), nullable=True),
        sa.Column("supplier_name", sa.String(255), nullable=True),
        sa.Column("unit_price", sa.Numeric(14,2), nullable=True),
        sa.Column("currency", sa.String(3), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("status", sa.String(30), nullable=False),
        sa.Column("reviewer_note", sa.Text(), nullable=True),
        sa.Column("reviewed_by_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False))
    op.create_index("ix_procurement_variants_item_id", "procurement_variants", ["item_id"])
    op.create_index("ix_procurement_variants_status", "procurement_variants", ["status"])
    with op.batch_alter_table("procurement_items") as batch:
        batch.add_column(sa.Column("room_id", sa.Integer(), nullable=True))
        batch.add_column(sa.Column("sourcing_type", sa.String(20), nullable=False, server_default="retail"))
        batch.add_column(sa.Column("selected_variant_id", sa.Integer(), nullable=True))
        batch.create_foreign_key("fk_procurement_room", "project_rooms", ["room_id"], ["id"])
        batch.create_foreign_key("fk_procurement_selected_variant", "procurement_variants", ["selected_variant_id"], ["id"], ondelete="SET NULL")
        batch.create_index("ix_procurement_items_room_id", ["room_id"])
    # Backfill existing names without guessing which historical duplicates are alternatives.
    op.execute("INSERT INTO project_rooms (project_id, name, name_key) SELECT project_id, MIN(TRIM(room)), LOWER(TRIM(room)) FROM procurement_items WHERE room IS NOT NULL AND TRIM(room) <> '' GROUP BY project_id, LOWER(TRIM(room))")
    op.execute("UPDATE procurement_items SET room_id = (SELECT id FROM project_rooms WHERE project_rooms.project_id = procurement_items.project_id AND project_rooms.name_key = LOWER(TRIM(procurement_items.room))) WHERE room IS NOT NULL AND TRIM(room) <> ''")


def downgrade():
    raise RuntimeError("Восстановите согласованную резервную копию: откат удалит варианты и решения отбора.")
