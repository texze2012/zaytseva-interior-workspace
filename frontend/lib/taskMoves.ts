import { apiFetch } from "@/lib/api";
import { personIds } from "@/lib/scheduling";
import { Task, TaskStatus, UserOption } from "@/lib/types";

export interface TaskMoveResult { task: Task; undo_token: string; }

export function allowedTaskMoves(task: Task, user: Pick<UserOption,"id"|"role"> | null): TaskStatus[] {
  if (!user || (user.role !== "owner" && !personIds(task).includes(user.id))) return [];
  if (task.status === "planned") return ["in_progress"];
  if (task.status === "in_progress") return ["review"];
  if (task.status === "review" && user.role === "owner") return ["done", "in_progress"];
  return [];
}

export function moveTask(token: string, task: Task, status: TaskStatus, comment?: string) {
  return apiFetch<TaskMoveResult>(`/tasks/${task.id}/move`, {method:"POST",body:JSON.stringify({
    status, expected_status:task.status, expected_updated_at:task.updated_at,
    ...(comment ? {comment} : {}),
  })}, token);
}

export function undoTaskMove(token: string, taskId: number, undoToken: string) {
  return apiFetch<Task>(`/tasks/${taskId}/move/undo`, {method:"POST",body:JSON.stringify({token:undoToken})}, token);
}
