import { ProjectCover } from "@/components/ProjectCover";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { ProjectStatusBadge } from "@/components/StatusBadge";
import { formatDate, projectTypeLabels } from "@/lib/format";
import { Project } from "@/lib/types";

export function ProjectCard({ project, responsibleName }: { project: Project; responsibleName?: string }) {
  return <Link href={`/projects/${project.id}`} className="project-card project-card--gallery">
    <div className="project-card__visual">
      <ProjectCover project={project}/>
      <div className="project-card__status"><ProjectStatusBadge status={project.status}/></div>
      <span className="project-card__image-arrow" aria-hidden="true"><Icon name="external" size={20}/></span>
    </div>
    <div className="project-card__content">
      <div className="project-card__type"><span>{projectTypeLabels[project.object_type]}</span><span>{project.area} м²</span></div>
      <h3>{project.name}</h3>
      <p className="project-card__location">{[project.city,project.address].filter(Boolean).join(", ") || "Адрес пока не указан"}</p>
      <div className="project-card__client"><span>Клиент</span><strong>{project.client_name}</strong></div>
      <div className="project-card__details-footer">
        <div className="project-card__deadline"><Icon name="calendar" size={17}/><span><small>Срок проекта</small><strong>{formatDate(project.deadline,"Не указан")}</strong></span></div>
        <span className="project-card__open-label">К проекту<Icon name="chevronRight" size={15}/></span>
      </div>
    </div>
  </Link>;
}
