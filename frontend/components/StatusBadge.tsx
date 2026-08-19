import {
  projectStatusLabel,
  taskStatusLabel,
} from "@/lib/format";
import { ProjectStatus, TaskStatus } from "@/lib/types";

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  return (
    <span className={`status status--${status}`}>
      {taskStatusLabel[status]}
    </span>
  );
}

export function ProjectStatusBadge({
  status,
}: {
  status: ProjectStatus;
}) {
  return (
    <span className={`status status--${status}`}>
      {projectStatusLabel[status]}
    </span>
  );
}
