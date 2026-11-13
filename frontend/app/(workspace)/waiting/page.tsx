"use client";
import { useStoredState } from "@/lib/useStoredState";
import { useCallback, useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { Icon } from "@/components/Icon";
import { Modal } from "@/components/Modal";
import { PageHeader } from "@/components/PageHeader";
import { Spinner } from "@/components/Spinner";
import { WaitingCard } from "@/components/WaitingCard";
import { WaitingForm } from "@/components/WaitingForm";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { ProcurementItem, Project, WaitingItem, WaitingStatus } from "@/lib/types";

export default function WaitingPage() {
  const { token } = useAuth();
  const [focusedId,setFocusedId]=useState<number|null>(null);
  const [items, setItems] = useState<WaitingItem[]>([]); const [projects, setProjects] = useState<Project[]>([]);
  const [status, setStatus] = useStoredState<WaitingStatus | "all">("waiting:status","waiting"); const [dueOnly, setDueOnly] = useState(false); const [query, setQuery] = useStoredState<string>("waiting:query","");
  const [showCreate, setShowCreate] = useState(false); const [createProjectId, setCreateProjectId] = useState(""); const [projectProcurement, setProjectProcurement] = useState<ProcurementItem[]>([]);
  const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  const load = useCallback(async () => { if (!token) return; setLoading(true); setError(""); try { const [list, p] = await Promise.all([api.waitingFeed(token), api.projects(token)]); setItems(list); setProjects(p); setFocusedId(Number(new URLSearchParams(window.location.search).get("waiting"))||null); } catch (e) { setError(e instanceof Error ? e.message : "Не удалось загрузить ожидания"); } finally { setLoading(false); } }, [token]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (!token || !createProjectId) { setProjectProcurement([]); return; } api.procurementItems(token, Number(createProjectId)).then(setProjectProcurement).catch(() => setProjectProcurement([])); }, [createProjectId, token]);
  const projectMap = useMemo(() => new Map(projects.map((x) => [x.id, x.name])), [projects]);
  const filtered = useMemo(() => items.filter((item) => focusedId ? item.id===focusedId : (status === "all" || item.status === status) && (!dueOnly || item.is_reminder_due) && [item.title, item.waiting_from, projectMap.get(item.project_id) || "", item.notes || ""].join(" ").toLowerCase().includes(query.toLowerCase())).sort((a, b) => Number(b.is_reminder_due) - Number(a.is_reminder_due) || String(a.next_reminder_date || "9999").localeCompare(String(b.next_reminder_date || "9999"))), [dueOnly, items, projectMap, query, status, focusedId]);
  function replace(updated: WaitingItem) { setItems((current) => current.map((x) => x.id === updated.id ? updated : x)); }
  if (loading) return <div className="page-loading"><Spinner/><span>Загружаем ожидания</span></div>;
  const dueCount = items.filter((x) => x.status === "waiting" && x.is_reminder_due).length;
  return <div className="content-page"><PageHeader eyebrow="КОНТРОЛЬ ЗАВИСИМОСТЕЙ" title="Жду" subtitle="Всё, что сейчас находится у клиентов, поставщиков и подрядчиков." actions={<button className="button button--primary" type="button" onClick={() => setShowCreate(true)}><Icon name="plus" size={17}/>Добавить ожидание</button>}/>{error ? <div className="form-error">{error}</div> : null}<section className="summary-bar"><div><span>Активно</span><strong>{items.filter((x) => x.status === "waiting").length}</strong></div><div className={dueCount ? "summary-bar__danger" : ""}><span>Требуют напоминания</span><strong>{dueCount}</strong></div><div><span>Закрыто</span><strong>{items.filter((x) => x.status === "resolved").length}</strong></div></section><div className="toolbar"><label className="search-field"><Icon name="search" size={17}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Что ждём, от кого, проект"/></label><select className="toolbar-select" value={status} onChange={(e) => setStatus(e.target.value as WaitingStatus | "all")}><option value="all">Все статусы</option><option value="waiting">Ждём</option><option value="resolved">Получено</option><option value="cancelled">Отменено</option></select><label className="check-filter"><input type="checkbox" checked={dueOnly} onChange={(e) => setDueOnly(e.target.checked)}/><span>Только напоминания</span></label></div>{focusedId?<div className="waiting-focus-note"><span>Ожидание, открытое из главной</span><button className="button button--secondary button--small" onClick={()=>{setFocusedId(null);window.history.replaceState(null,"","/waiting");}}>Показать список</button></div>:null}{filtered.length ? <div className="card-grid-2">{filtered.map((item) => <WaitingCard key={item.id} item={item} projectName={projectMap.get(item.project_id)} onUpdated={replace}/>)}</div> : <EmptyState title="Нет подходящих ожиданий" text={items.length ? "Измените фильтры." : "Когда вы передадите вопрос другой стороне, зафиксируйте его здесь."}/>} {showCreate ? <Modal title="Новое ожидание" subtitle="Выберите проект, к которому относится зависимость" onClose={() => { setShowCreate(false); setCreateProjectId(""); }}><div className="form-stack"><label className="field"><span>Проект</span><select value={createProjectId} onChange={(e) => setCreateProjectId(e.target.value)}><option value="">Выберите проект</option>{projects.filter((p) => p.status !== "archived").map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>{createProjectId ? <WaitingForm projectId={Number(createProjectId)} procurementItems={projectProcurement} onCancel={() => { setShowCreate(false); setCreateProjectId(""); }} onCreated={(item) => { setItems((current) => [item, ...current]); setShowCreate(false); setCreateProjectId(""); }}/>: <p className="muted">После выбора проекта можно связать ожидание с конкретной позицией комплектации.</p>}</div></Modal> : null}</div>;
}
