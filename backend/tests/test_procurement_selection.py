from sqlalchemy import select
from app.models.procurement_selection import ProcurementVariant, ProjectRoom
from app.models.procurement_item import ProcurementItem
from app.models.payment import Payment
from app.models.waiting_item import WaitingItem
from app.models.agreement import Agreement
from app.models.attachment import Attachment
from app.models.procurement_checkpoint import ProcurementCheckpoint


def ok(r, status=200):
    assert r.status_code == status, r.text
    return r.json() if status != 204 else None


def setup_item(c):
    project=ok(c.post('/projects',json={'name':'Квартира','object_type':'apartment','area':70,'client_name':'Клиент'}),201)
    base=f'/projects/{project["id"]}'
    item=ok(c.post(base+'/procurement-items',json={'name':'Потолочный карниз','room':'Комната Анастасии','category':'Лепной декор','quantity':2}),201)
    return base,item


def test_rooms_are_reused_and_custom_items_need_no_url(ctx):
    c,db,users,who=ctx
    base,item=setup_item(c)
    rooms=ok(c.get(base+'/rooms'))
    assert rooms[0]['id']==item['room_id']
    same=ok(c.post(base+'/rooms',json={'name':'  комната Анастасии  '}),201)
    assert same['id']==item['room_id']
    assert len(ok(c.get(base+'/rooms')))==1
    custom=ok(c.post(base+'/procurement-items',json={'name':'Столярное изделие','sourcing_type':'custom','room_id':same['id'],'notes':'Дуб, по чертежу'}),201)
    assert custom['room']=='Комната Анастасии' and custom['product_url'] is None
    assert c.post(base+'/procurement-items',json={'name':'Товар','room_id':9999}).status_code==400
    assert c.post(base+'/procurement-items',json={'name':'Товар','product_url':'javascript:alert(1)'}).status_code==422


def test_review_selection_permissions_and_prices(ctx):
    c,db,users,who=ctx
    base,item=setup_item(c); url=f'{base}/procurement-items/{item["id"]}'
    who[0]=users[1]
    v=ok(c.post(url+'/variants',json={'title':'Карниз Хайуа','unit_price':1600,'product_url':'https://example.com/cornice','supplier_name':'Поставщик'}),201)
    decision=url+f'/variants/{v["id"]}/decision'
    assert c.patch(decision,json={'status':'selected'}).status_code==403
    ok(c.patch(decision,json={'status':'studio_review'}))
    assert ok(c.get(url))['status']=='studio_review'
    assert c.patch(decision,json={'status':'shortlisted'}).status_code==403
    who[0]=users[0]
    ok(c.patch(decision,json={'status':'shortlisted','reviewer_note':'Подходит по размеру'}))
    ok(c.patch(decision,json={'status':'selected'}))
    result=ok(c.get(url));assert result['selected_variant_id']==v['id'] and float(result['total_amount'])==3200
    assert result['status']=='approved'
    assert c.delete(url+f'/variants/{v["id"]}').status_code==409
    assert c.put(url+f'/variants/{v["id"]}',json={'title':'Изменённый вариант'}).status_code==409
    assert c.patch(url,json={'unit_price':500}).status_code==409
    second=ok(c.post(url+'/variants',json={'title':'Аналог','unit_price':2000}),201)
    for status in ('studio_review','shortlisted','selected'):
        ok(c.patch(url+f'/variants/{second["id"]}/decision',json={'status':status}))
    rows=ok(c.get(url+'/variants'))
    assert sum(v['status']=='selected' for v in rows)==1
    assert ok(c.get(url))['selected_variant_id']==second['id']
    ok(c.patch(url,json={'status':'ordered'}))
    assert c.patch(url+f'/variants/{second["id"]}/decision',json={'status':'candidate'}).status_code==409


def test_edited_variant_needs_review_again_and_project_isolation(ctx):
    c,db,users,who=ctx
    base,item=setup_item(c);url=f'{base}/procurement-items/{item["id"]}'
    v=ok(c.post(url+'/variants',json={'title':'Кресло вариант'}),201)
    for status in ('studio_review','shortlisted'):
        ok(c.patch(url+f'/variants/{v["id"]}/decision',json={'status':status}))
    updated=ok(c.put(url+f'/variants/{v["id"]}',json={'title':'Кресло другой размер'}))
    assert updated['status']=='candidate' and updated['reviewed_by_id'] is None
    other_base,other=setup_item(c)
    assert c.get(other_base+f'/procurement-items/{item["id"]}/variants').status_code==404
    assert c.delete(other_base+f'/procurement-items/{other["id"]}/variants/{v["id"]}').status_code==404


def test_delete_item_preserves_operational_history(ctx):
    c,db,users,who=ctx
    base,item=setup_item(c);url=f'{base}/procurement-items/{item["id"]}'
    v=ok(c.post(url+'/variants',json={'title':'Вариант'}),201)
    for status in ('studio_review','shortlisted','selected'):
        ok(c.patch(url+f'/variants/{v["id"]}/decision',json={'status':status}))
    for model,values in ((Payment,{'title':'Аванс','amount':100,'currency':'RUB','kind':'supplier_payment'}),(WaitingItem,{'title':'Ждём КП','waiting_from':'Поставщик'}),(Agreement,{'with_whom':'Клиент','decision':'Согласовано'})):
        db.add(model(project_id=item['project_id'],procurement_item_id=item['id'],created_by_id=users[0].id,**values))
    db.commit()
    # Endpoint from the existing attachment implementation.
    a=ok(c.post(url+'/attachments',files={'file':('quote.pdf',b'%PDF fixture','application/pdf')}),201)
    who[0]=users[2];assert c.delete(url).status_code==403
    who[0]=users[0];ok(c.delete(url),204)
    assert c.get(url).status_code==404
    for model in (Payment,WaitingItem,Agreement):
        row=db.scalar(select(model));db.refresh(row);assert row.procurement_item_id is None
    assert db.get(Attachment,a['id']) is None
    assert db.scalar(select(ProcurementVariant.id)) is None
    assert db.scalar(select(ProcurementCheckpoint.id).where(ProcurementCheckpoint.item_id==item['id'])) is None
