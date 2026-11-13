"use client";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatMoney } from "@/lib/format";
import { safeProductLink } from "@/lib/procurement";
import { ProcurementItem, ProcurementVariant, VariantPayload, VariantStatus } from "@/lib/types";
import { ProductPhoto } from "@/components/ProductPhoto";
import { ProductPhotoGallery } from "@/components/ProductPhotoGallery";

const labels: Record<VariantStatus, string> = { candidate:"Подбор",studio_review:"На отборе у руководителя",shortlisted:"Оставлен после отбора",rejected:"Отклонён",selected:"Окончательный выбор" };

function VariantForm({initial,item,onSave,onCancel,busy}: {initial?:ProcurementVariant;item:ProcurementItem;onSave:(p:VariantPayload)=>Promise<void>;onCancel:()=>void;busy:boolean}) {
  const [f,setF]=useState({title:initial?.title||item.name,brand:initial?.brand||"",article:initial?.article||"",supplier_name:initial?.supplier_name||"",product_url:initial?.product_url||"",unit_price:initial?.unit_price==null?"":String(initial.unit_price),currency:initial?.currency||item.currency,notes:initial?.notes||""});
  async function submit(e:FormEvent){e.preventDefault();await onSave({...f,unit_price:f.unit_price?Number(f.unit_price):null,product_url:f.product_url.trim()||null,notes:f.notes.trim()||null});}
  return <form className="variant-editor form-stack" onSubmit={submit}><h4>{initial?"Редактировать вариант":"Новый вариант / аналог"}</h4><div className="form-grid form-grid--2">
    <label className="field field--wide"><span>Название варианта</span><input required minLength={2} maxLength={200} value={f.title} onChange={e=>setF({...f,title:e.target.value})}/></label>
    {([["brand","Бренд"],["article","Артикул"],["supplier_name","Поставщик / изготовитель"]] as const).map(([key,label])=><label key={key} className="field"><span>{label}</span><input value={f[key]} onChange={e=>setF({...f,[key]:e.target.value})}/></label>)}
    <label className="field"><span>Цена за единицу</span><input type="number" min="0" step="0.01" value={f.unit_price} onChange={e=>setF({...f,unit_price:e.target.value})}/></label>
    <label className="field"><span>Валюта</span><input required pattern="[A-Z]{3}" value={f.currency} onChange={e=>setF({...f,currency:e.target.value.toUpperCase()})}/></label>
    <label className="field field--wide"><span>Ссылка на товар</span><input type="url" value={f.product_url} onChange={e=>setF({...f,product_url:e.target.value})}/></label>
    <label className="field field--wide"><span>Комментарий к варианту</span><textarea rows={3} value={f.notes} onChange={e=>setF({...f,notes:e.target.value})}/></label>
  </div><p className="muted">После сохранения добавьте фото в карточке варианта.</p>
  {initial&&initial.status!=="candidate"?<p className="muted">После изменения вариант нужно отправить на отбор повторно.</p>:null}
  <div className="button-row"><button type="button" className="button button--secondary" onClick={onCancel} disabled={busy}>Отмена</button><button className="button button--primary" disabled={busy}>{busy?"Сохраняем…":"Сохранить вариант"}</button></div></form>;
}

