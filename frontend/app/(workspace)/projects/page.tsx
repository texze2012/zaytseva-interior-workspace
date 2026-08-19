"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { ProjectCard } from "@/components/ProjectCard";
import { Spinner } from "@/components/Spinner";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { getProjectProgress } from "@/lib/format";
import { Project, ProjectStatus, Task } from "@/lib/types";

type ProjectView = {
  project: Project;
  tasks: Task[];
};

const filters: Array<{ label: string; value: "all" | ProjectStatus }> = [
  { label: "Все", value: "all" },
  { label: "В работе", value: "in_progress" },
  { label: "На согласовании", value: "review" },
  { label: "Завершено", value: "completed" },
  { label: "Архив", value: "archived" },
];

export default function ProjectsPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<ProjectView[]>([]);
  const [filter, setFilter] = useState<"all" | ProjectStatus>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const projects = await api.projects(token!);
        const taskLists = await Promise.all(
          projects.map((project) =>
            api.tasksByProject(token!, project.id)
          )
        );

        setItems(
          projects.map((project, index) => ({
            project,
            tasks: taskLists[index],
          }))
        );
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Не удалось загрузить проекты"
        );
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [token]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return items.filter(({ project }) => {
      const matchesFilter =
        filter === "all" || project.status === filter;
      const matchesSearch =
        !query ||
        project.name.toLowerCase().includes(query) ||
        project.client_name.toLowerCase().includes(query) ||
        (project.city || "").toLowerCase().includes(query);

      return matchesFilter && matchesSearch;
    });
  }, [filter, items, search]);

  if (loading) {
    return (
      <div className="page-loading">
        <Spinner />
        <span>Загружаем проекты</span>
      </div>
    );
  }

  return (
    <div className="content-page">
      <PageHeader
        title="Проекты"
        subtitle={`${items.filter((item) => item.project.status !== "archived").length} активных объектов`}
        action={
          <Link href="/projects/new" className="button button--primary">
            + Создать проект
          </Link>
        }
      />

      <div className="filters-bar">
        <div className="filter-chips">
          {filters.map((item) => (
            <button
              key={item.value}
              type="button"
              className={`chip ${filter === item.value ? "chip--active" : ""}`}
              onClick={() => setFilter(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <input
          className="search-input"
          placeholder="Поиск по объектам"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      {error ? <div className="form-error">{error}</div> : null}

      {filtered.length ? (
        <div className="project-grid project-grid--wide">
          {filtered.map(({ project, tasks }) => (
            <ProjectCard
              key={project.id}
              project={project}
              taskCount={tasks.length}
              progress={getProjectProgress(tasks)}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title={items.length ? "Ничего не найдено" : "Проектов пока нет"}
          text={
            items.length
              ? "Измените фильтр или поисковый запрос."
              : "Создайте первый реальный проект студии."
          }
          action={
            items.length ? undefined : (
              <Link href="/projects/new" className="button button--primary">
                Создать проект
              </Link>
            )
          }
        />
      )}
    </div>
  );
}
