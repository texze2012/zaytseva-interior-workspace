"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { EmptyState } from "@/components/EmptyState";
import { NewTaskForm } from "@/components/NewTaskForm";
import { PageHeader } from "@/components/PageHeader";
import { Spinner } from "@/components/Spinner";
import { TaskCard } from "@/components/TaskCard";
import { TaskDetailsModal } from "@/components/TaskDetailsModal";
import { ProjectStatusBadge } from "@/components/StatusBadge";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  formatLongDate,
  getProjectProgress,
  projectTypeLabel,
} from "@/lib/format";
import {
  Project,
  ProjectStage,
  Task,
  UserOption,
} from "@/lib/types";

export default function ProjectDetailsPage() {
  const params = useParams<{ id: string }>();
  const projectId = Number(params.id);
  const { token, user } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [stages, setStages] = useState<ProjectStage[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [tab, setTab] = useState<"overview" | "stages" | "tasks">("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    if (!token || !user || Number.isNaN(projectId)) return;

    setLoading(true);
    setError("");

    try {
      const [projectData, stageData, taskData, userData] =
        await Promise.all([
          api.project(token, projectId),
          api.stages(token, projectId),
          api.tasksByProject(token, projectId),
          api.userOptions(token, user),
        ]);

      setProject(projectData);
      setStages(stageData);
      setTasks(taskData);
      setUsers(userData);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Не удалось загрузить проект"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, token, user?.id]);

  const userNameById = useMemo(
    () => new Map(users.map((item) => [item.id, item.name])),
    [users]
  );

  const progress = getProjectProgress(tasks);
  const doneCount = tasks.filter((task) => task.status === "done").length;

  function replaceTask(updated: Task) {
    setTasks((current) =>
      current.map((task) =>
        task.id === updated.id ? updated : task
      )
    );
    setSelectedTask(updated);
  }

  if (loading) {
    return (
      <div className="page-loading">
        <Spinner />
        <span>Открываем проект</span>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="content-page">
        <div className="form-error">
          {error || "Проект не найден"}
        </div>
        <Link href="/projects" className="button button--secondary">
          К проектам
        </Link>
      </div>
    );
  }

  return (
    <div className="content-page">
      <PageHeader
        title={`${project.name} · ${projectTypeLabel[project.object_type]} ${project.area} м²`}
        subtitle={`Заказчик: ${project.client_name}${project.city ? ` · ${project.city}` : ""} · ответственный: ${userNameById.get(project.responsible_id) || `#${project.responsible_id}`}`}
        action={
          <button
            className="button button--primary"
            type="button"
            onClick={() => setShowTaskForm(true)}
          >
            + Добавить задачу
          </button>
        }
      />

      <section className="project-summary">
        <ProjectStatusBadge status={project.status} />
        <strong className="project-summary__progress-number">
          {progress}%
        </strong>
        <div className="progress-track progress-track--large">
          <span style={{ width: `${progress}%` }} />
        </div>
        <span>Дедлайн {formatLongDate(project.deadline)}</span>
        <span>
          {tasks.length} задач · {doneCount} готово
        </span>
      </section>

      <div className="tabs">
        <button
          type="button"
          className={tab === "overview" ? "tab tab--active" : "tab"}
          onClick={() => setTab("overview")}
        >
          Обзор
        </button>
        <button
          type="button"
          className={tab === "stages" ? "tab tab--active" : "tab"}
          onClick={() => setTab("stages")}
        >
          Этапы
        </button>
        <button
          type="button"
          className={tab === "tasks" ? "tab tab--active" : "tab"}
          onClick={() => setTab("tasks")}
        >
          Задачи
        </button>
      </div>

      {showTaskForm ? (
        <NewTaskForm
          projectId={project.id}
          stages={stages}
          onCancel={() => setShowTaskForm(false)}
          onCreated={(task) => {
            setTasks((current) => [task, ...current]);
            setShowTaskForm(false);
            setTab("tasks");
          }}
        />
      ) : null}

      {tab === "overview" ? (
        <section className="project-detail-grid">
          <div className="section">
            <div className="section-heading">
              <div>
                <h2>Этапы проекта</h2>
                <p>Рабочая структура объекта</p>
              </div>
            </div>

            {stages.length ? (
              <div className="stage-list">
                {stages.map((stage) => {
                  const stageTasks = tasks.filter(
                    (task) => task.stage_id === stage.id
                  );
                  const ready = stageTasks.filter(
                    (task) => task.status === "done"
                  ).length;

                  return (
                    <div className="stage-row" key={stage.id}>
                      <span className="stage-row__position">
                        {stage.position}
                      </span>
                      <strong>{stage.name}</strong>
                      <span>
                        {ready}/{stageTasks.length} задач
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                title="Этапов пока нет"
                text="Стандартные этапы должны создаваться вместе с проектом."
              />
            )}
          </div>

          <div className="section section--quiet">
            <div className="section-heading">
              <div>
                <h2>Ближайшие действия</h2>
                <p>Незавершённые задачи проекта</p>
              </div>
            </div>
            <div className="task-list">
              {tasks
                .filter((task) => task.status !== "done")
                .slice(0, 5)
                .map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    projectName={project.name}
                    assigneeName={userNameById.get(task.assignee_id)}
                    onClick={() => setSelectedTask(task)}
                    compact
                  />
                ))}
            </div>
          </div>
        </section>
      ) : null}

      {tab === "stages" ? (
        <section className="section">
          <div className="section-heading">
            <div>
              <h2>Все этапы</h2>
              <p>Порядок работ по объекту</p>
            </div>
          </div>
          <div className="stage-list stage-list--large">
            {stages.map((stage) => {
              const stageTasks = tasks.filter(
                (task) => task.stage_id === stage.id
              );
              return (
                <div className="stage-row" key={stage.id}>
                  <span className="stage-row__position">
                    {stage.position}
                  </span>
                  <div className="stage-row__name">
                    <strong>{stage.name}</strong>
                    <small>
                      {
                        stageTasks.filter(
                          (task) => task.status === "done"
                        ).length
                      }{" "}
                      из {stageTasks.length} задач готово
                    </small>
                  </div>
                  <span className={`status status--${stage.status}`}>
                    {stage.status === "planned"
                      ? "Запланировано"
                      : stage.status === "in_progress"
                        ? "В работе"
                        : "Завершено"}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {tab === "tasks" ? (
        <section className="section">
          <div className="section-heading">
            <div>
              <h2>Задачи проекта</h2>
              <p>{tasks.length} задач</p>
            </div>
          </div>
          {tasks.length ? (
            <div className="task-list">
              {tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  projectName={project.name}
                  assigneeName={userNameById.get(task.assignee_id)}
                  onClick={() => setSelectedTask(task)}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title="Задач пока нет"
              text="Добавьте первую реальную задачу проекта."
              action={
                <button
                  className="button button--primary"
                  onClick={() => setShowTaskForm(true)}
                >
                  Добавить задачу
                </button>
              }
            />
          )}
        </section>
      ) : null}

      {selectedTask ? (
        <TaskDetailsModal
          task={selectedTask}
          projectName={project.name}
          assignees={users}
          onClose={() => setSelectedTask(null)}
          onChanged={replaceTask}
        />
      ) : null}
    </div>
  );
}