export function ProcurementVariants({item,onUpdated,comparison=false}: {item:ProcurementItem;onUpdated:(item:ProcurementItem)=>void;comparison?:boolean}) {
  const {token,user}=useAuth();
  const [variants,setVariants]=useState<ProcurementVariant[]>([]);
  const [editing,setEditing]=useState<ProcurementVariant|null|undefined>(undefined);
  const [deleting,setDeleting]=useState<number|null>(null);
  const [notes,setNotes]=useState<Record<number,string>>({});
  const [busy,setBusy]=useState(false),[error,setError]=useState(""),[loading,setLoading]=useState(true),[showRejected,setShowRejected]=useState(false);
  const [selectedIds,setSelectedIds]=useState<number[]>([]);
  const [compareOpen,setCompareOpen]=useState(false);
  const comparePanel=useRef<HTMLElement>(null);
  const loadGeneration=useRef(0);
  const load=useCallback(async()=>{
    if(!token)return;
    const generation=++loadGeneration.current;
    setError("");
    try {
      const result=await api.variants(token,item.project_id,item.id);
      if(generation!==loadGeneration.current)return;
      setVariants(result);
      setSelectedIds(current=>current.filter(id=>result.some(v=>v.id===id)));
    } catch(e) {if(generation===loadGeneration.current)setError(e instanceof Error?e.message:"Не удалось загрузить варианты");}
    finally {if(generation===loadGeneration.current)setLoading(false);}
  },[token,item.project_id,item.id]);
  useEffect(()=>{setLoading(true);setVariants([]);setSelectedIds([]);setCompareOpen(false);setEditing(undefined);setDeleting(null);setNotes({});void load();return()=>{loadGeneration.current++;};},[load]);
  useEffect(()=>{
    if(compareOpen&&selectedIds.length<2)setCompareOpen(false);
  },[compareOpen,selectedIds.length]);
  useEffect(()=>{
    if(compareOpen){comparePanel.current?.focus({preventScroll:true});comparePanel.current?.scrollIntoView({behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth",block:"nearest"});}
  },[compareOpen]);
  async function refresh(){await load();onUpdated(await api.procurementItem(token!,item.project_id,item.id));}
  async function decide(v:ProcurementVariant,status:VariantStatus){
    if(!token)return;setBusy(true);setError("");
    try{await api.decideVariant(token,item.project_id,item.id,v.id,status,notes[v.id]);await refresh();}
    catch(e){setError(e instanceof Error?e.message:"Не удалось сохранить решение");}finally{setBusy(false);}
  }
  async function save(payload:VariantPayload){
    if(!token)return;setBusy(true);setError("");
    try{if(editing)await api.updateVariant(token,item.project_id,item.id,editing.id,payload);else await api.createVariant(token,item.project_id,item.id,payload);setEditing(undefined);await refresh();}
    catch(e){setError(e instanceof Error?e.message:"Не удалось сохранить вариант");}finally{setBusy(false);}
  }
  async function remove(v:ProcurementVariant){
    if(!token)return;setBusy(true);setError("");
    try{await api.deleteVariant(token,item.project_id,item.id,v.id);setDeleting(null);await refresh();}
    catch(e){setError(e instanceof Error?e.message:"Не удалось удалить вариант");}finally{setBusy(false);}
  }
  function toggleCompare(id:number){
    setSelectedIds(current=>current.includes(id)?current.filter(x=>x!==id):current.length<3?[...current,id]:current);
  }
  const selected=selectedIds.map(id=>variants.find(v=>v.id===id)).filter((v):v is ProcurementVariant=>Boolean(v));
  function decisionButtons(v:ProcurementVariant){
    return <div className="button-row variant-decisions">
      {["candidate","rejected"].includes(v.status)?<button type="button" className="button button--secondary button--small" disabled={busy} onClick={()=>void decide(v,"studio_review")}>Отправить на отбор</button>:null}
      {user?.role==="owner"&&v.status==="studio_review"?<><button type="button" className="button button--primary button--small" disabled={busy} onClick={()=>void decide(v,"shortlisted")}>Оставить для согласования</button><button type="button" className="button button--secondary button--small" disabled={busy} onClick={()=>void decide(v,"rejected")}>Отклонить</button></>:null}
      {user?.role==="owner"&&v.status==="shortlisted"?<><button type="button" className="button button--primary button--small" disabled={busy} onClick={()=>void decide(v,"selected")}>Выбрать окончательно</button><button type="button" className="button button--secondary button--small" disabled={busy} onClick={()=>void decide(v,"rejected")}>Отклонить</button></>:null}
      {user?.role==="owner"&&v.status==="selected"?<button type="button" className="button button--secondary button--small" disabled={busy} onClick={()=>void decide(v,"candidate")}>Отменить окончательный выбор</button>:null}
    </div>;
  }
  function reviewerField(v:ProcurementVariant){
    return user?.role==="owner"&&["studio_review","shortlisted"].includes(v.status)?<label className="field"><span>Комментарий к решению</span><textarea rows={2} value={notes[v.id]||""} onChange={e=>setNotes(current=>({...current,[v.id]:e.target.value}))}/></label>:null;
  }
  return <section className="variants-section variants-section--visual">
    <div className="section-heading"><div><h3>Варианты и аналоги</h3><p>{comparison?"Выберите 2–3 предложения, чтобы сравнить и принять решение.":"Сравните 2–3 варианта рядом, затем отправьте их на отбор."}</p></div><button type="button" className="button button--secondary button--small" disabled={busy} onClick={()=>setEditing(null)}>Добавить вариант</button></div>
    {error?<div className="form-error" role="alert">{error}</div>:null}
    {editing!==undefined?<VariantForm key={editing?.id||"new"} initial={editing||undefined} item={item} busy={busy} onSave={save} onCancel={()=>setEditing(undefined)}/>:null}
    {variants.length>=2?<div className="variant-compare-bar">
      <div><strong>Сравнение вариантов</strong><span aria-live="polite">{selected.length?"Выбрано "+selected.length+" из 3":"Отметьте от 2 до 3 вариантов"}</span></div>
      {selected.length?<div className="variant-compare-bar__selection">{selected.map(v=><button type="button" key={v.id} onClick={()=>toggleCompare(v.id)} aria-label={"Убрать «"+v.title+"» из сравнения"}><span>{v.title}</span><span aria-hidden="true">×</span></button>)}</div>:null}
      <div className="button-row"><button type="button" className="button button--primary button--small" disabled={selected.length<2} onClick={()=>setCompareOpen(true)}>Сравнить{selected.length?" ("+selected.length+")":""}</button>{selected.length?<button type="button" className="button button--ghost button--small" onClick={()=>{setSelectedIds([]);setCompareOpen(false);}}>Сбросить</button>:null}</div>
    </div>:null}
    {compareOpen&&selected.length>=2?<section className="variant-comparison" aria-label="Сравнение выбранных вариантов" ref={comparePanel} tabIndex={-1}>
      <div className="section-heading"><div><h4>Сравниваем {selected.length} варианта</h4><p>Итог рассчитан на {item.quantity} {item.unit}.</p></div><button type="button" className="button button--secondary button--small" onClick={()=>setCompareOpen(false)}>Закрыть сравнение</button></div>
      <div className="variant-comparison__scroll" tabIndex={0} role="region" aria-label="Таблица сравнения. На узком экране прокручивается горизонтально.">
        <table className="variant-comparison__table"><caption>Цена, поставщик и решение по выбранным вариантам</caption><thead><tr><th scope="col">Вариант</th>{selected.map(v=><th scope="col" key={v.id}>{v.title}</th>)}</tr></thead>
          <tbody>
            <tr><th scope="row">Фото</th>{selected.map(v=><td key={v.id}><ProductPhoto target={{projectId:item.project_id,itemId:item.id,variantId:v.id}} alt={v.title}/></td>)}</tr>
            <tr><th scope="row">За единицу</th>{selected.map(v=><td key={v.id}><strong>{formatMoney(v.unit_price,v.currency)}</strong></td>)}</tr>
            <tr><th scope="row">Итого · {item.quantity} {item.unit}</th>{selected.map(v=><td key={v.id}><strong>{formatMoney(v.unit_price===null?null:Number(v.unit_price)*Number(item.quantity),v.currency)}</strong></td>)}</tr>
            <tr><th scope="row">Поставщик</th>{selected.map(v=><td key={v.id}>{v.supplier_name||"Не указан"}</td>)}</tr>
            <tr><th scope="row">Бренд / артикул</th>{selected.map(v=><td key={v.id}>{[v.brand,v.article].filter(Boolean).join(" · ")||"Не указаны"}</td>)}</tr>
            <tr><th scope="row">Статус</th>{selected.map(v=><td key={v.id}><span className={"variant-status variant-status--"+v.status}>{labels[v.status]}</span></td>)}</tr>
            <tr><th scope="row">Комментарий</th>{selected.map(v=><td key={v.id}>{v.notes||"Нет комментария"}{v.reviewer_note?<p className="variant-review-note"><strong>Решение руководителя:</strong> {v.reviewer_note}</p>:null}</td>)}</tr>
            <tr><th scope="row">Предложение</th>{selected.map(v=><td key={v.id}>{safeProductLink(v.product_url)?<a href={safeProductLink(v.product_url)!} className="text-link" target="_blank" rel="noopener noreferrer">Открыть товар ↗</a>:"Ссылка не добавлена"}</td>)}</tr>
            <tr><th scope="row">Действия</th>{selected.map(v=><td key={v.id}>{reviewerField(v)}{decisionButtons(v)}</td>)}</tr>
          </tbody>
        </table>
      </div>
    </section>:null}
    {variants.some(v=>v.status==="rejected")?<label className="check-filter"><input type="checkbox" checked={showRejected} onChange={e=>setShowRejected(e.target.checked)}/>Показать отклонённые ({variants.filter(v=>v.status==="rejected").length})</label>:null}
    {loading?<p>Загружаем варианты…</p>:!variants.length?<p className="quiet-state">Добавляйте подходящие товары и предложения мастерских с фотографиями. Общая позиция останется одна.</p>:null}
    <div className="variant-list variant-list--visual">{variants.filter(v=>showRejected||v.status!=="rejected").map(v=><article className={"variant-card variant-card--"+v.status+(selectedIds.includes(v.id)?" variant-card--comparing":"")} key={v.id}>
      <div className="variant-card__select"><label><input type="checkbox" checked={selectedIds.includes(v.id)} disabled={!selectedIds.includes(v.id)&&selectedIds.length>=3} onChange={()=>toggleCompare(v.id)}/><span>{selectedIds.includes(v.id)?"В сравнении":"Сравнить"}</span><span className="variant-card__select-name">{v.title}</span></label><span className={"variant-status variant-status--"+v.status}>{labels[v.status]}</span></div>
      <ProductPhotoGallery target={{projectId:item.project_id,itemId:item.id,variantId:v.id}} title={v.title} compact readOnly={v.status==="selected"}/>
      <header><h4>{v.title}</h4></header>
      <div className="variant-facts"><strong>{formatMoney(v.unit_price,v.currency)} <small>за единицу</small></strong><span>{[v.brand,v.article,v.supplier_name].filter(Boolean).join(" · ")||"Поставщик пока не указан"}</span></div>
      {safeProductLink(v.product_url)?<a className="button button--secondary product-link" href={safeProductLink(v.product_url)!} target="_blank" rel="noopener noreferrer">Открыть товар / предложение ↗</a>:null}
      {v.notes?<div className="procurement-note"><strong>Комментарий к варианту</strong><p>{v.notes}</p></div>:null}
      {v.reviewer_note?<div className="procurement-note"><strong>Решение руководителя</strong><p>{v.reviewer_note}</p></div>:null}
      {reviewerField(v)}{decisionButtons(v)}
      {v.status!=="selected"?<div className="button-row variant-card__edit"><button type="button" className="button button--secondary button--small" disabled={busy} onClick={()=>setEditing(v)}>Изменить вариант</button><button type="button" className="button button--ghost button--small" disabled={busy} onClick={()=>setDeleting(v.id)}>Удалить вариант</button></div>:null}
      {deleting===v.id?<div className="form-error" role="alert"><p>Удалить вариант «{v.title}», его фотографии и решение отбора?</p><div className="button-row"><button type="button" className="button button--primary button--small" disabled={busy} onClick={()=>void remove(v)}>Да, удалить вариант</button><button type="button" className="button button--secondary button--small" disabled={busy} onClick={()=>setDeleting(null)}>Отмена</button></div></div>:null}
    </article>)}</div>
    {item.selected_variant_id?<p className="muted">Цена, поставщик, артикул и ссылка выбранного варианта перенесены в позицию. Остальные варианты сохранены для истории.</p>:null}
  </section>;
}
