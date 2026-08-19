"use client";

import { FormEvent, useEffect, useState } from "react";

import { Spinner } from "@/components/Spinner";
import { ApiError, api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  ProjectStage,
  Task,
  TaskCreatePayload,
  TaskPriority,
  UserOption,
} from "@/lib/types";

export function NewTaskForm({
  projectId,
  stages,
  onCreated,
  onCancel,
}: {
  projectId: number;
  stages: ProjectStage[];
  onCreated: (task: Task) => void;
  onCancel: () => void;
}) {
  const { token, user } = useAuth();
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [stageId, setStageId] = useState("");
  const [priority, setPriority] =
    useState<TaskPriority>("medium");
  const [assigneeId, setAssigneeId] = useState("");
  const [deadline, setDeadline] = useState("");
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
          setAssigneeId(String(preferred.id));
        }
      })
      .catch((err) =>
        setError(
          err instanceof Error
            ? err.message
            : "Не удалось загрузить исполнителей"
        )
      )
      .finally(() => setLoadingUsers(false));
  }, [token, user]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;

    setSubmitting(true);
    setError("");

    try {
      const payload: TaskCreatePayload = {
        title: title.trim(),
        stage_id: stageId ? Number(stageId) : null,
        priority,
        assignee_id: Number(assigneeId),
        deadline: deadline || null,
        description: description.trim() || null,
      };

      const created = await api.createTask(
        token,
        projectId,
        payload
      );
      onCreated(created);
    } catch (err) {
      setError(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : "Не удалось создать задачу"
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="inline-editor" onSubmit={submit}>
      <div className="inline-editor__header">
        <div>
          <span className="eyebrow">НОВАЯ ЗАДАЧА</span>
          <h3>Добавить задачу</h3>
        </div>
        <button
          className="icon-button"
          type="button"
          onClick={onCancel}
          aria-label="Закрыть"
        >
          ×
        </button>
      </div>

      <div className="form-grid">
        <label className="field field--wide">
          <span>Название *</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            minLength={2}
            required
          />
        </label>

        <label className="field">
          <span>Этап</span>
          <select
            value={stageId}
            onChange={(event) => setStageId(event.target.value)}
          >
            <option value="">Общая задача проекта</option>
            {stages.map((stage) => (
              <option value={stage.id} key={stage.id}>
                {stage.position}. {stage.name}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Исполнитель *</span>
          <select
            value={assigneeId}
            onChange={(event) => setAssigneeId(event.target.value)}
            disabled={loadingUsers}
            required
          >
            {users.map((item) => (
              <option value={item.id} key={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Приоритет</span>
          <select
            value={priority}
            onChange={(event) =>
              setPriority(event.target.value as TaskPriority)
            }
          >
            <option value="low">Низкий</option>
            <option value="medium">Средний</option>
            <option value="high">Высокий</option>
            <option value="urgent">Срочный</option>
          </select>
        </label>

        <label className="field">
          <span>Дедлайн</span>
          <input
            type="date"
            value={deadline}
            onChange={(event) => setDeadline(event.target.value)}
          />
        </label>

        <label className="field field--wide">
          <span>Описание</span>
          <textarea
            rows={4}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>
      </div>

      {error ? <div className="form-error">{error}</div> : null}

      <div className="form-actions">
        <button
          className="button button--ghost"
          type="button"
          onClick={onCancel}
        >
          Отмена
        </button>
        <button
          className="button button--primary"
          type="submit"
          disabled={submitting || loadingUsers || !assigneeId}
        >
          {submitting ? (
            <>
              <Spinner small />
              Создаём...
            </>
          ) : (
            "Создать задачу"
          )}
        </button>
      </div>
    </form>
  );
}
