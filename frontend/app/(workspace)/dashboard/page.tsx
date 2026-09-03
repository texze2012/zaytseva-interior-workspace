"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { MetricCard } from "@/components/MetricCard";
import { PageHeader } from "@/components/PageHeader";
import { ProcurementStatusBadge, TaskStatusBadge, WaitingStatusBadge } from "@/components/StatusBadge";
import { Spinner } from "@/components/Spinner";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { ProcurementDashboard } from "@/lib/types";

export default function DashboardPage() {
  const { token, user } = useAuth();
  const [data, setData] = useState<ProcurementDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => { if (!token) return; setLoading(true); setError(""); try { setData(await api.procurementDashboard(token)); } catch (e) { setError(e instanceof Error ? e.message : "Не удалось загрузить главную"); } finally { setLoading(false); } }, [token]);
  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="page-loading"><Spinner/><span>Собираем состояние проектов</span></div>;
  return <div className="content-page">
    <PageHeader eyebrow="ОПЕРАЦИОННЫЙ ОБЗОР" title={`Добрый день, ${user?.name?.split(" ")[0] || ""}`} subtitle="Состояние комплектации, ожиданий, задач, поставок и контрольных дат на текущий момент." actions={<button type="button" className="button button--secondary" onClick={load}>Обновить</button>}/>
    {error ? <div className="form-error">{error}</div> : null}
    {data ? <>
      <section className="metric-grid">
        <MetricCard label="Проблемные позиции" value={data.counts.problem_items} tone={data.counts.problem_items ? "danger" : "neutral"} icon="alert"/>
        <MetricCard label="Нужно напомнить" value={data.counts.reminders_due} tone={data.counts.reminders_due ? "warn" : "neutral"} icon="waiting"/>
        <MetricCard label="Всего в ожидании" value={data.counts.waiting} note="Ответы и действия у других людей" icon="waiting"/>
        <MetricCard label="Поставки до 30 дней" value={data.counts.upcoming_deliveries} icon="delivery"/>
        <MetricCard label="Задачи сегодня" value={data.counts.today_tasks} icon="tasks"/>
        <MetricCard label="На согласовании" value={data.counts.review_tasks} tone={data.counts.review_tasks ? "warn" : "neutral"} icon="check"/>
      </section>

      <div className="dashboard-grid">
        <section className="section">
          <div className="section-heading"><div><h2>Требуют внимания</h2><p>Проблемные позиции и ожидания, к которым пора вернуться</p></div></div>
          <div className="attention-list">
            {data.problem_items.map(({ project_name, item }) => <Link href={`/projects/${item.project_id}?tab=procurement&item=${item.id}`} className="attention-row" key={`problem-${item.id}`}><span className="attention-row__icon attention-row__icon--danger"><Icon name="alert" size={17}/></span><span className="attention-row__content"><strong>{item.name}</strong><small>{project_name}{item.supplier_name ? ` · ${item.supplier_name}` : ""}</small></span><ProcurementStatusBadge status={item.status}/><Icon name="chevronRight" size={17}/></Link>)}
            {data.reminders_due.map(({ project_name, waiting_item }) => <Link href="/waiting" className="attention-row" key={`wait-${waiting_item.id}`}><span className="attention-row__icon"><Icon name="waiting" size={17}/></span><span className="attention-row__content"><strong>{waiting_item.title}</strong><small>{project_name} · {waiting_item.waiting_from} · {formatDate(waiting_item.next_reminder_date)}</small></span><WaitingStatusBadge status={waiting_item.status} due={waiting_item.is_reminder_due}/><Icon name="chevronRight" size={17}/></Link>)}
            {!data.problem_items.length && !data.reminders_due.length ? <div className="quiet-state">Сейчас нет критичных элементов, требующих внимания.</div> : null}
          </div>
        </section>

        <section className="section">
          <div className="section-heading"><div><h2>Ближайшие поставки</h2><p>Ожидаемые поставки на 30 дней</p></div><Link href="/calendar" className="text-link">Календарь</Link></div>
          <div className="timeline-list">{data.upcoming_deliveries.length ? data.upcoming_deliveries.map(({ project_name, item }) => <Link href={`/projects/${item.project_id}?tab=procurement&item=${item.id}`} className="timeline-row" key={item.id}><time>{formatDate(item.expected_delivery_date)}</time><span><strong>{item.name}</strong><small>{project_name}{item.supplier_name ? ` · ${item.supplier_name}` : ""}</small></span><ProcurementStatusBadge status={item.status}/></Link>) : <div className="quiet-state">Поставок в ближайшие 30 дней нет.</div>}</div>
        </section>
      </div>

      <div className="dashboard-grid">
        <section className="section"><div className="section-heading"><div><h2>Сегодня</h2><p>Задачи с дедлайном на сегодня</p></div><Link href="/tasks" className="text-link">Все задачи</Link></div><div className="compact-list">{data.today_tasks.length ? data.today_tasks.map(({ project_name, task }) => <Link href={`/projects/${task.project_id}?tab=tasks`} className="compact-row" key={task.id}><span><strong>{task.title}</strong><small>{project_name}</small></span><TaskStatusBadge status={task.status}/></Link>) : <div className="quiet-state">Задач на сегодня нет.</div>}</div></section>
        <section className="section"><div className="section-heading"><div><h2>Последние договорённости</h2><p>За последние семь дней</p></div></div><div className="compact-list">{data.recent_agreements.length ? data.recent_agreements.map(({ project_name, agreement }) => <Link href={`/projects/${agreement.project_id}?tab=agreements`} className="compact-row compact-row--text" key={agreement.id}><span><strong>{agreement.with_whom}</strong><small>{project_name} · {agreement.action || agreement.decision}</small></span><time>{formatDate(agreement.agreement_date)}</time></Link>) : <div className="quiet-state">Новых договорённостей нет.</div>}</div></section>
      </div>
    </> : null}
  </div>;
}
