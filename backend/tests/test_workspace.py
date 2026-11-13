from datetime import datetime, timedelta, timezone
from sqlalchemy import select
from app.models.scheduling import Notification
from app.models.attachment import Attachment
from app.services.scheduling_service import materialize_notifications, notifications_for


def ok(response, status=200):
    assert response.status_code == status, response.text
    return response.json() if status != 204 else None


def project(c, **values):
    return ok(c.post("/projects", json={"name":"Медведевка", "object_type":"townhouse", "area":120, "client_name":"Клиент", **values}), 201)


def task(c, users, project_id=None, **values):
    return ok(c.post("/tasks", json={"title":"Подготовить счёт", "assignee_ids":[users[0].id, users[1].id], "project_id":project_id, **values}), 201)


def test_project_edit_team_cover_and_stages(ctx):
    c, db, users, _ = ctx
    p = project(c)
    assert "responsible_id" not in p
    p = ok(c.patch(f'/projects/{p["id"]}', json={"name":"Дом семьи", "city":"Калининград", "cover_color":"#aabbcc", "deadline":"2026-12-30"}))
    assert p["city"] == "Калининград"
    assert c.patch(f'/projects/{p["id"]}', json={"cover_color":"broken"}).status_code == 422
    a = ok(c.post(f'/entity-attachments/project/{p["id"]}', files={"file":("cover.png", b"test-image", "image/png")}), 201)
    assert ok(c.patch(f'/projects/{p["id"]}', json={"cover_attachment_id":a["id"]}))["cover_attachment_id"] == a["id"]
    other = project(c, name="Другой дом")
    assert c.patch(f'/projects/{other["id"]}', json={"cover_attachment_id":a["id"]}).status_code == 400
    stages = ok(c.get(f'/projects/{p["id"]}/stages'))
    assert len(stages) > 0
    for stage in stages[:2]:
        assert ok(c.patch(f'/projects/{p["id"]}/stages/{stage["id"]}', json={"status":"completed"}))["status"] == "completed"
    own = ok(c.post(f'/projects/{p["id"]}/stages', json={"name":"Проверка монтажа", "position":len(stages)+1}), 201)
    assert own["name"] == "Проверка монтажа"
    ok(c.delete(f'/attachments/{a["id"]}'), 204)
    assert ok(c.get(f'/projects/{p["id"]}'))["cover_attachment_id"] is None


def test_regression_open_project_and_standalone_task_comments(ctx):
    c, _, users, _ = ctx
    p = project(c)
    other = project(c, name="Другой проект")
    for pid in (p["id"], None):
        t = task(c, users, pid)
        prefix = f'/projects/{pid}/tasks/{t["id"]}' if pid else f'/tasks/{t["id"]}'
        assert ok(c.get(prefix))["id"] == t["id"]
        assert ok(c.get(prefix + "/comments")) == []
        comment = ok(c.post(prefix+"/comments", json={"text":"Согласовать подборку"}), 201)
        assert ok(c.get(prefix+"/comments"))[0]["id"] == comment["id"]
        assert c.get(f'/projects/{other["id"]}/tasks/{t["id"]}/comments').status_code == 404


def test_joint_assignment_workflow_filters_and_edit(ctx):
    c, _, users, who = ctx
    t = task(c, users, deadline="2026-09-10", due_at="2026-09-10T14:00:00+02:00", reminder_offsets=[1440,120,60])
    assert t["assignee_ids"] == [users[0].id, users[1].id]
    assert any(row["id"] == t["id"] for row in ok(c.get(f'/tasks?assignee_id={users[1].id}')))
    who[0] = users[1]
    assert ok(c.get('/tasks?mine=true'))[0]["id"] == t["id"]
    for status in ("in_progress", "review"):
        assert ok(c.patch(f'/tasks/{t["id"]}/status', json={"status":status}))["status"] == status
    assert c.patch(f'/tasks/{t["id"]}/status', json={"status":"done"}).status_code == 409
    moved = ok(c.patch(f'/tasks/{t["id"]}', json={"deadline":"2026-09-11", "due_at":"2026-09-11T17:00:00+02:00", "assignee_ids":[users[1].id]}))
    assert moved["assignee_ids"] == [users[1].id]
    who[0] = users[2]
    assert c.patch(f'/tasks/{t["id"]}', json={"title":"Чужое изменение"}).status_code == 403
    assert c.delete(f'/tasks/{t["id"]}').status_code == 403
    who[0] = users[0]
    assert ok(c.patch(f'/tasks/{t["id"]}/status', json={"status":"done"}))["status"] == "done"


