"use client";
import { useStoredState } from "@/lib/useStoredState";
import { DateInput } from "@/components/DateInput";
import { PeopleFilter } from "@/components/ScheduleFields";
import { Modal } from "@/components/Modal";
import { NewTaskForm } from "@/components/NewTaskForm";
import { EntryForm } from "@/components/EntryForm";
import { TaskDetailsModal } from "@/components/TaskDetailsModal";
import { localTime, parseInstant } from "@/lib/scheduling";
import { canEditCalendarSchedule, canMoveCalendarEvent, createCalendarOpenGuard, entryMovePayload, movedCalendarEvent, taskMovePayload } from "@/lib/calendarMoves";
import Link from "next/link";
import { type DragEvent, type FormEvent, type MouseEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { PageHeader } from "@/components/PageHeader";
import { Spinner } from "@/components/Spinner";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { calendarTypeLabels, formatDate } from "@/lib/format";
import { CalendarEvent, Task, ScheduledEntry, UserOption } from "@/lib/types";

type View = "month" | "week" | "list";
type MoveDialog = { event: CalendarEvent; date: string; error: string };
type Notice = { tone: "pending" | "success" | "error"; text: string };
const DRAG_TYPE = "application/x-zaytseva-calendar";
function iso(date: Date) { const y = date.getFullYear(); const m = String(date.getMonth() + 1).padStart(2, "0"); const d = String(date.getDate()).padStart(2, "0"); return `${y}-${m}-${d}`; }
function parse(value: string) { const [y, m, d] = value.split("-").map(Number); return new Date(y, m - 1, d); }
function addDays(date: Date, days: number) { const next = new Date(date); next.setDate(next.getDate() + days); return next; }
function startWeek(date: Date) { const copy = new Date(date); const day = copy.getDay() || 7; copy.setDate(copy.getDate() - day + 1); return copy; }
function endWeek(date: Date) { return addDays(startWeek(date), 6); }
function monthRange(date: Date) { return { from: new Date(date.getFullYear(), date.getMonth(), 1), to: new Date(date.getFullYear(), date.getMonth() + 1, 0) }; }
function titleFor(date: Date, view: View) { if (view === "month") return new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" }).format(date); if (view === "week") return `${new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short" }).format(startWeek(date))} — ${new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", year: "numeric" }).format(endWeek(date))}`; return "Выбранный период"; }
function hrefFor(event: CalendarEvent) { if (event.event_type === "waiting") return "/waiting"; if (event.event_type === "delivery") return `/projects/${event.project_id}?tab=procurement&item=${event.entity_id}`; if (event.event_type === "agreement") return `/projects/${event.project_id}?tab=agreements`; if (event.event_type === "project_stage") return `/projects/${event.project_id}?tab=stages`; return `/projects/${event.project_id}?tab=tasks`; }
function message(error: unknown) { return error instanceof Error ? error.message : "Не удалось выполнить действие."; }

export default function CalendarPage() {
  const { token, user } = useAuth();
  const [users, setUsers] = useState<UserOption[]>([]);
  const [person, setPerson] = useStoredState<string>("calendar:person", "all");
  const [day, setDay] = useState<string | null>(null);
  const [createKind, setCreateKind] = useState<"task" | "events" | "reminders" | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<{ kind: "events" | "reminders"; entry: ScheduledEntry } | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [view, setView] = useState<View>("month");
  const [anchor, setAnchor] = useState(() => new Date());
  const initial = monthRange(new Date());
  const [customFrom, setCustomFrom] = useState(iso(initial.from));
  const [customTo, setCustomTo] = useState(iso(initial.to));
  const [includeCompleted, setIncludeCompleted] = useState(false);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [moveDialog, setMoveDialog] = useState<MoveDialog | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropDay, setDropDay] = useState<string | null>(null);
  const moveInFlight = useRef(false);
  const dragId = useRef<string | null>(null);
  const suppressClickUntil = useRef(0);
  const loadSequence = useRef(0);
  const openGuard = useRef(createCalendarOpenGuard());

  const invalidateOpening = useCallback(() => { openGuard.current.invalidate(); setOpeningId(null); }, []);
  useEffect(() => {
    invalidateOpening();
    const guard = openGuard.current;
    return () => { guard.invalidate(); };
  }, [token, invalidateOpening]);
  function changeCalendar(action: () => void) {
    invalidateOpening(); setSelectedTask(null); setSelectedEntry(null); action();
  }

  useEffect(() => { if (token && user) api.userOptions(token, user).then(setUsers).catch(e => setError(message(e))); }, [token, user]);
  const range = useMemo(() => view === "month" ? { from: startWeek(new Date(anchor.getFullYear(), anchor.getMonth(), 1)), to: addDays(startWeek(new Date(anchor.getFullYear(), anchor.getMonth(), 1)), 41) } : view === "week" ? { from: startWeek(anchor), to: endWeek(anchor) } : { from: parse(customFrom), to: parse(customTo) }, [anchor, customFrom, customTo, view]);
  const load = useCallback(async () => {
    if (!token || moveInFlight.current) return;
    const sequence = ++loadSequence.current;
    if (Number.isNaN(range.from.getTime()) || Number.isNaN(range.to.getTime()) || range.from > range.to) {
      setError("Укажите корректный период: начало не должно быть позже окончания."); setLoading(false); return;
    }
    setLoading(true); setError("");
    try {
      const data = await api.calendar(token, iso(range.from), iso(range.to), includeCompleted, person === "all" ? undefined : person === "mine" ? user?.id : Number(person));
      if (sequence === loadSequence.current && !moveInFlight.current) setEvents(data.events.filter(event => event.event_type !== "payment"));
    } catch (e) { if (sequence === loadSequence.current) setError(message(e)); }
    finally { if (sequence === loadSequence.current) setLoading(false); }
  }, [includeCompleted, range.from, range.to, token, person, user]);
  useEffect(() => { load(); return () => { loadSequence.current++; }; }, [load]);
  const byDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    [...events].sort((a, b) => a.event_date.localeCompare(b.event_date) || (a.due_at || "").localeCompare(b.due_at || "") || a.title.localeCompare(b.title)).forEach(event => map.set(event.event_date, [...(map.get(event.event_date) || []), event]));
    return map;
  }, [events]);
  function previous() { changeCalendar(() => { if (view === "month") setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1)); else if (view === "week") setAnchor(addDays(anchor, -7)); }); }
  function next() { changeCalendar(() => { if (view === "month") setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1)); else if (view === "week") setAnchor(addDays(anchor, 7)); }); }
  function openDay(date: string) { if (moveInFlight.current || Date.now() < suppressClickUntil.current) return; changeCalendar(() => { setDay(date); setCreateKind(null); }); }
  function closeDay() { invalidateOpening(); setDay(null); setCreateKind(null); }
  function startCreating(kind: "task" | "events" | "reminders") { invalidateOpening(); setSelectedTask(null); setSelectedEntry(null); setCreateKind(kind); }
  async function openEvent(event: CalendarEvent) {
    if (!token || moveInFlight.current || Date.now() < suppressClickUntil.current) return;
    const request = openGuard.current.begin();
    setOpeningId(event.id); setSelectedTask(null); setSelectedEntry(null); setDay(null); setCreateKind(null);
    try {
      if (event.event_type === "task") {
        const task = await api.task(token, event.entity_id);
        if (openGuard.current.isCurrent(request)) setSelectedTask(task);
      }
      else if (event.event_type === "event" || event.event_type === "reminder") {
        const kind = event.event_type === "event" ? "events" : "reminders";
        const entry = (await api.entries(token, kind)).find(e => e.id === event.entity_id);
        if (!openGuard.current.isCurrent(request)) return;
        if (!entry) throw new Error("Запись не найдена. Обновите календарь.");
        setSelectedEntry({ kind, entry });
      }
    } catch (e) { if (openGuard.current.isCurrent(request)) setError(message(e)); }
    finally { if (openGuard.current.isCurrent(request)) setOpeningId(null); }
  }
  function openMove(event: CalendarEvent) {
    if (!canMoveCalendarEvent(event, user) || moveInFlight.current || Date.now() < suppressClickUntil.current) return;
    invalidateOpening(); setSelectedTask(null); setSelectedEntry(null); setDay(null); setCreateKind(null); setNotice(null);
    setMoveDialog({ event, date: event.event_date, error: "" });
  }

  async function moveEvent(event: CalendarEvent, targetDate: string) {
    if (!token || !user || moveInFlight.current || !canMoveCalendarEvent(event, user) || targetDate === event.event_date) return;
    invalidateOpening(); setSelectedTask(null); setSelectedEntry(null);
    moveInFlight.current = true; loadSequence.current++;
    setPendingId(event.id); setLoading(false); setError("");
    setNotice({ tone: "pending", text: `Проверяем запись «${event.title}» перед переносом…` });
    setMoveDialog(current => current ? { ...current, error: "" } : null);
    let optimistic = false;
    const before = events.find(row => row.id === event.id) || event;
    try {
      // Read the entity first: calendar rows omit duration, and permissions or
      // completion can change after the calendar was loaded.
      let moved: CalendarEvent;
      if (event.event_type === "task") {
        const task = await api.task(token, event.entity_id);
        if (!canEditCalendarSchedule(task, user)) throw new Error(task.status === "done" ? "Задача уже принята. Обновите календарь." : "Переносить задачу могут исполнители, автор и руководитель.");
        const payload = taskMovePayload(task, targetDate);
        const preview = movedCalendarEvent({ ...before, title: task.title, status: task.status }, targetDate, payload.due_at);
        setEvents(current => current.map(row => row.id === event.id ? preview : row)); optimistic = true;
        setNotice({ tone: "pending", text: `Сохраняем новую дату для «${task.title}»…` });
        const saved = await api.updateTask(token, task.id, { ...payload, expected_updated_at: task.updated_at });
        moved = movedCalendarEvent({ ...preview, title: saved.title, status: saved.status, assignee_ids: saved.assignee_ids }, saved.deadline || targetDate, saved.due_at);
      } else {
        const kind = event.event_type === "event" ? "events" : "reminders";
        const entry = (await api.entries(token, kind)).find(row => row.id === event.entity_id);
        if (!entry) throw new Error("Запись не найдена. Обновите календарь.");
        if (!canEditCalendarSchedule(entry, user)) throw new Error(entry.completed ? "Запись уже завершена. Обновите календарь." : "Переносить запись могут участники, автор и руководитель.");
        const payload = entryMovePayload(entry, targetDate, kind);
        const preview = movedCalendarEvent({ ...before, title: entry.title }, targetDate, payload.due_at);
        setEvents(current => current.map(row => row.id === event.id ? preview : row)); optimistic = true;
        setNotice({ tone: "pending", text: `Сохраняем новую дату для «${entry.title}»…` });
        const saved = await api.updateEntry(token, kind, entry.id, { ...payload, expected_revision: entry.revision });
        moved = movedCalendarEvent({ ...preview, title: saved.title, status: saved.completed ? "done" : "planned", assignee_ids: saved.assignee_ids }, iso(parseInstant(saved.due_at)), saved.due_at);
      }
      const insidePeriod = moved.event_date >= iso(range.from) && moved.event_date <= iso(range.to);
      const selectedPerson = person === "all" ? null : person === "mine" ? user.id : Number(person);
      const visible = insidePeriod && (includeCompleted || moved.status !== "done") && (selectedPerson === null || moved.assignee_ids.includes(selectedPerson));
      setEvents(current => current.flatMap(row => row.id === event.id ? visible ? [moved] : [] : [row]));
      setMoveDialog(null);
      setNotice({ tone: "success", text: `Дата сохранена: ${formatDate(moved.event_date)}${moved.due_at ? `, ${localTime(moved.due_at)}` : ""}.${!insidePeriod ? " Запись теперь вне выбранного периода." : ""}` });
    } catch (e) {
      if (optimistic) setEvents(current => current.map(row => row.id === event.id ? before : row));
      const explanation = `${optimistic ? "Перенос не подтверждён. В календаре показана прежняя дата. " : ""}${message(e)}`;
      setNotice({ tone: "error", text: explanation });
      setMoveDialog(current => current ? { ...current, error: explanation } : null);
    } finally { moveInFlight.current = false; setPendingId(null); }
  }
  function finishDrag() { dragId.current = null; setDraggingId(null); setDropDay(null); suppressClickUntil.current = Date.now() + 250; }
  function dragStart(e: DragEvent<HTMLDivElement>, event: CalendarEvent) {
    if (!canMoveCalendarEvent(event, user) || moveInFlight.current) { e.preventDefault(); return; }
    dragId.current = event.id; setDraggingId(event.id);
    e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData(DRAG_TYPE, event.id);
  }
  function dragOver(e: DragEvent<HTMLDivElement>, date: string) {
    const event = events.find(row => row.id === dragId.current);
    if (!event || !canMoveCalendarEvent(event, user) || moveInFlight.current || event.event_date === date) return;
    e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDropDay(date);
  }
  function drop(e: DragEvent<HTMLDivElement>, date: string) {
    const id = e.dataTransfer.getData(DRAG_TYPE);
    const event = events.find(row => row.id === id);
    if (!event || id !== dragId.current || !canMoveCalendarEvent(event, user)) return;
    e.preventDefault(); e.stopPropagation(); finishDrag(); void moveEvent(event, date);
  }
  function eventRow(event: CalendarEvent, compact = false) {
    const editable = canMoveCalendarEvent(event, user);
    const draggable = editable && view !== "list" && !day && !pendingId;
    const pending = pendingId === event.id;
    const content = <><span className="calendar-event__type">{calendarTypeLabels[event.event_type]} {localTime(event.due_at)}</span><strong>{event.title}</strong>{!compact ? <small>{event.project_name}{event.subtitle ? ` · ${event.subtitle}` : ""}</small> : null}</>;
    const cls = `calendar-event calendar-event--${event.event_type} ${event.is_overdue ? "calendar-event--overdue" : ""}`;
    const interactive = ["task", "event", "reminder"].includes(event.event_type);
    return <div key={event.id} className={`calendar-event-wrap ${editable ? "calendar-event-wrap--movable" : ""} ${draggable ? "calendar-event-wrap--draggable" : ""} ${draggingId === event.id ? "calendar-event-wrap--dragging" : ""} ${pending ? "calendar-event-wrap--pending" : ""} ${event.status === "done" ? "calendar-event-wrap--completed" : ""}`} draggable={draggable} onDragStart={e => dragStart(e, event)} onDragEnd={finishDrag} aria-busy={pending}>
      {interactive ? <button type="button" disabled={Boolean(pendingId)} className={cls} title={event.title} onClick={e => { e.stopPropagation(); void openEvent(event); }}>{content}</button> : <Link draggable={false} href={hrefFor(event)} className={cls} onClick={e => { e.stopPropagation(); invalidateOpening(); }}>{content}</Link>}
      {editable ? <button type="button" className="calendar-move-button" disabled={Boolean(pendingId)} aria-label={`Перенести «${event.title}» на другую дату`} title="Перенести на другую дату" onClick={e => { e.stopPropagation(); openMove(event); }}><Icon name="calendar" size={15}/></button> : null}
      {pending ? <span className="calendar-event__saving">Сохраняем…</span> : null}
    </div>;
  }
  function dayHandlers(date: string) {
    return {
      onDragOver: (e: DragEvent<HTMLDivElement>) => dragOver(e, date),
      onDrop: (e: DragEvent<HTMLDivElement>) => drop(e, date),
      onDragLeave: (e: DragEvent<HTMLDivElement>) => { if (!(e.relatedTarget instanceof Node) || !e.currentTarget.contains(e.relatedTarget)) setDropDay(current => current === date ? null : current); },
      onClick: (e: MouseEvent<HTMLDivElement>) => { if (!(e.target as HTMLElement).closest("button,a,input")) openDay(date); },
    };
  }
  const monthCells = useMemo(() => { if (view !== "month") return []; const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1); const start = startWeek(first); return Array.from({ length: 42 }, (_, index) => addDays(start, index)); }, [anchor, view]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(startWeek(anchor), index)), [anchor]);
  const moving = Boolean(pendingId);
  async function submitMove(e: FormEvent<HTMLFormElement>) { e.preventDefault(); if (moveDialog) await moveEvent(moveDialog.event, moveDialog.date); }

  return <div className="content-page calendar-interactive">
    <PageHeader eyebrow="КОНТРОЛЬНЫЕ ДАТЫ" title="Календарь" subtitle="Задачи, ожидания, поставки, этапы и договорённости в одном представлении." actions={<button type="button" className="button button--primary" disabled={moving} onClick={() => openDay(iso(new Date()))}><Icon name="plus" size={17}/>Создать запись</button>}/>
    <fieldset className="calendar-person-filter" disabled={moving} aria-label="Исполнитель"><PeopleFilter users={users} value={person} onChange={value => changeCalendar(() => setPerson(value))}/></fieldset>
    <section className="calendar-toolbar">
      <div className="view-switch">{([["month", "Месяц"], ["week", "Неделя"], ["list", "Период"]] as const).map(([value, label]) => <button key={value} type="button" disabled={moving} aria-pressed={view === value} className={view === value ? "active" : ""} onClick={() => changeCalendar(() => setView(value))}>{label}</button>)}</div>
      {view !== "list" ? <div className="calendar-nav"><button className="icon-button" type="button" disabled={moving} aria-label="Предыдущий период" onClick={previous}><Icon name="chevronLeft"/></button><strong>{titleFor(anchor, view)}</strong><button className="icon-button" type="button" disabled={moving} aria-label="Следующий период" onClick={next}><Icon name="chevronRight"/></button><button className="button button--secondary button--small" type="button" disabled={moving} onClick={() => changeCalendar(() => setAnchor(new Date()))}>Сегодня</button></div> : <fieldset disabled={moving} className="period-picker calendar-period-picker"><label><span>С</span><DateInput disabled={moving} value={customFrom} onChange={e => changeCalendar(() => setCustomFrom(e.target.value))}/></label><label><span>По</span><DateInput disabled={moving} value={customTo} onChange={e => changeCalendar(() => setCustomTo(e.target.value))}/></label></fieldset>}
      <label className="check-filter"><input type="checkbox" disabled={moving} checked={includeCompleted} onChange={e => changeCalendar(() => setIncludeCompleted(e.target.checked))}/><span>Показывать завершённое</span></label>
    </section>
    <p className="calendar-move-hint"><Icon name="calendar" size={16}/><span>Перетащите задачу или событие на другой день. Кнопка календаря у записи позволяет выбрать дату без перетаскивания.</span></p>
    {openingId ? <div className="calendar-move-notice" role="status"><span><Spinner/></span><p>Открываем запись…</p><button type="button" className="text-link" onClick={invalidateOpening}>Отмена</button></div> : null}
    {notice ? <div className={`calendar-move-notice calendar-move-notice--${notice.tone}`} role={notice.tone === "error" ? "alert" : "status"} aria-live="polite"><span>{notice.tone === "pending" ? <Spinner/> : <Icon name={notice.tone === "success" ? "check" : "alert"} size={18}/>}</span><p>{notice.text}</p>{notice.tone === "error" ? <button type="button" disabled={moving} className="text-link" onClick={() => { setNotice(null); void load(); }}>Обновить календарь</button> : null}{notice.tone !== "pending" ? <button type="button" className="calendar-notice-close" aria-label="Скрыть сообщение" onClick={() => setNotice(null)}><Icon name="close" size={16}/></button> : null}</div> : null}
    {error ? <div className="form-error" role="alert">{error}<button type="button" className="text-link" disabled={moving} onClick={() => void load()}>Повторить загрузку</button></div> : null}
    {loading ? <div className="page-loading page-loading--inside"><Spinner/><span>Загружаем события</span></div> : <>
      {view === "month" ? <section className="month-calendar" aria-label="Календарь на месяц"><div className="month-calendar__weekdays">{["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map(label => <span key={label}>{label}</span>)}</div><div className="month-calendar__grid">{monthCells.map(date => {
        const key = iso(date); const dayEvents = byDate.get(key) || []; const currentMonth = date.getMonth() === anchor.getMonth(); const today = key === iso(new Date());
        return <div {...dayHandlers(key)} className={`month-day ${!currentMonth ? "month-day--outside" : ""} ${today ? "month-day--today" : ""} ${dropDay === key ? "calendar-day--drop-target" : ""}`} key={key}><header><button type="button" disabled={moving} className="day-create" aria-label={`Создать запись на ${formatDate(key)}`} onClick={() => openDay(key)}>{date.getDate()} <span aria-hidden="true">+</span></button>{dayEvents.length ? <small>{dayEvents.length}</small> : null}</header><div className="month-day__events">{dayEvents.slice(0, 3).map(event => eventRow(event, true))}{dayEvents.length > 3 ? <button type="button" disabled={moving} className="month-day__more" onClick={() => openDay(key)}>Ещё {dayEvents.length - 3}</button> : null}</div></div>;
      })}</div></section> : null}
      {view === "week" ? <section className="week-calendar" aria-label="Календарь на неделю">{weekDays.map(date => {
        const key = iso(date); const dayEvents = byDate.get(key) || [];
        return <div {...dayHandlers(key)} className={`week-day ${key === iso(new Date()) ? "week-day--today" : ""} ${dropDay === key ? "calendar-day--drop-target" : ""}`} key={key}><header><span>{new Intl.DateTimeFormat("ru-RU", { weekday: "short" }).format(date)}</span><button type="button" disabled={moving} className="day-create" aria-label={`Создать запись на ${formatDate(key)}`} onClick={() => openDay(key)}>{date.getDate()} <span aria-hidden="true">+</span></button></header><div>{dayEvents.length ? dayEvents.map(event => eventRow(event)) : <span className="week-day__empty">Нет событий</span>}</div></div>;
      })}</section> : null}
      {view === "list" ? <section className="calendar-list">{events.length ? Array.from(byDate.entries()).map(([date, dayEvents]) => <div className="calendar-list__day" key={date}><header><strong>{new Intl.DateTimeFormat("ru-RU", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(parse(date))}</strong><span>{dayEvents.length} событий</span></header><div>{dayEvents.map(event => eventRow(event))}</div></div>) : <div className="quiet-state">На выбранный период событий нет.</div>}</section> : null}
    </>}
    {day ? <Modal title={`Записи на ${formatDate(day)}`} onClose={closeDay}>
      {!createKind ? <><div className="button-row calendar-create-options"><button type="button" className="button button--primary" onClick={() => startCreating("task")}>Задача</button><button type="button" className="button button--secondary" onClick={() => startCreating("events")}>Событие</button><button type="button" className="button button--secondary" onClick={() => startCreating("reminders")}>Напоминание</button></div><div className="form-stack">{(byDate.get(day) || []).map(event => eventRow(event))}{!byDate.get(day)?.length ? <p className="quiet-state">На этот день пока ничего не запланировано.</p> : null}</div></> : createKind === "task" ? <NewTaskForm initialDate={day} onCancel={() => { invalidateOpening(); setCreateKind(null); }} onCreated={() => { closeDay(); void load(); }}/> : <EntryForm kind={createKind} initialDate={day} onCancel={() => { invalidateOpening(); setCreateKind(null); }} onSaved={() => { closeDay(); void load(); }}/>}
    </Modal> : null}
    {moveDialog ? <Modal title="Перенести на другую дату" subtitle={moveDialog.event.title} onClose={() => { if (!moveInFlight.current) setMoveDialog(null); }}>
      <form className="form-stack calendar-move-form" onSubmit={submitMove}>
        <p className="calendar-move-current">Сейчас: <strong>{formatDate(moveDialog.event.event_date)}{moveDialog.event.due_at ? `, ${localTime(moveDialog.event.due_at)}` : ""}</strong></p>
        <fieldset disabled={moving} className="calendar-date-field"><label className="field"><span>Новая дата</span><DateInput required disabled={moving} value={moveDialog.date} onChange={e => setMoveDialog(current => current ? { ...current, date: e.target.value, error: "" } : null)}/></label></fieldset>
        <p className="calendar-move-preserves">{moveDialog.event.due_at ? moveDialog.event.event_type === "event" ? "Точное время, длительность события, участники и напоминания сохранятся." : "Точное время, исполнители и напоминания сохранятся." : "Задача останется без точного времени. Исполнители сохранятся."}<br/><small>Часовой пояс: {Intl.DateTimeFormat().resolvedOptions().timeZone}.</small></p>
        {moveDialog.error ? <div className="form-error" role="alert">{moveDialog.error}</div> : null}
        <div className="form-actions"><button type="button" className="button button--secondary" disabled={moving} onClick={() => setMoveDialog(null)}>Отмена</button><button className="button button--primary" disabled={moving || !moveDialog.date || moveDialog.date === moveDialog.event.event_date}>{moving ? "Сохраняем…" : "Перенести"}</button></div>
      </form>
    </Modal> : null}
    {selectedTask ? <TaskDetailsModal key={selectedTask.id} task={selectedTask} users={users} onClose={() => { invalidateOpening(); setSelectedTask(null); }} onTaskUpdated={task => { setSelectedTask(task); void load(); }} onDeleted={() => { invalidateOpening(); setSelectedTask(null); void load(); }}/> : null}
    {selectedEntry ? <Modal title="Событие / напоминание" onClose={() => { invalidateOpening(); setSelectedEntry(null); }}><EntryForm key={`${selectedEntry.kind}:${selectedEntry.entry.id}`} kind={selectedEntry.kind} entry={selectedEntry.entry} onCancel={() => { invalidateOpening(); setSelectedEntry(null); }} onSaved={() => { invalidateOpening(); setSelectedEntry(null); void load(); }}/></Modal> : null}
  </div>;
}
