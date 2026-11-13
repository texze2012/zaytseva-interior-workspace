import os
os.environ["DATABASE_URL"] = "sqlite://"
os.environ["SECRET_KEY"] = "test-only-key-not-used-outside-the-test-suite"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool
from app.main import app
from app.db.session import Base, get_db
from app.api.dependencies import get_current_user
from app.models.user import User
from app.core import storage


@pytest.fixture
def ctx(tmp_path, monkeypatch):
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    @event.listens_for(engine, "connect")
    def foreign_keys(connection, _):
        connection.execute("PRAGMA foreign_keys=ON")
    Base.metadata.create_all(engine)
    db = Session(engine, expire_on_commit=False)
    users = [User(name=name, email=f"user{i}@example.com", password_hash="unused", role=role) for i, (name, role) in enumerate([("Ольга", "owner"), ("Кристина", "designer"), ("Другой дизайнер", "designer")])]
    db.add_all(users)
    db.commit()
    who = [users[0]]
    app.dependency_overrides[get_current_user] = lambda: who[0]
    app.dependency_overrides[get_db] = lambda: db
    monkeypatch.setattr(storage, "UPLOAD_ROOT", tmp_path / "uploads")
    with TestClient(app) as client:
        yield client, db, users, who
    app.dependency_overrides.clear()
    db.close()
    engine.dispose()
