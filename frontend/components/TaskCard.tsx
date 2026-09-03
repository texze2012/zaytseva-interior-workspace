import { TaskStatusBadge } from "@/components/StatusBadge";
import { formatShortDate, taskPriorityLabels } from "@/lib/format";
import { Task } from "@/lib/types";
export function TaskCard({ task, projectName, assigneeName, onClick }: { task: Task; projectName?: string; assigneeName?: string; onClick?: () => void }) {
  return <button type="button" className="task-card" onClick={onClick}><div className="task-card__main"><div className="task-card__title"><strong>{task.title}</strong><TaskStatusBadge status={task.status}/></div><span className={`task-card__project ${task.project_id ? "" : "task-card__project--general"}`}>{projectName || "Общая задача"}</span><div className="task-card__meta"><span>{taskPriorityLabels[task.priority]}</span><span>До {formatShortDate(task.deadline)}</span>{assigneeName ? <span>{assigneeName}</span> : null}</div></div></button>;
}
