import {
  formatDate,
  isToday,
  priorityLabel,
} from "@/lib/format";
import { Task } from "@/lib/types";
import { TaskStatusBadge } from "@/components/StatusBadge";

export function TaskCard({
  task,
  projectName,
  assigneeName,
  onClick,
  compact = false,
}: {
  task: Task;
  projectName?: string;
  assigneeName?: string;
  onClick?: () => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`task-card ${compact ? "task-card--compact" : ""}`}
    >
      <div className="task-card__main">
        <strong>{task.title}</strong>
        <span>{projectName || `Проект #${task.project_id}`}</span>
      </div>

      <div className="task-card__meta">
        <TaskStatusBadge status={task.status} />
        <span
          className={`priority priority--${task.priority}`}
        >
          {priorityLabel[task.priority]}
        </span>
        <span className={isToday(task.deadline) ? "deadline-today" : ""}>
          {isToday(task.deadline)
            ? "сегодня"
            : formatDate(task.deadline)}
        </span>
        {assigneeName ? (
          <span className="task-card__assignee">{assigneeName.charAt(0).toUpperCase()}</span>
        ) : null}
      </div>
    </button>
  );
}
