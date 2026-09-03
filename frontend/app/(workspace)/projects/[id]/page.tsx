"use client";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AgreementCard } from "@/components/AgreementCard";
import { AgreementForm } from "@/components/AgreementForm";
import { EmptyState } from "@/components/EmptyState";
import { Icon } from "@/components/Icon";
import { Modal } from "@/components/Modal";
import { NewTaskForm } from "@/components/NewTaskForm";
import { PageHeader } from "@/components/PageHeader";
import { ProcurementCard } from "@/components/ProcurementCard";
import { ProcurementDetailsModal } from "@/components/ProcurementDetailsModal";
import { ProcurementItemForm } from "@/components/ProcurementItemForm";
import { ProjectStatusBadge } from "@/components/StatusBadge";
import { Spinner } from "@/components/Spinner";
import { TaskCard } from "@/components/TaskCard";
import { TaskDetailsModal } from "@/components/TaskDetailsModal";
import { WaitingCard } from "@/components/WaitingCard";
import { WaitingForm } from "@/components/WaitingForm";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDate, procurementStatusLabels, projectTypeLabels } from "@/lib/format";
import { Agreement, ProcurementItem, ProcurementStatus, Project, ProjectStage, Task, UserOption, WaitingItem } from "@/lib/types";

type Tab = "overview" | "procurement" | "waiting" | "agreements" | "tasks" | "stages";
type FormModal = "procurement" | "waiting" | "agreement" | "task" | null;
const validTabs = new Set<Tab>(["overview", "procurement", "waiting", "agreements", "tasks", "stages"]);

