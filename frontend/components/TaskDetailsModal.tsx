"use client";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { AttachmentList } from "@/components/AttachmentList";
import { FilePicker } from "@/components/FilePicker";
import { Modal } from "@/components/Modal";
import { TaskStatusBadge } from "@/components/StatusBadge";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDate, formatDateTime, taskPriorityLabels } from "@/lib/format";
import { Attachment, Task, TaskComment, TaskStatus, UserOption } from "@/lib/types";

export function TaskDetailsModal({ task, projectName, users, onClose, onTaskUpdated }: { task: Task; projectName?: string; users: UserOption[]; onClose: () => void; onTaskUpdated: (task: Task) => void }) {
  const { token, user } = useAuth();
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [attachments, setAttachments] = useState<Record<number, Attachment[]>>({});
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [returnComment, setReturnComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const userName = useMemo(() => new Map(users.map((item) => [item.id, item.name])), [users]);

  const loadComments = useCallback(async () => {
    if (!token) return;
    setLoading(true); setError("");
    try {
      const list = await api.comments(token, task.project_id, task.id);
      setComments(list);
      const pairs = await Promise.all(list.map(async (comment) => {
        try { return [comment.id, await api.commentAttachments(token, task.project_id, task.id, comment.id)] as const; }
        catch { return [comment.id, []] as const; }
      }));
      setAttachments(Object.fromEntries(pairs));
    } catch (e) { setError(e instanceof Error ? e.message : "Не удалось загрузить комментарии"); }
    finally { setLoading(false); }
  }, [task.id, task.project_id, token]);

  useEffect(() => { loadComments(); }, [loadComments]);

  async function addComment(event: FormEvent) {
    event.preventDefault(); if (!token || (!text.trim() && !files.length)) return;
    setBusy(true); setError("");
    try {
      const comment = await api.addComment(token, task.project_id, task.id, text.trim() || "Вложение");
      const uploaded: Attachment[] = [];
      for (const file of files) uploaded.push(await api.uploadCommentAttachment(token, task.project_id, task.id, comment.id, file));
      setComments((current) => [...current, comment]);
      setAttachments((current) => ({ ...current, [comment.id]: uploaded }));
      setText(""); setFiles([]);
    } catch (e) { setError(e instanceof Error ? e.message : "Не удалось добавить комментарий"); }
    finally { setBusy(false); }
  }

  async function changeStatus(status: TaskStatus) {
    if (!token) return;
    if (task.status === "review" && status === "in_progress" && !returnComment.trim()) {
      setError("При возврате задачи в работу нужно указать комментарий"); return;
    }
    setBusy(true); setError("");
    try {
      const updated = await api.changeTaskStatus(token, task.project_id, task.id, status, task.status === "review" && status === "in_progress" ? returnComment.trim() : undefined);
      onTaskUpdated(updated); setReturnComment("");
      if (task.status === "review" && status === "in_progress") await loadComments();
    } catch (e) { setError(e instanceof Error ? e.message : "Не удалось изменить статус"); }
    finally { setBusy(false); }
  }

  const allowed = useMemo<TaskStatus[]>(() => {
    if (!user) return [];
    if (user.role === "designer") {
      if (task.assignee_id !== user.id) return [];
      if (task.status === "planned") return ["in_progress"];
      if (task.status === "in_progress") return ["review"];
      return [];
    }
    if (task.status === "planned") return ["in_progress"];
    if (task.status === "in_progress") return ["review"];
    if (task.status === "review") return ["done", "in_progress"];
    return [];
  }, [task.assignee_id, task.status, user]);

  return <Modal title={task.title} subtitle={projectName || "Общая задача"} onClose={onClose} wide>
    <div className="details-grid">
      <section className="details-main">
        {error ? <div className="form-error">{error}</div> : null}
        <div className="details-meta"><TaskStatusBadge status={task.status}/><span>{taskPriorityLabels[task.priority]}</span><span>Дедлайн: {formatDate(task.deadline)}</span><span>Ответственный: {userName.get(task.assignee_id) || `ID ${task.assignee_id}`}</span></div>
        {task.description ? <div className="rich-text">{task.description}</div> : <p className="muted">Описание не добавлено.</p>}

        {allowed.length ? <div className="workflow-box"><strong>Действия по задаче</strong>{task.status === "review" && allowed.includes("in_progress") ? <label className="field"><span>Комментарий при возврате в работу</span><textarea rows={2} value={returnComment} onChange={(e) => setReturnComment(e.target.value)} placeholder="Что нужно исправить"/></label> : null}<div className="button-row">{allowed.map((status) => <button key={status} type="button" className={status === "done" ? "button button--primary" : "button button--secondary"} disabled={busy} onClick={() => changeStatus(status)}>{status === "in_progress" ? (task.status === "review" ? "Вернуть в работу" : "Начать работу") : status === "review" ? "Отправить на проверку" : "Подтвердить выполнение"}</button>)}</div></div> : null}

        <div className="section-heading section-heading--compact"><div><h3>Комментарии</h3><p>Обсуждение и вложения по задаче</p></div></div>
        {loading ? <div className="muted">Загружаем комментарии</div> : comments.length ? <div className="comment-list">{comments.map((comment) => <article className="comment" key={comment.id}><header><strong>{userName.get(comment.author_id) || `Пользователь ${comment.author_id}`}</strong><time>{formatDateTime(comment.created_at)}</time></header><p>{comment.text}</p><AttachmentList attachments={attachments[comment.id] || []} onDeleted={(id) => setAttachments((current) => ({ ...current, [comment.id]: (current[comment.id] || []).filter((item) => item.id !== id) }))}/></article>)}</div> : <p className="muted">Комментариев пока нет.</p>}

        <form className="comment-form" onSubmit={addComment}><label className="field"><span>Новый комментарий</span><textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="Зафиксируйте сообщение или приложите документ"/></label><FilePicker files={files} onFiles={setFiles}/><div className="form-actions"><button className="button button--primary" disabled={busy || (!text.trim() && !files.length)}>{busy ? "Сохраняем" : "Добавить комментарий"}</button></div></form>
      </section>
      <aside className="details-aside"><div className="detail-pair"><span>Создано</span><strong>{formatDateTime(task.created_at)}</strong></div><div className="detail-pair"><span>Обновлено</span><strong>{formatDateTime(task.updated_at)}</strong></div><div className="detail-pair"><span>Проект</span><strong>{projectName || "Не привязана"}</strong></div><div className="detail-pair"><span>Этап</span><strong>{task.stage_id ? `#${task.stage_id}` : "Без этапа"}</strong></div></aside>
    </div>
  </Modal>;
}
