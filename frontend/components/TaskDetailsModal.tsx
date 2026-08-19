"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import { Spinner } from "@/components/Spinner";
import { TaskStatusBadge } from "@/components/StatusBadge";
import { ApiError, api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  formatDate,
  formatDateTime,
  priorityLabel,
} from "@/lib/format";
import {
  Task,
  TaskComment,
  TaskStatus,
  UserOption,
} from "@/lib/types";

export function TaskDetailsModal({
  task,
  projectName,
  assignees = [],
  onClose,
  onChanged,
}: {
  task: Task;
  projectName?: string;
  assignees?: UserOption[];
  onClose: () => void;
  onChanged: (task: Task) => void;
}) {
  const { token, user } = useAuth();
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [returnReason, setReturnReason] = useState("");
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);

  const authorMap = useMemo(
    () => new Map(assignees.map((item) => [item.id, item.name])),
    [assignees]
  );

  useEffect(() => {
    if (!token) return;

    setLoadingComments(true);
    api
      .comments(token, task.project_id, task.id)
      .then(setComments)
      .catch((err) =>
        setError(
          err instanceof Error
            ? err.message
            : "Не удалось загрузить комментарии"
        )
      )
      .finally(() => setLoadingComments(false));
  }, [task.id, task.project_id, token]);

  async function addComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !commentText.trim()) return;

    setWorking(true);
    setError("");

    try {
      const created = await api.addComment(
        token,
        task.project_id,
        task.id,
        commentText.trim()
      );
      setComments((current) => [...current, created]);
      setCommentText("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Не удалось добавить комментарий"
      );
    } finally {
      setWorking(false);
    }
  }

  async function moveTo(status: TaskStatus, comment?: string) {
    if (!token) return;

    setWorking(true);
    setError("");

    try {
      const updated = await api.changeTaskStatus(
        token,
        task.project_id,
        task.id,
        status,
        comment
      );
      onChanged(updated);

      if (comment) {
        const updatedComments = await api.comments(
          token,
          task.project_id,
          task.id
        );
        setComments(updatedComments);
      }
      setReturnReason("");
    } catch (err) {
      setError(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : "Не удалось изменить статус"
      );
    } finally {
      setWorking(false);
    }
  }

  const canWorkOwnTask =
    user?.role === "designer" && task.assignee_id === user.id;
  const owner = user?.role === "owner";

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section
        className="task-modal"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="task-modal__header">
          <div>
            <span className="eyebrow">
              {projectName || `ПРОЕКТ #${task.project_id}`}
            </span>
            <h2>{task.title}</h2>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label="Закрыть"
          >
            ×
          </button>
        </div>

        <div className="task-modal__meta">
          <TaskStatusBadge status={task.status} />
          <span className={`priority priority--${task.priority}`}>
            {priorityLabel[task.priority]}
          </span>
          <span>Дедлайн: {formatDate(task.deadline)}</span>
          <span>
            Исполнитель:{" "}
            {authorMap.get(task.assignee_id) ||
              `#${task.assignee_id}`}
          </span>
        </div>

        {task.description ? (
          <div className="task-description">{task.description}</div>
        ) : null}

        <div className="task-actions">
          {task.status === "planned" && (owner || canWorkOwnTask) ? (
            <button
              className="button button--primary"
              disabled={working}
              onClick={() => moveTo("in_progress")}
              type="button"
            >
              Начать работу
            </button>
          ) : null}

          {task.status === "in_progress" &&
          (owner || canWorkOwnTask) ? (
            <button
              className="button button--primary"
              disabled={working}
              onClick={() => moveTo("review")}
              type="button"
            >
              Отправить на согласование
            </button>
          ) : null}

          {task.status === "review" && owner ? (
            <>
              <button
                className="button button--success"
                disabled={working}
                onClick={() => moveTo("done")}
                type="button"
              >
                Согласовать
              </button>
            </>
          ) : null}
        </div>

        {task.status === "review" && owner ? (
          <div className="return-box">
            <label className="field">
              <span>Причина возврата</span>
              <textarea
                rows={3}
                value={returnReason}
                onChange={(event) =>
                  setReturnReason(event.target.value)
                }
                placeholder="Что нужно исправить?"
              />
            </label>
            <button
              type="button"
              className="button button--danger-outline"
              disabled={working || !returnReason.trim()}
              onClick={() =>
                moveTo("in_progress", returnReason.trim())
              }
            >
              Вернуть в работу
            </button>
          </div>
        ) : null}

        <div className="comments-block">
          <div className="section-heading">
            <h3>Комментарии</h3>
            <span>{comments.length}</span>
          </div>

          {loadingComments ? (
            <div className="inline-loading">
              <Spinner small />
              Загружаем комментарии
            </div>
          ) : comments.length ? (
            <div className="comments-list">
              {comments.map((comment) => (
                <article className="comment" key={comment.id}>
                  <div className="comment__avatar">
                    {(authorMap.get(comment.author_id) || "?")
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                  <div>
                    <div className="comment__head">
                      <strong>
                        {authorMap.get(comment.author_id) ||
                          `Пользователь #${comment.author_id}`}
                      </strong>
                      <span>{formatDateTime(comment.created_at)}</span>
                    </div>
                    <p>{comment.text}</p>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="muted">Комментариев пока нет.</p>
          )}

          <form className="comment-form" onSubmit={addComment}>
            <textarea
              rows={3}
              value={commentText}
              onChange={(event) => setCommentText(event.target.value)}
              placeholder="Написать комментарий..."
            />
            <button
              className="button button--secondary"
              disabled={working || !commentText.trim()}
              type="submit"
            >
              Отправить
            </button>
          </form>
        </div>

        {error ? <div className="form-error">{error}</div> : null}
      </section>
    </div>
  );
}
