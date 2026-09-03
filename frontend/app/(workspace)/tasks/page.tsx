"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { Icon } from "@/components/Icon";
import { Modal } from "@/components/Modal";
import { NewTaskForm } from "@/components/NewTaskForm";
import { PageHeader } from "@/components/PageHeader";
import { Spinner } from "@/components/Spinner";
import { TaskCard } from "@/components/TaskCard";
import { TaskDetailsModal } from "@/components/TaskDetailsModal";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Project, Task, TaskStatus, UserOption } from "@/lib/types";

const columns: Array<{ label: string; value: TaskStatus }> = [
  { label: "Запланировано", value: "planned" },
  { label: "В работе", value: "in_progress" },
  { label: "На согласовании", value: "review" },
  { label: "Принято", value: "done" },
];

export default function TasksPage() {
  const { token, user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [status, setStatus] = useState<TaskStatus | "all">("all");
  const [period, setPeriod] = useState<"all" | "today" | "overdue">("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Task | null>(null);
  const [showNewTask, setShowNewTask] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!token || !user) return;
    setLoading(true);
    setError("");
    try {
      const [list, projectList, userList] = await Promise.all([
        api.taskFeed(token, { mine: user.role === "designer" }),
        api.projects(token),
        api.userOptions(token, user),
      ]);
      setTasks(list);
      setProjects(projectList);
      setUsers(userList);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось загрузить задачи");
    } finally {
      setLoading(false);
    }
  }, [token, user]);

  useEffect(() => { load(); }, [load]);

  const projectMap = useMemo(() => new Map(projects.map((item) => [item.id, item.name])), [projects]);
  const userMap = useMemo(() => new Map(users.map((item) => [item.id, item.name])), [users]);
  const today = new Date().toISOString().slice(0, 10);

  const baseFiltered = useMemo(() => tasks.filter((task) => {
    const periodMatches = period === "all"
      || (period === "today" ? task.deadline === today && task.status !== "done" : Boolean(task.deadline && task.deadline < today && task.status !== "done"));
    const searchMatches = [
      task.title,
      task.description || "",
      (task.project_id ? projectMap.get(task.project_id) : "Общая задача") || "",
      userMap.get(task.assignee_id) || "",
    ].join(" ").toLowerCase().includes(query.toLowerCase());
    return periodMatches && searchMatches;
  }), [period, projectMap, query, tasks, today, userMap]);

  const visibleTasks = useMemo(
    () => status === "all" ? baseFiltered : baseFiltered.filter((task) => task.status === status),
    [baseFiltered, status]
  );

  const counts = useMemo(() => Object.fromEntries(columns.map((column) => [column.value, baseFiltered.filter((task) => task.status === column.value).length])) as Record<TaskStatus, number>, [baseFiltered]);

  function replace(updated: Task) {
    setTasks((current) => current.map((item) => item.id === updated.id ? updated : item));
    setSelected(updated);
  }

  if (loading) return <div className="page-loading"><Spinner/><span>Загружаем задачи</span></div>;

  return <div className="content-page">
    <PageHeader
      eyebrow="ДЕЙСТВИЯ"
      title="Задачи"
      subtitle={user?.role === "designer" ? "Ваши проектные и общие задачи — от постановки до принятия." : "Задачи команды — проектные и общие, от постановки до принятия."}
      actions={<button type="button" className="button button--primary" onClick={() => setShowNewTask(true)}>Новая задача</button>}
    />

    {error ? <div className="form-error">{error}</div> : null}

    <div className="toolbar task-toolbar">
      <label className="search-field"><Icon name="search" size={17}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Поиск по задаче, проекту, исполнителю"/></label>
      <select className="toolbar-select" value={period} onChange={(e) => setPeriod(e.target.value as typeof period)}>
        <option value="all">Все сроки</option>
        <option value="today">Сегодня</option>
        <option value="overdue">Просрочено</option>
      </select>
    </div>

    <div className="task-status-tabs" role="tablist" aria-label="Статусы задач">
      <button type="button" className={status === "all" ? "active" : ""} onClick={() => setStatus("all")}><span>Все</span><strong>{baseFiltered.length}</strong></button>
      {columns.map((column) => <button key={column.value} type="button" className={status === column.value ? "active" : ""} onClick={() => setStatus(column.value)}><span>{column.label}</span><strong>{counts[column.value]}</strong></button>)}
    </div>

    {status === "all" ? <>
      <div className="task-kanban">
        {columns.map((column) => {
          const columnTasks = baseFiltered.filter((task) => task.status === column.value);
          return <section className={`task-kanban__column task-kanban__column--${column.value}`} key={column.value}>
            <header className="task-kanban__head"><span>{column.label}</span><strong>{columnTasks.length}</strong></header>
            <div className="task-kanban__body">
              {columnTasks.length ? columnTasks.map((task) => <TaskCard key={task.id} task={task} projectName={task.project_id ? projectMap.get(task.project_id) : "Общая задача"} assigneeName={userMap.get(task.assignee_id)} onClick={() => setSelected(task)}/>) : <div className="task-kanban__empty">Нет задач</div>}
            </div>
          </section>;
        })}
      </div>

      <div className="task-mobile-board">
        {columns.map((column) => {
          const columnTasks = baseFiltered.filter((task) => task.status === column.value);
          return <section className="task-mobile-group" key={column.value}>
            <header><span>{column.label}</span><strong>{columnTasks.length}</strong></header>
            <div>{columnTasks.length ? columnTasks.map((task) => <TaskCard key={task.id} task={task} projectName={task.project_id ? projectMap.get(task.project_id) : "Общая задача"} assigneeName={userMap.get(task.assignee_id)} onClick={() => setSelected(task)}/>) : <div className="quiet-state">Нет задач</div>}</div>
          </section>;
        })}
      </div>
    </> : visibleTasks.length ? <div className="task-list">{visibleTasks.map((task) => <TaskCard key={task.id} task={task} projectName={task.project_id ? projectMap.get(task.project_id) : "Общая задача"} assigneeName={userMap.get(task.assignee_id)} onClick={() => setSelected(task)}/>)}</div> : <EmptyState title="Задачи не найдены" text={tasks.length ? "Измените фильтры." : "Задачи появятся после добавления в проектах."}/>} 

    {showNewTask ? <Modal title="Новая задача" subtitle="Проект можно не выбирать" onClose={() => setShowNewTask(false)}><NewTaskForm projects={projects} onCancel={() => setShowNewTask(false)} onCreated={(task) => { setTasks((current) => [task, ...current]); setShowNewTask(false); }}/></Modal> : null}

    {selected ? <TaskDetailsModal task={selected} projectName={selected.project_id ? projectMap.get(selected.project_id) : "Общая задача"} users={users} onClose={() => setSelected(null)} onTaskUpdated={replace}/> : null}
  </div>;
}
