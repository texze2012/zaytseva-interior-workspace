import type { CalendarEvent, ScheduledEntry, Task, User } from "./types";

type Editor = Pick<User, "id" | "role"> | null;
type OwnedSchedule = {
  assignee_ids?: number[];
  assignee_id?: number;
  created_by_id?: number | null;
  status?: string | null;
  completed?: boolean;
};

/** A date is a local calendar day, not a UTC instant. */
export function calendarDateParts(value: string): [number, number, number] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Выберите корректную дату.");
  const [year, month, day] = value.split("-").map(Number);
  const check = new Date(0);
  check.setUTCHours(12, 0, 0, 0);
  check.setUTCFullYear(year, month - 1, day);
  if (year < 1 || check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) {
    throw new Error("Такой даты нет в календаре.");
  }
  return [year, month, day];
}

function instant(value: string): Date {
  // The same legacy convention as scheduling.parseInstant: offsetless API
  // timestamps are UTC, never the browser's local timezone.
  const result = new Date(/(?:Z|[+-]\d\d:\d\d)$/i.test(value) ? value : `${value}Z`);
  if (Number.isNaN(result.getTime())) throw new Error("Не удалось прочитать время записи. Откройте её карточку.");
  return result;
}

/** Keep the displayed local clock time, even when the UTC offset changes. */
export function moveInstantToDate(value: string, targetDate: string): string {
  const [year, month, day] = calendarDateParts(targetDate);
  const source = instant(value);
  // Do not change the chosen occurrence of an ambiguous autumn clock time when
  // the date is already the requested date.
  if (source.getFullYear() === year && source.getMonth() === month - 1 && source.getDate() === day) return source.toISOString();
  const moved = new Date(source.getTime());
  moved.setFullYear(year, month - 1, day);
  if (moved.getFullYear() !== year || moved.getMonth() !== month - 1 || moved.getDate() !== day
    || moved.getHours() !== source.getHours() || moved.getMinutes() !== source.getMinutes()
    || moved.getSeconds() !== source.getSeconds() || moved.getMilliseconds() !== source.getMilliseconds()) {
    throw new Error("На выбранной дате этого времени нет из-за перевода часов. Измените время в карточке записи.");
  }
  return moved.toISOString();
}

export function canEditCalendarSchedule(record: OwnedSchedule, user: Editor): boolean {
  if (!user || record.completed || record.status === "done" || record.status === "completed") return false;
  const ids = record.assignee_ids?.length ? record.assignee_ids : record.assignee_id ? [record.assignee_id] : [];
  return user.role === "owner" || ids.includes(user.id) || record.created_by_id === user.id;
}

export function canMoveCalendarEvent(event: CalendarEvent, user: Editor): boolean {
  return ["task", "event", "reminder"].includes(event.event_type) && canEditCalendarSchedule(event, user);
}

export function taskMovePayload(task: Task, targetDate: string): { deadline: string; due_at: string | null } {
  calendarDateParts(targetDate);
  if (task.status === "done") throw new Error("Принятую задачу нельзя переносить.");
  // Both fields are necessary: the API deliberately clears the exact schedule
  // when a legacy client sends only a changed deadline. Other fields are omitted
  // so the server retains current assignees and reminder offsets atomically.
  return { deadline: targetDate, due_at: task.due_at ? moveInstantToDate(task.due_at, targetDate) : null };
}

export function entryMovePayload(entry: ScheduledEntry, targetDate: string, kind: "events" | "reminders"): { due_at: string; ends_at?: string } {
  if (entry.completed) throw new Error("Завершённую запись нельзя переносить.");
  return entryTimePayload(entry, moveInstantToDate(entry.due_at, targetDate), kind);
}

/** Used by both calendar moves and the editable form: changing the start shifts
 * the end by the same elapsed time, without inventing an end for open events. */
export function entryTimePayload(entry: Pick<ScheduledEntry, "due_at" | "ends_at"> | undefined, dueAt: string, kind: "events" | "reminders"): { due_at: string; ends_at?: string } {
  const due_at = instant(dueAt).toISOString();
  if (kind === "events" && entry?.ends_at) {
    const duration = instant(entry.ends_at).getTime() - instant(entry.due_at).getTime();
    if (duration <= 0) throw new Error("Окончание события должно быть позже начала. Исправьте его в карточке.");
    return { due_at, ends_at: new Date(instant(due_at).getTime() + duration).toISOString() };
  }
  return { due_at };
}

/** One shared generation for task and entry requests prevents two detail modals
 * from winning independently when responses arrive out of order. */
export function createCalendarOpenGuard() {
  let generation = 0;
  return {
    begin: () => ++generation,
    isCurrent: (request: number) => request === generation,
    invalidate: () => { generation++; },
  };
}

export function movedCalendarEvent(event: CalendarEvent, targetDate: string, dueAt: string | null | undefined, now = new Date()): CalendarEvent {
  calendarDateParts(targetDate);
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  return {
    ...event, event_date: targetDate, due_at: dueAt,
    is_overdue: event.status !== "done" && (dueAt ? instant(dueAt).getTime() < now.getTime() : targetDate < today),
  };
}
