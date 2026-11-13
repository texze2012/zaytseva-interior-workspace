"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ProcurementItemForm } from "@/components/ProcurementItemForm";
import { ProcurementVariants } from "@/components/ProcurementVariants";
import { ProductPhotoGallery } from "@/components/ProductPhotoGallery";
import { invalidateProductPhotos } from "@/lib/productPhotos";
import { safeProductLink } from "@/lib/procurement";
import { Icon } from "@/components/Icon";
import { AttachmentList } from "@/components/AttachmentList";
import { FilePicker } from "@/components/FilePicker";
import { Modal } from "@/components/Modal";
import { ProcurementStatusBadge } from "@/components/StatusBadge";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDate, formatMoney, procurementStatusLabels } from "@/lib/format";
import { Attachment, ProcurementCheckpoint, ProcurementItem, ProcurementStatus } from "@/lib/types";

export function ProcurementDetailsModal({ item, onClose, onUpdated, onDeleted }: { item: ProcurementItem; onClose: () => void; onUpdated: (item: ProcurementItem) => void; onDeleted?: (id:number)=>void }) {
  const { token, user } = useAuth();
  const [panel,setPanel]=useState("overview");
  const [editing,setEditing]=useState(false);
  const [confirmDelete,setConfirmDelete]=useState(false);
  const [checkpoints, setCheckpoints] = useState<ProcurementCheckpoint[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [statusValue, setStatusValue] = useState<ProcurementStatus>(item.status);
  const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const load = useCallback(async () => { if (!token) return; setLoading(true); setError(""); try { const [cp, at] = await Promise.all([api.checkpoints(token, item.project_id, item.id), api.procurementAttachments(token, item.project_id, item.id)]); setCheckpoints(cp); setAttachments(at); } catch (e) { setError(e instanceof Error ? e.message : "Не удалось загрузить данные позиции"); } finally { setLoading(false); } }, [item.id, item.project_id, token]);
  useEffect(() => { load(); }, [load]);
  useEffect(()=>setStatusValue(item.status),[item.status]);

  const grouped = useMemo(() => ({ before: checkpoints.filter((c) => c.phase === "before_order"), after: checkpoints.filter((c) => c.phase !== "before_order") }), [checkpoints]);
  async function toggle(cp: ProcurementCheckpoint) { if (!token) return; setBusy(true); setError(""); try { const updated = await api.setCheckpoint(token, item.project_id, item.id, cp.id, !cp.is_completed); setCheckpoints((current) => current.map((x) => x.id === updated.id ? updated : x)); } catch (e) { setError(e instanceof Error ? e.message : "Не удалось изменить контрольную точку"); } finally { setBusy(false); } }
  async function changeStatus() { if (!token || statusValue === item.status) return; setBusy(true); setError(""); try { const updated = await api.updateProcurementItem(token, item.project_id, item.id, { status: statusValue }); onUpdated(updated); } catch (e) { setError(e instanceof Error ? e.message : "Не удалось изменить статус"); setStatusValue(item.status); } finally { setBusy(false); } }
  async function upload() { if (!token || !files.length) return; setBusy(true); setError(""); try { for (const file of files) { const uploaded=await api.uploadProcurementAttachment(token, item.project_id, item.id, file); setAttachments(current=>[...current,uploaded]); setFiles(current=>current.filter(f=>f!==file)); invalidateProductPhotos({projectId:item.project_id,itemId:item.id}); } } catch (e) { setError(e instanceof Error ? e.message : "Не удалось загрузить файлы"); } finally { setBusy(false); } }

  function phase(title: string, list: ProcurementCheckpoint[]) { const done = list.filter((c) => c.is_completed).length; return <section className="checkpoint-group"><header><div><strong>{title}</strong><small>{done} из {list.length}</small></div><span>{list.length ? Math.round((done / list.length) * 100) : 0}%</span></header><div className="checkpoint-list">{list.map((cp) => <button type="button" className={`checkpoint ${cp.is_completed ? "checkpoint--done" : ""}`} key={cp.id} disabled={busy} onClick={() => toggle(cp)}><span className="checkpoint__box">{cp.is_completed ? <Icon name="check" size={13}/> : null}</span><span>{cp.label}</span></button>)}</div></section>; }

  async function remove(){if(!token)return;setBusy(true);setError("");try{await api.deleteProcurementItem(token,item.project_id,item.id);onDeleted?.(item.id);onClose();}catch(e){setError(String(e));}finally{setBusy(false);}}
  if(editing)return <Modal title="Редактировать позицию" onClose={()=>setEditing(false)} wide><ProcurementItemForm projectId={item.project_id} item={item} onCancel={()=>setEditing(false)} onCreated={p=>{onUpdated(p);setEditing(false);}}/></Modal>;
  return <Modal title={item.name} subtitle={[item.room,item.category].filter(Boolean).join(" · ")} onClose={onClose} wide>
    {error?<div className="form-error" role="alert">{error}</div>:null}
    <div className="position-summary"><ProcurementStatusBadge status={item.status}/><strong>{formatMoney(item.total_amount,item.currency)}</strong><span>{item.quantity} {item.unit}</span><span>Поставка: {formatDate(item.expected_delivery_date)}</span></div>
    <nav className="position-tabs" aria-label="Разделы позиции">{[["overview","Обзор"],["variants","Варианты"],["control",`Контроль · ${checkpoints.filter(c=>c.is_completed).length}/${checkpoints.length}`],["files",`Файлы · ${attachments.length}`]].map(([id,label])=><button type="button" key={id} aria-pressed={panel===id} className={panel===id?"active":""} onClick={()=>setPanel(id)}>{label}</button>)}</nav>
    <section hidden={panel!=="overview"} className="position-panel">
      <ProductPhotoGallery target={{projectId:item.project_id,itemId:item.id}} title={item.name} onChanged={()=>void load()}/>
      <div className="next-action"><strong>{item.status==="studio_review"?"Следующий шаг: решение руководителя":item.status==="approval"?"Следующий шаг: согласование с клиентом":item.selected_variant_id?"Товар выбран — проверьте готовность к заказу":"Следующий шаг: подберите и сравните варианты"}</strong><button type="button" className="button button--primary" onClick={()=>setPanel(item.selected_variant_id?"control":"variants")}>{item.selected_variant_id?"Проверить перед заказом":"Открыть варианты"}</button></div>
      <div className="procurement-info-grid">{[["Тип",item.sourcing_type==="custom"?"Изготовление на заказ":"Готовый товар"],["Бренд",item.brand],["Артикул",item.article],["Поставщик",item.supplier_name],["Цена за единицу",formatMoney(item.unit_price,item.currency)]].map(([label,value])=><div key={label}><span>{label}</span><strong>{value||"Не указан"}</strong></div>)}</div>
      {item.notes?<section className="procurement-note"><strong>Комментарий и требования</strong><p>{item.notes}</p></section>:null}
      {safeProductLink(item.product_url)?<a className="button button--secondary product-link" href={safeProductLink(item.product_url)!} target="_blank" rel="noopener noreferrer">Открыть товар / изготовителя ↗</a>:null}
      <div className="position-status"><label className="field"><span>Статус позиции</span><select value={statusValue} onChange={e=>setStatusValue(e.target.value as ProcurementStatus)}>{Object.entries(procurementStatusLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label><button className="button button--secondary" disabled={busy||statusValue===item.status} onClick={changeStatus}>Сохранить статус</button></div>
      <div className="button-row"><button className="button button--secondary" onClick={()=>setEditing(true)}>Редактировать позицию</button>{user?.role==="owner"||user?.id===item.created_by_id?<button className="button button--ghost" onClick={()=>setConfirmDelete(true)}>Удалить позицию</button>:null}</div>
      {confirmDelete?<div className="form-error" role="alert"><p>Удалить позицию, варианты, контрольные точки и вложения? Оплаты, ожидания и договорённости сохранятся.</p><div className="button-row"><button className="button button--primary" disabled={busy} onClick={remove}>Да, удалить позицию</button><button className="button button--secondary" disabled={busy} onClick={()=>setConfirmDelete(false)}>Отмена</button></div></div>:null}
    </section>
    <section hidden={panel!=="variants"} className="position-panel"><ProcurementVariants item={item} onUpdated={onUpdated}/></section>
    <section hidden={panel!=="control"} className="position-panel">{loading?<p>Загружаем контрольные точки…</p>:<>{phase("До заказа",grouped.before)}{phase("После заказа",grouped.after)}</>}</section>
    <section hidden={panel!=="files"} className="position-panel"><AttachmentList attachments={attachments} onDeleted={id=>{setAttachments(current=>current.filter(x=>x.id!==id));invalidateProductPhotos({projectId:item.project_id,itemId:item.id});}}/><FilePicker files={files} onFiles={setFiles}/>{files.length?<button className="button button--primary" onClick={upload} disabled={busy}>{busy?"Загружаем…":"Загрузить выбранные файлы"}</button>:null}</section>
  </Modal>;
}
