import Link from "next/link";
import { Icon } from "@/components/Icon";
import { ProjectStatusBadge } from "@/components/StatusBadge";
import { formatDate, projectTypeLabels } from "@/lib/format";
import { Project } from "@/lib/types";

export function ProjectCard({ project, responsibleName }: { project: Project; responsibleName?: string }) {
  return <Link href={`/projects/${project.id}`} className="project-card">
    <div className="project-card__top"><div><span className="eyebrow">{projectTypeLabels[project.object_type]}</span><h3>{project.name}</h3></div><ProjectStatusBadge status={project.status}/></div>
    <div className="project-card__meta"><span>Клиент: {project.client_name}</span><span>{project.area} м²</span>{project.city ? <span>{project.city}</span> : null}</div>
    <div className="project-card__footer"><span>Ответственный: {responsibleName || `ID ${project.responsible_id}`}</span><span>Дедлайн: {formatDate(project.deadline)}</span><Icon name="chevronRight" size={18}/></div>
  </Link>;
}