export default function ProjectDetailsPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const projectId = Number(params.id);
  const { token, user } = useAuth();
  const initialTab = searchParams.get("tab") as Tab | null;
  const [tab, setTab] = useState<Tab>(initialTab && validTabs.has(initialTab) ? initialTab : "overview");
  const [project, setProject] = useState<Project | null>(null);
  const [stages, setStages] = useState<ProjectStage[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [procurement, setProcurement] = useState<ProcurementItem[]>([]);
  const [waiting, setWaiting] = useState<WaitingItem[]>([]);
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [selectedProcurement, setSelectedProcurement] = useState<ProcurementItem | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [formModal, setFormModal] = useState<FormModal>(null);
  const [procurementFilter, setProcurementFilter] = useState<ProcurementStatus | "all">("all");
  const [procurementQuery, setProcurementQuery] = useState("");
  const [loading, setLoading] = useState(true); const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!token || !user || Number.isNaN(projectId)) return;
    setLoading(true); setError("");
    try {
      const [p, s, t, pr, w, a, u] = await Promise.all([
        api.project(token, projectId), api.stages(token, projectId), api.tasksByProject(token, projectId), api.procurementItems(token, projectId), api.waitingByProject(token, projectId), api.agreementsByProject(token, projectId), api.userOptions(token, user),
      ]);
      setProject(p); setStages(s); setTasks(t); setProcurement(pr); setWaiting(w); setAgreements(a); setUsers(u);
      const requestedItem = Number(searchParams.get("item"));
      if (requestedItem) setSelectedProcurement(pr.find((item) => item.id === requestedItem) || null);
    } catch (e) { setError(e instanceof Error ? e.message : "Не удалось загрузить проект"); }
    finally { setLoading(false); }
  }, [projectId, searchParams, token, user]);
  useEffect(() => { load(); }, [load]);

  const userMap = useMemo(() => new Map(users.map((x) => [x.id, x.name])), [users]);
  const procurementMap = useMemo(() => new Map(procurement.map((x) => [x.id, x.name])), [procurement]);
  const filteredProcurement = useMemo(() => procurement.filter((item) => (procurementFilter === "all" || item.status === procurementFilter) && [item.name, item.room || "", item.category || "", item.brand || "", item.article || "", item.supplier_name || ""].join(" ").toLowerCase().includes(procurementQuery.toLowerCase())), [procurement, procurementFilter, procurementQuery]);
  const problems = procurement.filter((x) => x.status === "problem").length;
  const activeWaiting = waiting.filter((x) => x.status === "waiting");
  const dueWaiting = activeWaiting.filter((x) => x.is_reminder_due).length;
  const upcoming = [...procurement].filter((x) => x.expected_delivery_date && !["delivered", "completed"].includes(x.status)).sort((a, b) => String(a.expected_delivery_date).localeCompare(String(b.expected_delivery_date)))[0];

  function replaceProcurement(updated: ProcurementItem) { setProcurement((current) => current.map((x) => x.id === updated.id ? updated : x)); setSelectedProcurement(updated); }
  function replaceWaiting(updated: WaitingItem) { setWaiting((current) => current.map((x) => x.id === updated.id ? updated : x)); }
  function replaceTask(updated: Task) { setTasks((current) => current.map((x) => x.id === updated.id ? updated : x)); setSelectedTask(updated); }

  if (loading) return <div className="page-loading"><Spinner/><span>Открываем проект</span></div>;
  if (error || !project) return <div className="content-page"><div className="form-error">{error || "Проект не найден"}</div><Link href="/projects" className="button button--secondary">К проектам</Link></div>;

  const tabs: Array<{ id: Tab; label: string; count?: number }> = [
    { id: "overview", label: "Обзор" }, { id: "procurement", label: "Комплектация", count: procurement.length }, { id: "waiting", label: "Жду", count: activeWaiting.length }, { id: "agreements", label: "Договорённости", count: agreements.length }, { id: "tasks", label: "Задачи", count: tasks.length }, { id: "stages", label: "Этапы", count: stages.length },
  ];

  return <div className="content-page">
    <div className="back-row"><Link href="/projects" className="text-link"><Icon name="chevronLeft" size={16}/>Все проекты</Link></div>
    <PageHeader eyebrow={`${projectTypeLabels[project.object_type]} · ${project.area} м²`} title={project.name} subtitle={[project.client_name, project.city, project.address].filter(Boolean).join(" · ")} actions={<button type="button" className="button button--primary" onClick={() => setFormModal("procurement")}><Icon name="plus" size={17}/>Добавить позицию</button>}/>
    <section className="project-hero"><div><ProjectStatusBadge status={project.status}/><span>Ответственный: {userMap.get(project.responsible_id) || `ID ${project.responsible_id}`}</span><span>Дедлайн: {formatDate(project.deadline)}</span></div>{project.description ? <p>{project.description}</p> : null}</section>
    <nav className="tabs tabs--scroll">{tabs.map((item) => <button key={item.id} type="button" className={`tab ${tab === item.id ? "tab--active" : ""}`} onClick={() => setTab(item.id)}>{item.label}{item.count !== undefined ? <span>{item.count}</span> : null}</button>)}</nav>

    {tab === "overview" ? <>
      <section className="metric-grid metric-grid--project"><div className="metric-card"><span>Позиций комплектации</span><strong>{procurement.length}</strong><small>{problems ? `${problems} требуют решения` : "Без проблемных позиций"}</small></div><div className="metric-card"><span>В ожидании</span><strong>{activeWaiting.length}</strong><small>{dueWaiting ? `${dueWaiting} требуют напоминания` : "Напоминаний на сегодня нет"}</small></div><div className="metric-card"><span>Активные задачи</span><strong>{tasks.filter((task) => task.status !== "done").length}</strong><small>{tasks.filter((task) => task.status === "review").length ? `${tasks.filter((task) => task.status === "review").length} на согласовании` : "На согласовании задач нет"}</small></div><div className="metric-card"><span>Ближайшая поставка</span><strong className="metric-card__small-value">{upcoming?.name || "—"}</strong><small>{formatDate(upcoming?.expected_delivery_date)}</small></div></section>
      <div className="project-overview-grid"><section className="section"><div className="section-heading"><div><h2>Комплектация</h2><p>Позиции, которые сейчас требуют движения</p></div><button className="text-link" type="button" onClick={() => setTab("procurement")}>Все позиции</button></div><div className="compact-list">{procurement.filter((x) => !["completed", "delivered"].includes(x.status)).slice(0, 6).map((item) => <button type="button" className="compact-row" key={item.id} onClick={() => setSelectedProcurement(item)}><span><strong>{item.name}</strong><small>{[item.room, item.supplier_name].filter(Boolean).join(" · ") || "Без дополнительных данных"}</small></span><span>{procurementStatusLabels[item.status]}</span></button>)}{!procurement.length ? <div className="quiet-state">Позиций пока нет.</div> : null}</div></section><section className="section"><div className="section-heading"><div><h2>Жду</h2><p>Внешние зависимости проекта</p></div><button className="text-link" type="button" onClick={() => setTab("waiting")}>Открыть список</button></div><div className="compact-list">{activeWaiting.slice(0, 6).map((item) => <div className="compact-row" key={item.id}><span><strong>{item.title}</strong><small>{item.waiting_from} · напомнить {formatDate(item.next_reminder_date)}</small></span><span>{item.is_reminder_due ? "Нужно напомнить" : "Ждём"}</span></div>)}{!activeWaiting.length ? <div className="quiet-state">Активных ожиданий нет.</div> : null}</div></section></div>
    </> : null}

    {tab === "procurement" ? <section className="section"><div className="section-heading"><div><h2>Комплектация</h2><p>Контроль позиций от подбора до получения на объекте</p></div><button className="button button--primary button--small" type="button" onClick={() => setFormModal("procurement")}><Icon name="plus" size={16}/>Добавить позицию</button></div><div className="toolbar"><label className="search-field"><Icon name="search" size={17}/><input value={procurementQuery} onChange={(e) => setProcurementQuery(e.target.value)} placeholder="Название, артикул, поставщик, помещение"/></label><select className="toolbar-select" value={procurementFilter} onChange={(e) => setProcurementFilter(e.target.value as ProcurementStatus | "all")}><option value="all">Все статусы</option>{Object.entries(procurementStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>{filteredProcurement.length ? <div className="procurement-grid">{filteredProcurement.map((item) => <ProcurementCard key={item.id} item={item} onClick={() => setSelectedProcurement(item)}/>)}</div> : <EmptyState title="Позиций не найдено" text={procurement.length ? "Измените фильтры." : "Добавьте первую реальную позицию комплектации."}/>}</section> : null}

    {tab === "waiting" ? <section className="section"><div className="section-heading"><div><h2>Жду</h2><p>Ответы и действия, которые сейчас находятся у других людей</p></div><button className="button button--primary button--small" type="button" onClick={() => setFormModal("waiting")}><Icon name="plus" size={16}/>Добавить ожидание</button></div>{waiting.length ? <div className="card-grid-2">{waiting.map((item) => <WaitingCard key={item.id} item={item} procurementName={item.procurement_item_id ? procurementMap.get(item.procurement_item_id) : undefined} onUpdated={replaceWaiting}/>)}</div> : <EmptyState title="Ожиданий пока нет" text="Фиксируйте здесь то, что уже передано клиенту, поставщику или подрядчику и требует контроля."/>}</section> : null}

    {tab === "agreements" ? <section className="section"><div className="section-heading"><div><h2>Договорённости</h2><p>Зафиксированные решения по проекту</p></div><button className="button button--primary button--small" type="button" onClick={() => setFormModal("agreement")}><Icon name="plus" size={16}/>Зафиксировать</button></div>{agreements.length ? <div className="agreement-list">{agreements.map((item) => <AgreementCard key={item.id} item={item} responsibleName={item.responsible_id ? userMap.get(item.responsible_id) : undefined} procurementName={item.procurement_item_id ? procurementMap.get(item.procurement_item_id) : undefined}/>)}</div> : <EmptyState title="Договорённостей пока нет" text="Сохраняйте здесь решения, которые важно не потерять в переписке."/>}</section> : null}

    {tab === "tasks" ? <section className="section"><div className="section-heading"><div><h2>Задачи проекта</h2><p>Конкретные действия команды</p></div><button className="button button--primary button--small" type="button" onClick={() => setFormModal("task")}><Icon name="plus" size={16}/>Добавить задачу</button></div>{tasks.length ? <div className="task-list">{tasks.map((task) => <TaskCard key={task.id} task={task} assigneeName={userMap.get(task.assignee_id)} onClick={() => setSelectedTask(task)}/>)}</div> : <EmptyState title="Задач пока нет" text="Добавьте конкретное действие, когда оно потребуется."/>}</section> : null}

    {tab === "stages" ? <section className="section"><div className="section-heading"><div><h2>Этапы проекта</h2><p>Структура работ по объекту</p></div></div><div className="stage-list">{stages.map((stage) => <div className="stage-row" key={stage.id}><span className="stage-row__position">{stage.position}</span><span><strong>{stage.name}</strong><small>Дедлайн: {formatDate(stage.deadline)}</small></span><span className={`plain-status plain-status--${stage.status}`}>{stage.status === "planned" ? "Запланировано" : stage.status === "in_progress" ? "В работе" : "Завершено"}</span></div>)}</div></section> : null}

    {selectedProcurement ? <ProcurementDetailsModal item={selectedProcurement} onClose={() => setSelectedProcurement(null)} onUpdated={replaceProcurement}/> : null}
    {selectedTask ? <TaskDetailsModal task={selectedTask} projectName={project.name} users={users} onClose={() => setSelectedTask(null)} onTaskUpdated={replaceTask}/> : null}
    {formModal === "procurement" ? <Modal title="Новая позиция комплектации" subtitle={project.name} onClose={() => setFormModal(null)} wide><ProcurementItemForm projectId={project.id} onCancel={() => setFormModal(null)} onCreated={(item) => { setProcurement((current) => [item, ...current]); setFormModal(null); setTab("procurement"); }}/></Modal> : null}
    {formModal === "waiting" ? <Modal title="Новое ожидание" subtitle={project.name} onClose={() => setFormModal(null)}><WaitingForm projectId={project.id} procurementItems={procurement} onCancel={() => setFormModal(null)} onCreated={(item) => { setWaiting((current) => [item, ...current]); setFormModal(null); setTab("waiting"); }}/></Modal> : null}
    {formModal === "agreement" ? <Modal title="Новая договорённость" subtitle={project.name} onClose={() => setFormModal(null)} wide><AgreementForm projectId={project.id} procurementItems={procurement} users={users} onCancel={() => setFormModal(null)} onCreated={(item) => { setAgreements((current) => [item, ...current]); setFormModal(null); setTab("agreements"); }}/></Modal> : null}
    {formModal === "task" ? <Modal title="Новая задача" subtitle={project.name} onClose={() => setFormModal(null)}><NewTaskForm projectId={project.id} stages={stages} onCancel={() => setFormModal(null)} onCreated={(task) => { setTasks((current) => [task, ...current]); setFormModal(null); setTab("tasks"); }}/></Modal> : null}
  </div>;
}
