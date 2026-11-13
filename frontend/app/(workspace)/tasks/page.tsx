"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useStoredState } from "@/lib/useStoredState";
import { useSearchParams } from "next/navigation";
import { PeopleFilter } from "@/components/ScheduleFields";
import { localDate, personIds, isOverdue } from "@/lib/scheduling";
import { EmptyState } from "@/components/EmptyState";
import { Icon } from "@/components/Icon";
import { Modal } from "@/components/Modal";
import { NewTaskForm } from "@/components/NewTaskForm";
import { PageHeader } from "@/components/PageHeader";
import { Spinner } from "@/components/Spinner";
import { TaskBoard } from "@/components/TaskBoard";
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

function TasksContent() {
  const searchParams=useSearchParams();
  const { token, user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [status, setStatus] = useStoredState<TaskStatus | "all">("tasks:status","all");
  const [period, setPeriod] = useStoredState<"all" | "today" | "overdue">("tasks:period","all");
  const [person, setPerson] = useStoredState<string>("tasks:person","all");
  const [query, setQuery] = useStoredState<string>("tasks:query","");
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
        api.taskFeed(token),
        api.projects(token),
        api.userOptions(token, user),
      ]);
      setTasks(list);
      const requested = Number(new URLSearchParams(window.location.search).get("task"));
      if(requested) setSelected(list.find(t=>t.id===requested)||null);
      setProjects(projectList);
      setUsers(userList);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось загрузить задачи");
    } finally {
      setLoading(false);
    }
  }, [token, user]);

  useEffect(() => { load(); }, [load]);

  const taskListRef=useRef(tasks);taskListRef.current=tasks;
  useEffect(()=>{const id=Number(searchParams.get("task"));if(id)setSelected(taskListRef.current.find(t=>t.id===id)||null);},[searchParams]);
  useEffect(()=>{const open=(event:Event)=>{const url=new URL((event as CustomEvent<string>).detail,window.location.origin);if(url.pathname==="/tasks"){const task=taskListRef.current.find(t=>t.id===Number(url.searchParams.get("task")));if(task)setSelected(task);}};window.addEventListener("zi:search-open",open);return()=>window.removeEventListener("zi:search-open",open);},[]);
  const projectMap = useMemo(() => new Map(projects.map((item) => [item.id, item.name])), [projects]);
  const userMap = useMemo(() => new Map(users.map((item) => [item.id, item.name])), [users]);
  const today = localDate();

  const baseFiltered = useMemo(() => tasks.filter((task) => {
    const periodMatches = period === "all"
      || (period === "today" ? task.deadline === today && task.status !== "done" : isOverdue(task));
    const searchMatches = [
      task.title,
      task.description || "",
      (task.project_id ? projectMap.get(task.project_id) : "Общая задача") || "",
      userMap.get(task.assignee_id) || "",
    ].join(" ").toLowerCase().includes(query.toLowerCase());
    return periodMatches && searchMatches && (person === "all" || personIds(task).includes(person === "mine" ? user!.id : Number(person)));
  }), [period, projectMap, query, tasks, today, userMap, person, user]);

  const visibleTasks = useMemo(
    () => status === "all" ? baseFiltered : baseFiltered.filter((task) => task.status === status),
    [baseFiltered, status]
  );

  const counts = useMemo(() => Object.fromEntries(columns.map((column) => [column.value, baseFiltered.filter((task) => task.status === column.value).length])) as Record<TaskStatus, number>, [baseFiltered]);

  function replace(updated: Task) {
    setTasks((current) => current.map((item) => item.id === updated.id ? updated : item));
    setSelected(current=>current?.id===updated.id?updated:current);
  }

  if (loading) return <div className="page-loading"><Spinner/><span>Загружаем задачи</span></div>;

  return <div className="content-page">
    <PageHeader
      eyebrow="ДЕЙСТВИЯ"
      title="Задачи"
      subtitle="Задачи команды — проектные и общие, от постановки до принятия."
      actions={<button type="button" className="button button--primary" onClick={() => setShowNewTask(true)}>Новая задача</button>}
    />

    {error ? <div className="form-error">{error}</div> : null}

    <PeopleFilter users={users} value={person} onChange={setPerson}/>
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

    {status === "all" ? <TaskBoard projects={projects} tasks={baseFiltered} users={users} onSelect={setSelected} onUpdated={replace}/> : visibleTasks.length ? <div className="task-list">{visibleTasks.map((task) => <TaskCard key={task.id} task={task} users={users} onUpdated={replace} projectName={task.project_id ? projectMap.get(task.project_id) : "Общая задача"} assigneeName={personIds(task).map(id=>userMap.get(id)).join(", ")} onClick={() => setSelected(task)}/>)}</div> : <EmptyState title="Задачи не найдены" text={tasks.length ? "Измените фильтры." : "Задачи появятся после добавления в проектах."}/>}

    {showNewTask ? <Modal title="Новая задача" subtitle="Проект можно не выбирать" onClose={() => setShowNewTask(false)}><NewTaskForm projects={projects} onCancel={() => setShowNewTask(false)} onCreated={(task) => { setTasks((current) => [task, ...current]); setShowNewTask(false); }}/></Modal> : null}

    {selected ? <TaskDetailsModal task={selected} projectName={selected.project_id ? projectMap.get(selected.project_id) : "Общая задача"} users={users} onClose={() => setSelected(null)} onTaskUpdated={replace} onDeleted={id=>setTasks(current=>current.filter(t=>t.id!==id))}/> : null}
  </div>;
}

export default function TasksPage(){return <Suspense fallback={<p>Загружаем задачи…</p>}><TasksContent/></Suspense>;}
