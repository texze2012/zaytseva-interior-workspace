"use client";
import { TaskQuickActions } from "@/components/TaskQuickActions";
import { localTime, isOverdue } from "@/lib/scheduling";
import { TaskStatusBadge } from "@/components/StatusBadge";
import { formatShortDate, taskPriorityLabels } from "@/lib/format";
import { Task, UserOption } from "@/lib/types";
export function TaskCard({ task, projectName, assigneeName, onClick, users=[], onUpdated }: { task: Task; projectName?: string; assigneeName?: string; onClick?: () => void; users?:UserOption[];onUpdated?:(task:Task)=>void }) {
  return <div className="task-card-wrap"><button type="button" className={`task-card ${isOverdue(task)?"task-card--overdue":""}`} onClick={onClick}><div className="task-card__main"><div className="task-card__title"><strong>{task.title}</strong><TaskStatusBadge status={task.status}/></div><span className={`task-card__project ${task.project_id ? "" : "task-card__project--general"}`}>{projectName || "Общая задача"}</span><div className="task-card__meta">{onUpdated ? (isOverdue(task)?<span>Просрочено · до {formatShortDate(task.deadline)}</span>:null) : <><span>{taskPriorityLabels[task.priority]}</span><span>До {formatShortDate(task.deadline)} {localTime(task.due_at)}{isOverdue(task)?" · Просрочено":""}</span>{assigneeName ? <span>{assigneeName}</span> : null}</>}</div></div></button>{onUpdated?<TaskQuickActions task={task} users={users} onUpdated={onUpdated}/>:null}</div>;
}
