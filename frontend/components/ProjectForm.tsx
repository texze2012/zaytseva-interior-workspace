"use client";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { ProjectCreatePayload, ProjectStatus, ProjectType, UserOption } from "@/lib/types";

export function ProjectForm() {
  const { token, user } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<UserOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", object_type: "apartment" as ProjectType, area: "", city: "", address: "", client_name: "", status: "in_progress" as ProjectStatus, start_date: "", deadline: "", responsible_id: "", description: "" });

  useEffect(() => {
    if (!token || !user) return;
    api.userOptions(token, user).then((items) => { setUsers(items); setForm((current) => ({ ...current, responsible_id: current.responsible_id || String(user.id) })); }).catch((e) => setError(e instanceof Error ? e.message : "Не удалось загрузить пользователей"));
  }, [token, user]);

  async function submit(e: FormEvent) {
    e.preventDefault(); if (!token) return;
    setSaving(true); setError("");
    const payload: ProjectCreatePayload = { name: form.name.trim(), object_type: form.object_type, area: Number(form.area), client_name: form.client_name.trim(), status: form.status, responsible_id: Number(form.responsible_id), city: form.city.trim() || null, address: form.address.trim() || null, start_date: form.start_date || null, deadline: form.deadline || null, description: form.description.trim() || null };
    try { const project = await api.createProject(token, payload); router.push(`/projects/${project.id}`); } catch (e) { setError(e instanceof Error ? e.message : "Не удалось создать проект"); } finally { setSaving(false); }
  }

  return <form className="section form-card" onSubmit={submit}>
    {error ? <div className="form-error">{error}</div> : null}
    <div className="form-grid form-grid--2">
      <label className="field field--wide"><span>Название проекта</span><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Название объекта"/></label>
      <label className="field"><span>Тип объекта</span><select value={form.object_type} onChange={(e) => setForm({ ...form, object_type: e.target.value as ProjectType })}><option value="apartment">Квартира</option><option value="house">Дом</option><option value="apartments">Апартаменты</option><option value="commercial">Коммерческий объект</option></select></label>
      <label className="field"><span>Площадь, м²</span><input required min="0.01" step="0.01" type="number" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })}/></label>
      <label className="field"><span>Клиент</span><input required value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })}/></label>
      <label className="field"><span>Ответственный</span><select required value={form.responsible_id} onChange={(e) => setForm({ ...form, responsible_id: e.target.value })}><option value="">Выберите</option>{users.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label className="field"><span>Город</span><input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}/></label>
      <label className="field"><span>Адрес</span><input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}/></label>
      <label className="field"><span>Статус</span><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ProjectStatus })}><option value="planned">Запланирован</option><option value="in_progress">В работе</option><option value="review">На проверке</option><option value="completed">Завершён</option><option value="archived">Архив</option></select></label>
      <label className="field"><span>Дата начала</span><input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })}/></label>
      <label className="field"><span>Дедлайн</span><input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })}/></label>
      <label className="field field--wide"><span>Описание</span><textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}/></label>
    </div>
    <div className="form-actions"><button type="button" className="button button--secondary" onClick={() => router.back()}>Отмена</button><button className="button button--primary" disabled={saving}>{saving ? "Создаём проект" : "Создать проект"}</button></div>
  </form>;
}
