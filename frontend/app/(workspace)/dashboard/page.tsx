"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { ProjectCard } from "@/components/ProjectCard";
import { Spinner } from "@/components/Spinner";
import { StatCard } from "@/components/StatCard";
import { TaskCard } from "@/components/TaskCard";
import { TaskDetailsModal } from "@/components/TaskDetailsModal";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { getProjectProgress } from "@/lib/format";
import {
  Dashboard,
  Project,
  Task,
  UserOption,
} from "@/lib/types";

type ProjectView = {
  project: Project;
  tasks: Task[];
};

export default function DashboardPage() {
  const { token, user } = useAuth();
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [projects, setProjects] = useState<ProjectView[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    if (!token || !user) return;
    setLoading(true);
    setError("");

    try {
      const [dashboardData, projectList, userList] =
        await Promise.all([
          api.dashboard(token),
          api.projects(token),
          api.userOptions(token, user),
        ]);

      const activeProjects = projectList.filter(
        (project) => project.status !== "archived"
      );

      const tasks = await Promise.all(
        activeProjects.map((project) =>
          api.tasksByProject(token, project.id)
        )
      );

      setDashboard(dashboardData);
      setUsers(userList);
      setProjects(
        activeProjects.map((project, index) => ({
          project,
          tasks: tasks[index],
        }))
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Не удалось загрузить дашборд"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user?.id]);

  const projectNameById = useMemo(
    () =>
      new Map(
        projects.map(({ project }) => [project.id, project.name])
      ),
    [projects]
  );

  const assigneeNameById = useMemo(
    () => new Map(users.map((item) => [item.id, item.name])),
    [users]
  );

  function updateTask(updated: Task) {
    setSelectedTask(updated);
    setDashboard((current) => {
      if (!current) return current;

      const patch = (items: Task[]) =>
        items.map((item) =>
          item.id === updated.id ? updated : item
        );

      return {
        ...current,
        today: patch(current.today),
        overdue: patch(current.overdue),
        in_progress: patch(current.in_progress),
        review: patch(current.review),
      };
    });
    load();
  }

  if (loading) {
    return (
      <div className="page-loading">
        <Spinner />
        <span>Загружаем данные студии</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="content-page">
        <div className="form-error">{error}</div>
        <button className="button button--primary" onClick={load}>
          Повторить
        </button>
      </div>
    );
  }

  const isOwner = user?.role === "owner";

  return (
    <div className="content-page">
      <PageHeader
        title={
          isOwner
            ? "Обзор студии"
            : `Доброе утро, ${user?.name || "Кристина"}`
        }
        subtitle={
          isOwner
            ? "Все объекты, этапы и контрольные точки"
            : "Что делать сегодня и где нужен ваш ответ"
        }
        action={
          <Link className="button button--primary" href="/projects/new">
            + Создать проект
          </Link>
        }
      />

      <section className="stats-grid">
        <StatCard
          label={isOwner ? "Задачи сегодня" : "Сегодня"}
          value={dashboard?.counts.today ?? 0}
          hint="актуальные задачи"
          tone="neutral"
        />
        <StatCard
          label="В работе"
          value={dashboard?.counts.in_progress ?? 0}
          hint="активная работа"
          tone="blue"
        />
        <StatCard
          label="На согласовании"
          value={dashboard?.counts.review ?? 0}
          hint={isOwner ? "ждут вашего решения" : "ожидают Ольгу"}
          tone="sand"
        />
        <StatCard
          label="Просрочено"
          value={dashboard?.counts.overdue ?? 0}
          hint="нужно обратить внимание"
          tone="red"
        />
      </section>

      <section className="section">
        <div className="section-heading">
          <div>
            <h2>{isOwner ? "Состояние объектов" : "Проекты в работе"}</h2>
            <p>Текущий прогресс по реальным задачам</p>
          </div>
          <Link href="/projects">Все проекты →</Link>
        </div>

        {projects.length ? (
          <div className="project-grid">
            {projects.slice(0, isOwner ? 4 : 3).map(({ project, tasks }) => (
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
            title="Проектов пока нет"
            text="Создайте первый реальный объект студии — стандартные этапы появятся автоматически."
            action={
              <Link className="button button--primary" href="/projects/new">
                Создать проект
              </Link>
            }
          />
        )}
      </section>

      <section className="dashboard-columns">
        <div className="section">
          <div className="section-heading">
            <div>
              <h2>{isOwner ? "Ждут согласования" : "Сегодня"}</h2>
              <p>
                {isOwner
                  ? "Работы, по которым требуется решение"
                  : "Ваш приоритет на текущий день"}
              </p>
            </div>
          </div>

          <div className="task-list">
            {(isOwner ? dashboard?.review : dashboard?.today)?.length ? (
              (isOwner ? dashboard?.review : dashboard?.today)?.map(
                (task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    projectName={projectNameById.get(task.project_id)}
                    assigneeName={assigneeNameById.get(task.assignee_id)}
                    onClick={() => setSelectedTask(task)}
                  />
                )
              )
            ) : (
              <EmptyState
                title={isOwner ? "Нечего согласовывать" : "На сегодня пусто"}
                text={
                  isOwner
                    ? "Новые задачи появятся здесь после отправки на согласование."
                    : "Все задачи на сегодня выполнены или ещё не назначены."
                }
              />
            )}
          </div>
        </div>

        <div className="section section--quiet">
          <div className="section-heading">
            <div>
              <h2>Просрочено</h2>
              <p>Задачи с прошедшим дедлайном</p>
            </div>
          </div>

          <div className="task-list">
            {dashboard?.overdue.length ? (
              dashboard.overdue.slice(0, 4).map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  projectName={projectNameById.get(task.project_id)}
                  assigneeName={assigneeNameById.get(task.assignee_id)}
                  onClick={() => setSelectedTask(task)}
                  compact
                />
              ))
            ) : (
              <p className="muted">Просроченных задач нет.</p>
            )}
          </div>
        </div>
      </section>

      {selectedTask ? (
        <TaskDetailsModal
          task={selectedTask}
          projectName={projectNameById.get(selectedTask.project_id)}
          assignees={users}
          onClose={() => setSelectedTask(null)}
          onChanged={updateTask}
        />
      ) : null}
    </div>
  );
}
