"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Spinner } from "@/components/Spinner";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { User, UserRole } from "@/lib/types";

export default function TeamPage() {
  const { token, user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!token || user?.role !== "owner") return;
    setLoading(true); setError("");
    try { setUsers(await api.users(token)); }
    catch (e) { setError(e instanceof Error ? e.message : "Не удалось загрузить команду"); }
    finally { setLoading(false); }
  }, [token, user?.role]);

  useEffect(() => { load(); }, [load]);

  async function setRole(person: User, role: UserRole) {
    if (!token || person.role === role) return;
    setBusyId(person.id); setError("");
    try {
      const updated = await api.updateUserRole(token, person.id, role);
      setUsers((current) => current.map((item) => item.id === updated.id ? updated : item));
    } catch (e) { setError(e instanceof Error ? e.message : "Не удалось изменить роль"); }
    finally { setBusyId(null); }
  }

  if (user?.role !== "owner") return <div className="content-page"><PageHeader eyebrow="ДОСТУП" title="Управление командой" subtitle="Этот раздел доступен только руководителю студии."/><div className="quiet-state">Недостаточно прав для просмотра команды.</div></div>;
  if (loading) return <div className="page-loading"><Spinner/><span>Загружаем команду</span></div>;

  return <div className="content-page">
    <PageHeader eyebrow="КОМАНДА" title="Управление командой" subtitle="Сотрудники студии и их роли в рабочем пространстве."/>
    {error ? <div className="form-error">{error}</div> : null}
    <div className="team-table">
      <div className="team-table__head"><span>Сотрудник</span><span>Email</span><span>Роль</span></div>
      {users.map((person) => <div className="team-table__row" key={person.id}>
        <div><strong>{person.name}</strong><small>{person.id === user?.id ? "Вы" : "Сотрудник"}</small></div>
        <span className="team-table__email">{person.email}</span>
        <select value={person.role} disabled={busyId === person.id || person.id === user?.id} onChange={(e) => setRole(person, e.target.value as UserRole)}>
          <option value="designer">Дизайнер / комплектатор</option>
          <option value="owner">Руководитель студии</option>
        </select>
      </div>)}
    </div>
    <p className="team-note">Добавление новых сотрудников сделаем следующим шагом. Сейчас руководитель может менять роли уже существующих пользователей.</p>
  </div>;
}
