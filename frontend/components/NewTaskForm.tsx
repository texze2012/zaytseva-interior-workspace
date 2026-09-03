"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Project, ProjectStage, Task, TaskPriority, UserOption } from "@/lib/types";

export function NewTaskForm({
  projectId,
  stages: initialStages = [],
  projects: initialProjects = [],
  onCreated,
  onCancel,
}: {
  projectId?: number | null;
  stages?: ProjectStage[];
  projects?: Project[];
  onCreated: (task: Task) => void;
  onCancel: () => void;
}) {
  const { token, user } = useAuth();
  const [users, setUsers] = useState<UserOption[]>([]);
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [stages, setStages] = useState<ProjectStage[]>(initialStages);
  const [form, setForm] = useState({
    title: "",
    description: "",
    project_id: projectId ? String(projectId) : "",
    stage_id: "",
    priority: "medium" as TaskPriority,
    assignee_id: "",
    deadline: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fixedProject = projectId !== undefined && projectId !== null;
  const selectedProjectId = form.project_id ? Number(form.project_id) : null;

  useEffect(() => {
    if (!token || !user) return;
    Promise.all([
      api.userOptions(token, user),
      fixedProject || initialProjects.length ? Promise.resolve(initialProjects) : api.projects(token),
    ]).then(([items, projectItems]) => {
      setUsers(items);
      if (!fixedProject) setProjects(projectItems);
      setForm((current) => ({ ...current, assignee_id: current.assignee_id || String(user.id) }));
    }).catch((e) => setError(e instanceof Error ? e.message : "Не удалось загрузить данные формы"));
  }, [fixedProject, initialProjects, token, user]);

  useEffect(() => {
    if (!token || fixedProject) return;
    if (!selectedProjectId) {
      setStages([]);
      setForm((current) => ({ ...current, stage_id: "" }));
      return;
    }
    api.stages(token, selectedProjectId)
      .then((items) => setStages(items))
      .catch((e) => setError(e instanceof Error ? e.message : "Не удалось загрузить этапы проекта"));
  }, [fixedProject, selectedProjectId, token]);

  const projectName = useMemo(
    () => projects.find((item) => item.id === selectedProjectId)?.name,
    [projects, selectedProjectId]
  );

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setError("");
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        stage_id: form.stage_id ? Number(form.stage_id) : null,
        priority: form.priority,
        assignee_id: Number(form.assignee_id),
        deadline: form.deadline || null,
      };
      const task = selectedProjectId
        ? await api.createTask(token, selectedProjectId, payload)
        : await api.createStandaloneTask(token, payload);
      onCreated(task);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось создать задачу");
    } finally {
      setSaving(false);
    }
  }

  return <form className="form-stack" onSubmit={submit}>
    {error ? <div className="form-error">{error}</div> : null}

    <label className="field"><span>Название</span><input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}/></label>
    <label className="field"><span>Описание</span><textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}/></label>

    {!fixedProject ? <label className="field"><span>Проект</span><select value={form.project_id} onChange={(e) => setForm({ ...form, project_id: e.target.value, stage_id: "" })}><option value="">Не привязывать к проекту</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select><small>{projectName ? `Задача будет связана с проектом «${projectName}»` : "Общая задача студии без привязки к объекту"}</small></label> : null}

    <div className="form-grid form-grid--2">
      {selectedProjectId ? <label className="field"><span>Этап</span><select value={form.stage_id} onChange={(e) => setForm({ ...form, stage_id: e.target.value })}><option value="">Без этапа</option>{stages.map((stage) => <option key={stage.id} value={stage.id}>{stage.name}</option>)}</select></label> : null}
      <label className="field"><span>Ответственный</span><select required value={form.assignee_id} onChange={(e) => setForm({ ...form, assignee_id: e.target.value })}><option value="">Выберите</option>{users.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label className="field"><span>Приоритет</span><select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as TaskPriority })}><option value="low">Низкий</option><option value="medium">Средний</option><option value="high">Высокий</option><option value="urgent">Срочный</option></select></label>
      <label className="field"><span>Дедлайн</span><input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })}/></label>
    </div>

    <div className="form-actions"><button type="button" className="button button--secondary" onClick={onCancel}>Отмена</button><button className="button button--primary" disabled={saving}>{saving ? "Создаём" : "Создать задачу"}</button></div>
  </form>;
}
