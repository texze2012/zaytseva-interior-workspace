import importlib.util
from pathlib import Path
import sqlalchemy as sa
from alembic.migration import MigrationContext
from alembic.operations import Operations
from app.db.session import Base


def test_rooms_migration_retains_old_procurement_data(tmp_path):
    legacy=sa.MetaData()
    for table in Base.metadata.tables.values():
        if table.name in {"project_rooms","procurement_variants"}:
            continue
        cols=[c._copy() for c in table.columns if not (table.name=="procurement_items" and c.name in {"room_id","sourcing_type","selected_variant_id"})]
        sa.Table(table.name,legacy,*cols)
    engine=sa.create_engine(f"sqlite:///{tmp_path/'procurement.db'}")
    legacy.create_all(engine)
    with engine.begin() as conn:
        conn.execute(legacy.tables['users'].insert(),dict(id=1,name='Ольга',email='test@example.com',password_hash='test',role='owner'))
        conn.execute(legacy.tables['projects'].insert(),dict(id=1,name='Проект',object_type='house',area=100,client_name='Клиент',status='in_progress',created_by_id=1))
        conn.execute(legacy.tables['procurement_items'].insert(),[dict(id=1,project_id=1,name='Карниз',room='Комната Анастасии',unit_price=1600,created_by_id=1),dict(id=2,project_id=1,name='Кресло',room=' Комната Анастасии ',unit_price=80000,created_by_id=1)])
        file=Path(__file__).parents[1]/'migrations/versions/c8b20260927_procurement_selection.py'
        spec=importlib.util.spec_from_file_location('procurement_migration',file);module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
        with Operations.context(MigrationContext.configure(conn)):
            module.upgrade()
        assert conn.execute(sa.text('SELECT count(*) FROM project_rooms')).scalar()==1
        assert conn.execute(sa.text('SELECT count(*) FROM procurement_items WHERE room_id IS NOT NULL')).scalar()==2
        assert conn.execute(sa.text('SELECT unit_price FROM procurement_items WHERE id=1')).scalar()==1600
        assert conn.execute(sa.text('SELECT count(*) FROM procurement_variants')).scalar()==0
        assert conn.execute(sa.text('PRAGMA foreign_key_check')).all()==[]
    engine.dispose()