def test_delete_cleans_comments_attachments_and_agreement_reference(ctx):
    from app.models.agreement import Agreement
    c, db, users, _ = ctx
    p = project(c)
    t = task(c, users, p["id"])
    comment = ok(c.post(f'/tasks/{t["id"]}/comments', json={"text":"Документ"}),201)
    a = ok(c.post(f'/entity-attachments/task/{t["id"]}', files={"file":("invoice.pdf",b"%PDF-test","application/pdf")}),201)
    agreement = Agreement(project_id=p["id"], with_whom="Клиент", decision="Счёт согласован", task_id=t["id"], created_by_id=users[0].id)
    db.add(agreement); db.commit()
    ok(c.delete(f'/tasks/{t["id"]}'),204)
    assert c.get(f'/tasks/{t["id"]}').status_code == 404
    assert db.get(Attachment,a["id"]) is None
    db.refresh(agreement)
    assert agreement.task_id is None


def test_reminders_are_separate_and_calendar_has_people_and_time(ctx):
    c, _, users, _ = ctx
    base = {"title":"Позвонить поставщику", "due_at":"2026-09-10T00:30:00+02:00", "assignee_ids":[users[1].id], "reminder_offsets":[1440,120,60]}
    r = ok(c.post('/reminders',json=base),201)
    event = ok(c.post('/events',json={**base, "title":"Встреча с клиентом"}),201)
    assert ok(c.get('/tasks')) == []
    calendar = ok(c.get(f'/calendar?date_from=2026-09-10&date_to=2026-09-10&timezone=Europe/Kaliningrad&assignee_id={users[1].id}'))
    assert {e['event_type'] for e in calendar['events']} == {'reminder','event'}
    assert all(e['due_at'] and e['event_date']=='2026-09-10' for e in calendar['events'])
    assert ok(c.get(f'/calendar?date_from=2026-09-10&date_to=2026-09-10&assignee_id={users[0].id}'))['events'] == []
    assert ok(c.patch(f'/reminders/{r["id"]}',json={"completed":True}))["completed"]
    assert c.post('/events',json={**base,"ends_at":"2026-09-09T00:00:00Z"}).status_code == 400


def test_notifications_multiple_deduplicated_and_rescheduled(ctx):
    c, db, users, _ = ctx
    anchor = datetime.now(timezone.utc) + timedelta(minutes=30)
    t = task(c, users, deadline=anchor.date().isoformat(),due_at=anchor.isoformat(),reminder_offsets=[1440,120,60])
    materialize_notifications(db)
    materialize_notifications(db)
    assert len(list(db.scalars(select(Notification)))) == 6
    assert len(notifications_for(db,users[0])) == 3
    notification = notifications_for(db,users[0])[0]
    ok(c.patch(f'/notifications/{notification.id}/read'),204)
    assert len(notifications_for(db,users[0])) == 2
    later = anchor + timedelta(days=7)
    ok(c.patch(f'/tasks/{t["id"]}',json={"deadline":later.date().isoformat(),"due_at":later.isoformat()}))
    assert notifications_for(db,users[0]) == []
    materialize_notifications(db,now=later-timedelta(minutes=30))
    assert len(list(db.scalars(select(Notification)))) == 12


def test_waiting_schedule_and_validation(ctx):
    c, _, users, _ = ctx
    p=project(c)
    payload={"title":"Ждём КП", "waiting_from":"Поставщик", "requested_at":"2026-09-01", "next_reminder_date":"2026-09-10", "due_at":"2026-09-10T10:00:00Z", "reminder_offsets":[1440,120,60], "assignee_ids":[users[1].id]}
    w=ok(c.post(f'/projects/{p["id"]}/waiting-items',json=payload),201)
    assert w['reminder_offsets'] == [1440,120,60]
    moved=ok(c.patch(f'/waiting-items/{w["id"]}',json={"next_reminder_date":"2026-09-11"}))
    assert moved['due_at'] is None and moved['reminder_offsets']==[]
    assert c.post('/tasks',json={"title":"Bad", "assignee_ids":[users[0].id], "reminder_offsets":[60]}).status_code==400
    assert c.post('/tasks',json={"title":"Bad", "assignee_ids":[99999]}).status_code==400
    assert c.post('/tasks',json={"title":"Bad", "assignee_ids":[users[0].id], "due_at":"2026-09-10T10:00:00"}).status_code==422
    assert c.post('/events',json={"title":"Bad", "assignee_ids":[], "due_at":"2026-09-10T10:00:00Z"}).status_code==422
