import Link from "next/link";

import {
  formatDate,
  getInitial,
  projectTypeLabel,
} from "@/lib/format";
import { Project } from "@/lib/types";
import { ProjectStatusBadge } from "@/components/StatusBadge";

export function ProjectCard({
  project,
  progress = 0,
  taskCount = 0,
}: {
  project: Project;
  progress?: number;
  taskCount?: number;
}) {
  return (
    <Link href={`/projects/${project.id}`} className="project-card">
      <div className="project-card__heading">
        <span className="project-card__letter">
          {getInitial(project.name)}
        </span>
        <div className="project-card__title">
          <strong>{project.name}</strong>
          <span>
            {projectTypeLabel[project.object_type]} · {project.area} м²
          </span>
        </div>
      </div>

      <div className="project-card__meta">
        <ProjectStatusBadge status={project.status} />
        <span>{taskCount} задач</span>
        <span>до {formatDate(project.deadline)}</span>
      </div>

      <div className="project-card__progress">
        <div className="progress-track">
          <span style={{ width: `${progress}%` }} />
        </div>
        <b>{progress}%</b>
      </div>
    </Link>
  );
}
