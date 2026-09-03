"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { Icon } from "@/components/Icon";
import { PageHeader } from "@/components/PageHeader";
import { ProjectCard } from "@/components/ProjectCard";
import { Spinner } from "@/components/Spinner";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Project, ProjectStatus, UserOption } from "@/lib/types";

export default function ProjectsPage() {
  const { token, user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]); const [users, setUsers] = useState<UserOption[]>([]);
  const [status, setStatus] = useState<ProjectStatus | "all">("all"); const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  useEffect(() => { if (!token || !user) return; setLoading(true); Promise.all([api.projects(token), api.userOptions(token, user)]).then(([p, u]) => { setProjects(p); setUsers(u); }).catch((e) => setError(e instanceof Error ? e.message : "Не удалось загрузить проекты")).finally(() => setLoading(false)); }, [token, user]);
  const userMap = useMemo(() => new Map(users.map((x) => [x.id, x.name])), [users]);
  const filtered = useMemo(() => projects.filter((project) => (status === "all" || project.status === status) && [project.name, project.client_name, project.city || "", project.address || ""].join(" ").toLowerCase().includes(query.toLowerCase())), [projects, query, status]);
  if (loading) return <div className="page-loading"><Spinner/><span>Загружаем проекты</span></div>;
  return <div className="content-page"><PageHeader eyebrow="ПРОЕКТЫ" title="Объекты студии" subtitle={`${projects.length} проектов в рабочем пространстве`} actions={<Link href="/projects/new" className="button button--primary"><Icon name="plus" size={17}/>Новый проект</Link>}/>{error ? <div className="form-error">{error}</div> : null}<div className="toolbar"><label className="search-field"><Icon name="search" size={17}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Поиск по проекту, клиенту или адресу"/></label><select className="toolbar-select" value={status} onChange={(e) => setStatus(e.target.value as ProjectStatus | "all")}><option value="all">Все статусы</option><option value="planned">Запланированы</option><option value="in_progress">В работе</option><option value="review">На проверке</option><option value="completed">Завершены</option><option value="archived">Архив</option></select></div>{filtered.length ? <div className="project-grid">{filtered.map((project) => <ProjectCard key={project.id} project={project} responsibleName={userMap.get(project.responsible_id)}/>)}</div> : <EmptyState title="Проекты не найдены" text={projects.length ? "Измените фильтр или поисковый запрос." : "Создайте первый реальный проект студии."} action={!projects.length ? <Link href="/projects/new" className="button button--primary">Создать проект</Link> : undefined}/>}</div>;
}
