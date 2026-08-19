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
  UserOption,
} from "@/lib/types";

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function labelForDate(date: Date) {
  return new Intl.DateTimeFormat("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
}

export default function CalendarPage() {
  const { token, user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token || !user) return;

    Promise.all([
      api.taskFeed(token),
      api.projects(token),
      api.userOptions(token, user),
    ])
      .then(([taskData, projectData, userData]) => {
        setTasks(taskData);
        setProjects(projectData);
        setUsers(userData);
      })
      .finally(() => setLoading(false));
  }, [token, user]);

  const projectNameById = useMemo(
    () => new Map(projects.map((project) => [project.id, project.name])),
    [projects]
  );
  const userNameById = useMemo(
    () => new Map(users.map((item) => [item.id, item.name])),
    [users]
  );

  const days = useMemo(() => {
    const result: Date[] = [];
    const today = new Date();

    for (let index = 0; index < 7; index += 1) {
      const day = new Date(today);
      day.setDate(today.getDate() + index);
      result.push(day);
    }
    return result;
  }, []);

  if (loading) {
    return (
      <div className="page-loading">
        <Spinner />
        <span>Собираем календарь</span>
      </div>
    );
  }

  return (
    <div className="content-page">
      <PageHeader
        title="Календарь"
        subtitle="Дедлайны задач на ближайшие семь дней"
      />

      <div className="calendar-week">
        {days.map((day) => {
          const key = dateKey(day);
          const dayTasks = tasks.filter(
            (task) => task.deadline === key && task.status !== "done"
          );

          return (
            <section className="calendar-day" key={key}>
              <div className="calendar-day__head">
                <strong>{labelForDate(day)}</strong>
                <span>{dayTasks.length}</span>
              </div>

              {dayTasks.length ? (
                <div className="task-list">
                  {dayTasks.map((task) => (
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
              ) : (
                <p className="muted">Нет активных дедлайнов.</p>
              )}
            </section>
          );
        })}
      </div>

      {!tasks.some((task) => task.deadline) ? (
        <EmptyState
          title="Дедлайнов пока нет"
          text="Задачи с назначенным сроком автоматически появятся здесь."
        />
      ) : null}

      {selectedTask ? (
        <TaskDetailsModal
          task={selectedTask}
          projectName={projectNameById.get(selectedTask.project_id)}
          assignees={users}
          onClose={() => setSelectedTask(null)}
          onChanged={(updated) => {
            setSelectedTask(updated);
            setTasks((current) =>
              current.map((item) =>
                item.id === updated.id ? updated : item
              )
            );
          }}
        />
      ) : null}
    </div>
  );
}
