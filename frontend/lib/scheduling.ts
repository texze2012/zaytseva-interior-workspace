export function localDate(value = new Date()) {
  return `${value.getFullYear()}-${String(value.getMonth()+1).padStart(2,"0")}-${String(value.getDate()).padStart(2,"0")}`;
}
export function parseInstant(value: string) { return new Date(/(?:Z|[+-]\d\d:\d\d)$/.test(value) ? value : `${value}Z`); }
export function localTime(value?: string | null) {
  if (!value) return "";
  const d = parseInstant(value); return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}
export function toInstant(date: string, time: string) {
  return date && time ? new Date(`${date}T${time}`).toISOString() : null;
}
export function isOverdue(task: {deadline: string | null; due_at?: string | null; status: string}) {
  return task.status !== "done" && (task.due_at ? parseInstant(task.due_at).getTime() < Date.now() : Boolean(task.deadline && task.deadline < localDate()));
}
export function personIds(task: {assignee_ids?: number[]; assignee_id: number}) { return task.assignee_ids?.length ? task.assignee_ids : [task.assignee_id]; }
