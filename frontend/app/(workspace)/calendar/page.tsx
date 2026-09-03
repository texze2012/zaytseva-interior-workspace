"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/Icon";
import { PageHeader } from "@/components/PageHeader";
import { Spinner } from "@/components/Spinner";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { calendarTypeLabels } from "@/lib/format";
import { CalendarEvent } from "@/lib/types";

type View = "month" | "week" | "list";
function iso(date: Date) { const y = date.getFullYear(); const m = String(date.getMonth() + 1).padStart(2, "0"); const d = String(date.getDate()).padStart(2, "0"); return `${y}-${m}-${d}`; }
function parse(value: string) { const [y, m, d] = value.split("-").map(Number); return new Date(y, m - 1, d); }
function addDays(date: Date, days: number) { const next = new Date(date); next.setDate(next.getDate() + days); return next; }
function startWeek(date: Date) { const copy = new Date(date); const day = copy.getDay() || 7; copy.setDate(copy.getDate() - day + 1); return copy; }
function endWeek(date: Date) { return addDays(startWeek(date), 6); }
function monthRange(date: Date) { return { from: new Date(date.getFullYear(), date.getMonth(), 1), to: new Date(date.getFullYear(), date.getMonth() + 1, 0) }; }
function titleFor(date: Date, view: View) { if (view === "month") return new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" }).format(date); if (view === "week") return `${new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short" }).format(startWeek(date))} — ${new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", year: "numeric" }).format(endWeek(date))}`; return "Выбранный период"; }
function hrefFor(event: CalendarEvent) { if (event.event_type === "waiting") return "/waiting"; if (event.event_type === "delivery") return `/projects/${event.project_id}?tab=procurement&item=${event.entity_id}`; if (event.event_type === "agreement") return `/projects/${event.project_id}?tab=agreements`; if (event.event_type === "project_stage") return `/projects/${event.project_id}?tab=stages`; return `/projects/${event.project_id}?tab=tasks`; }

export default function CalendarPage() {
  const { token } = useAuth();
  const [view, setView] = useState<View>("month"); const [anchor, setAnchor] = useState(() => new Date());
  const initial = monthRange(new Date());
  const [customFrom, setCustomFrom] = useState(iso(initial.from)); const [customTo, setCustomTo] = useState(iso(initial.to));
  const [includeCompleted, setIncludeCompleted] = useState(false); const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  const range = useMemo(() => view === "month" ? monthRange(anchor) : view === "week" ? { from: startWeek(anchor), to: endWeek(anchor) } : { from: parse(customFrom), to: parse(customTo) }, [anchor, customFrom, customTo, view]);
  const load = useCallback(async () => { if (!token || Number.isNaN(range.from.getTime()) || Number.isNaN(range.to.getTime())) return; setLoading(true); setError(""); try { const data = await api.calendar(token, iso(range.from), iso(range.to), includeCompleted); setEvents(data.events.filter((event) => event.event_type !== "payment")); } catch (e) { setError(e instanceof Error ? e.message : "Не удалось загрузить календарь"); } finally { setLoading(false); } }, [includeCompleted, range.from, range.to, token]);
  useEffect(() => { load(); }, [load]);
  const byDate = useMemo(() => { const map = new Map<string, CalendarEvent[]>(); events.forEach((event) => map.set(event.event_date, [...(map.get(event.event_date) || []), event])); return map; }, [events]);
  function previous() { if (view === "month") setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1)); else if (view === "week") setAnchor(addDays(anchor, -7)); }
  function next() { if (view === "month") setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1)); else if (view === "week") setAnchor(addDays(anchor, 7)); }
  function eventRow(event: CalendarEvent, compact = false) { return <Link href={hrefFor(event)} className={`calendar-event calendar-event--${event.event_type} ${event.is_overdue ? "calendar-event--overdue" : ""}`} key={event.id}><span className="calendar-event__type">{calendarTypeLabels[event.event_type]}</span><strong>{event.title}</strong>{!compact ? <small>{event.project_name}{event.subtitle ? ` · ${event.subtitle}` : ""}</small> : null}</Link>; }

  const monthCells = useMemo(() => { if (view !== "month") return []; const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1); const start = startWeek(first); return Array.from({ length: 42 }, (_, index) => addDays(start, index)); }, [anchor, view]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(startWeek(anchor), index)), [anchor]);

  return <div className="content-page"><PageHeader eyebrow="КОНТРОЛЬНЫЕ ДАТЫ" title="Календарь" subtitle="Задачи, ожидания, поставки, этапы и договорённости в одном представлении."/>
    <section className="calendar-toolbar"><div className="view-switch"><button type="button" className={view === "month" ? "active" : ""} onClick={() => setView("month")}>Месяц</button><button type="button" className={view === "week" ? "active" : ""} onClick={() => setView("week")}>Неделя</button><button type="button" className={view === "list" ? "active" : ""} onClick={() => setView("list")}>Период</button></div>{view !== "list" ? <div className="calendar-nav"><button className="icon-button" type="button" onClick={previous}><Icon name="chevronLeft"/></button><strong>{titleFor(anchor, view)}</strong><button className="icon-button" type="button" onClick={next}><Icon name="chevronRight"/></button><button className="button button--secondary button--small" type="button" onClick={() => setAnchor(new Date())}>Сегодня</button></div> : <div className="period-picker"><label><span>С</span><input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)}/></label><label><span>По</span><input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)}/></label></div>}<label className="check-filter"><input type="checkbox" checked={includeCompleted} onChange={(e) => setIncludeCompleted(e.target.checked)}/><span>Показывать завершённое</span></label></section>
    {error ? <div className="form-error">{error}</div> : null}
    {loading ? <div className="page-loading page-loading--inside"><Spinner/><span>Загружаем события</span></div> : <>
      {view === "month" ? <section className="month-calendar"><div className="month-calendar__weekdays">{["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((day) => <span key={day}>{day}</span>)}</div><div className="month-calendar__grid">{monthCells.map((date) => { const dayEvents = byDate.get(iso(date)) || []; const currentMonth = date.getMonth() === anchor.getMonth(); const today = iso(date) === iso(new Date()); return <div className={`month-day ${!currentMonth ? "month-day--outside" : ""} ${today ? "month-day--today" : ""}`} key={iso(date)}><header><span>{date.getDate()}</span>{dayEvents.length ? <small>{dayEvents.length}</small> : null}</header><div className="month-day__events">{dayEvents.slice(0, 3).map((event) => eventRow(event, true))}{dayEvents.length > 3 ? <span className="month-day__more">Ещё {dayEvents.length - 3}</span> : null}</div></div>; })}</div></section> : null}
      {view === "week" ? <section className="week-calendar">{weekDays.map((date) => { const dayEvents = byDate.get(iso(date)) || []; return <div className={`week-day ${iso(date) === iso(new Date()) ? "week-day--today" : ""}`} key={iso(date)}><header><span>{new Intl.DateTimeFormat("ru-RU", { weekday: "short" }).format(date)}</span><strong>{date.getDate()}</strong></header><div>{dayEvents.length ? dayEvents.map((event) => eventRow(event)) : <span className="week-day__empty">Нет событий</span>}</div></div>; })}</section> : null}
      {view === "list" ? <section className="calendar-list">{events.length ? Array.from(byDate.entries()).map(([date, dayEvents]) => <div className="calendar-list__day" key={date}><header><strong>{new Intl.DateTimeFormat("ru-RU", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(parse(date))}</strong><span>{dayEvents.length} событий</span></header><div>{dayEvents.map((event) => eventRow(event))}</div></div>) : <div className="quiet-state">На выбранный период событий нет.</div>}</section> : null}
    </>}
  </div>;
}
