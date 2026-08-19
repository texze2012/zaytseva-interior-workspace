"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Spinner } from "@/components/Spinner";
import { ApiError, api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  ProjectCreatePayload,
  ProjectStatus,
  ProjectType,
  UserOption,
} from "@/lib/types";

export function ProjectForm() {
  const router = useRouter();
  const { token, user } = useAuth();

  const [users, setUsers] = useState<UserOption[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [objectType, setObjectType] =
    useState<ProjectType>("apartment");
  const [area, setArea] = useState("");
  const [city, setCity] = useState("Калининград");
  const [address, setAddress] = useState("");
  const [clientName, setClientName] = useState("");
  const [status, setStatus] =
    useState<ProjectStatus>("planned");
  const [startDate, setStartDate] = useState("");
  const [deadline, setDeadline] = useState("");
  const [responsibleId, setResponsibleId] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (!token || !user) return;

    api
      .userOptions(token, user)
      .then((items) => {
        setUsers(items);
        const preferred =
          items.find((item) => item.role === "designer") ?? items[0];
        if (preferred) {
          setResponsibleId(String(preferred.id));
        }
      })
      .catch((err) => {
        setError(
          err instanceof Error
            ? err.message
            : "Не удалось загрузить пользователей"
        );
      })
      .finally(() => setLoadingUsers(false));
  }, [token, user]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;

    setSubmitting(true);
    setError("");

    try {
      const payload: ProjectCreatePayload = {
        name: name.trim(),
        object_type: objectType,
        area: Number(area),
        city: city.trim() || null,
        address: address.trim() || null,
        client_name: clientName.trim(),
        status,
        start_date: startDate || null,
        deadline: deadline || null,
        responsible_id: Number(responsibleId),
        description: description.trim() || null,
      };

      const created = await api.createProject(token, payload);
      router.replace(`/projects/${created.id}`);
    } catch (err) {
      setError(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : "Не удалось создать проект"
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="editor-card" onSubmit={handleSubmit}>
      <div className="form-grid">
        <label className="field field--wide">
          <span>Название проекта *</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Например: Квартира Ивановых"
            minLength={2}
            required
          />
        </label>

        <label className="field">
          <span>Тип объекта *</span>
          <select
            value={objectType}
            onChange={(event) =>
              setObjectType(event.target.value as ProjectType)
            }
          >
            <option value="apartment">Квартира</option>
            <option value="house">Загородный дом</option>
            <option value="apartments">Апартаменты</option>
            <option value="commercial">Коммерческий объект</option>
          </select>
        </label>

        <label className="field">
          <span>Площадь, м² *</span>
          <input
            type="number"
            min="1"
            step="0.1"
            value={area}
            onChange={(event) => setArea(event.target.value)}
            required
          />
        </label>

        <label className="field">
          <span>Город</span>
          <input
            value={city}
            onChange={(event) => setCity(event.target.value)}
          />
        </label>

        <label className="field">
          <span>Адрес</span>
          <input
            value={address}
            onChange={(event) => setAddress(event.target.value)}
          />
        </label>

        <label className="field field--wide">
          <span>Заказчик *</span>
          <input
            value={clientName}
            onChange={(event) => setClientName(event.target.value)}
            minLength={2}
            required
          />
        </label>

        <label className="field">
          <span>Дата начала</span>
          <input
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
          />
        </label>

        <label className="field">
          <span>Дедлайн</span>
          <input
            type="date"
            value={deadline}
            onChange={(event) => setDeadline(event.target.value)}
          />
        </label>

        <label className="field">
          <span>Статус *</span>
          <select
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as ProjectStatus)
            }
          >
            <option value="planned">Запланировано</option>
            <option value="in_progress">В работе</option>
            <option value="review">На согласовании</option>
            <option value="completed">Завершено</option>
            <option value="archived">Архив</option>
          </select>
        </label>

        <label className="field">
          <span>Ответственный *</span>
          <select
            value={responsibleId}
            onChange={(event) => setResponsibleId(event.target.value)}
            required
            disabled={loadingUsers}
          >
            {users.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} ·{" "}
                {item.role === "owner" ? "руководитель" : "дизайнер"}
              </option>
            ))}
          </select>
        </label>

        <label className="field field--wide">
          <span>Описание / заметка</span>
          <textarea
            rows={5}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Короткая информация по объекту"
          />
        </label>
      </div>

      <div className="template-note">
        <strong>Этапы создадутся автоматически</strong>
        <span>
          Бриф и обмеры → Планировочные решения → Концепция → 3D →
          Рабочая документация → Комплектация → Авторский надзор
        </span>
      </div>

      {error ? <div className="form-error">{error}</div> : null}

      <div className="form-actions">
        <button
          type="button"
          className="button button--ghost"
          onClick={() => router.back()}
        >
          Отмена
        </button>
        <button
          type="submit"
          className="button button--primary"
          disabled={submitting || loadingUsers || !responsibleId}
        >
          {submitting ? (
            <>
              <Spinner small />
              Создаём...
            </>
          ) : (
            "Создать проект"
          )}
        </button>
      </div>
    </form>
  );
}
