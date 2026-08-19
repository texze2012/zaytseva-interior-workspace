"use client";

import { useEffect, useMemo, useState } from "react";

import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { Spinner } from "@/components/Spinner";
import { TaskCard } from "@/components/TaskCard";
import { TaskDetailsModal } from "@/components/TaskDetailsModal";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  Project,
  Task,
  TaskStatus,
  UserOption,
} from "@/lib/types";

const tabs: Array<{ label: string; value: "all" | TaskStatus }> = [
  { label: "Все", value: "all" },
  { label: "Запланировано", value: "planned" },
  { label: "В работе", value: "in_progress" },
  { label: "На согласовании", value: "review" },
  { label: "Готово", value: "done" },
];

const columns: Array<{ label: string; value: TaskStatus }> = [
  { label: "Запланировано", value: "planned" },
  { label: "В работе", value: "in_progress" },
  { label: "На согласовании", value: "review" },
  { label: "Готово", value: "done" },
];

export default function TasksPage() {
  const { token, user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [tab, setTab] = useState<"all" | TaskStatus>("all");
  const [mine, setMine] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    if (!token || !user) return;
    setLoading(true);
    setError("");

    try {
      const [taskData, projectData, userData] = await Promise.all([
        api.taskFeed(token, {
          status: tab,
          mine,
        }),
        api.projects(token),
        api.userOptions(token, user),
      ]);

      setTasks(taskData);
      setProjects(projectData);
      setUsers(userData);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Не удалось загрузить задачи"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user?.id, tab, mine]);

  const projectNameById = useMemo(
    () => new Map(projects.map((project) => [project.id, project.name])),
    [projects]
  );

  const userNameById = useMemo(
    () => new Map(users.map((item) => [item.id, item.name])),
    [users]
  );

  function updateTask(updated: Task) {
    setSelectedTask(updated);

    if (tab !== "all" && updated.status !== tab) {
      setTasks((current) =>
        current.filter((task) => task.id !== updated.id)
      );
      return;
    }

    setTasks((current) =>
      current.map((task) =>
        task.id === updated.id ? updated : task
      )
    );
  }

  return (
    <div className="content-page">
      <PageHeader
        title="Задачи"
        subtitle="Работа студии по текущим статусам"
      />

      <div className="filters-bar">
        <div className="filter-chips">
          {tabs.map((item) => (
            <button
              key={item.value}
              type="button"
              className={`chip ${tab === item.value ? "chip--active" : ""}`}
              onClick={() => setTab(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <label className="switch">
          <input
            type="checkbox"
            checked={mine}
            onChange={(event) => setMine(event.target.checked)}
          />
          <span>Мои задачи</span>
        </label>
      </div>

      {error ? <div className="form-error">{error}</div> : null}

      {loading ? (
        <div className="page-loading page-loading--inline">
          <Spinner />
          <span>Загружаем задачи</span>
        </div>
      ) : tasks.length === 0 ? (
        <EmptyState
          title="Задач нет"
          text="Для выбранного фильтра пока нет задач."
        />
      ) : tab === "all" ? (
        <>
          <div className="kanban">
            {columns.map((column) => {
              const columnTasks = tasks.filter(
                (task) => task.status === column.value
              );

              return (
                <section className="kanban-column" key={column.value}>
                  <div className="kanban-column__head">
                    <strong>{column.label}</strong>
                    <span>{columnTasks.length}</span>
                  </div>

                  <div className="kanban-column__body">
                    {columnTasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        projectName={projectNameById.get(task.project_id)}
                        assigneeName={userNameById.get(task.assignee_id)}
                        onClick={() => setSelectedTask(task)}
                        compact
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>

          <div className="mobile-task-list">
            <div className="task-list">
              {tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  projectName={projectNameById.get(task.project_id)}
                  assigneeName={userNameById.get(task.assignee_id)}
                  onClick={() => setSelectedTask(task)}
                />
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="task-list">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              projectName={projectNameById.get(task.project_id)}
              assigneeName={userNameById.get(task.assignee_id)}
              onClick={() => setSelectedTask(task)}
            />
          ))}
        </div>
      )}

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
