"use client";
import { NewTaskForm } from "@/components/NewTaskForm";
import { TaskQuickActions } from "@/components/TaskQuickActions";
import { EntityAttachments } from "@/components/EntityAttachments";
import { personIds, localTime } from "@/lib/scheduling";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { AttachmentList } from "@/components/AttachmentList";
import { FilePicker } from "@/components/FilePicker";
import { Modal } from "@/components/Modal";
import { TaskStatusBadge } from "@/components/StatusBadge";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDate, formatDateTime, taskPriorityLabels } from "@/lib/format";
import { Attachment, Task, TaskComment, TaskStatus, UserOption } from "@/lib/types";

export function TaskDetailsModal({ task, projectName, users, onClose, onTaskUpdated, onDeleted }: { task: Task; projectName?: string; users: UserOption[]; onClose: () => void; onTaskUpdated: (task: Task) => void; onDeleted?: (id: number) => void }) {
  const { token, user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
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
      if (!personIds(task).includes(user.id)) return [];
      if (task.status === "planned") return ["in_progress"];
      if (task.status === "in_progress") return ["review"];
      return [];
    }
    if (task.status === "planned") return ["in_progress"];
    if (task.status === "in_progress") return ["review"];
    if (task.status === "review") return ["done", "in_progress"];
    return [];
  }, [task, user]);

  async function remove() {if(!token)return;setBusy(true);setError("");try{await api.deleteTask(token,task.id);onDeleted?.(task.id);onClose();}catch(e){setError(String(e));}finally{setBusy(false);}}
  const canEdit = user && (user.role === "owner" || user.id === task.created_by_id || personIds(task).includes(user.id));
  if(editing) return <Modal title="Редактировать задачу" onClose={()=>setEditing(false)} drawer><NewTaskForm initialTask={task} onCancel={()=>setEditing(false)} onCreated={updated=>{onTaskUpdated(updated);setEditing(false);}}/></Modal>;
  return <Modal title={task.title} subtitle={projectName || "Общая задача"} onClose={onClose} drawer>
    <div className="details-grid">
      <section className="details-main">
        {error ? <div className="form-error">{error}</div> : null}
        {canEdit?<div className="button-row"><button type="button" className="button button--secondary" onClick={()=>setEditing(true)}>Редактировать</button><button type="button" className="button button--ghost" onClick={()=>setConfirmDelete(true)}>Удалить задачу</button></div>:null}
        {confirmDelete?<div className="form-error" role="alert"><p>Удалить «{task.title}» вместе с комментариями и вложениями? Это действие нельзя отменить.</p><div className="button-row"><button type="button" disabled={busy} className="button button--primary" onClick={remove}>Да, удалить</button><button type="button" disabled={busy} className="button button--secondary" onClick={()=>setConfirmDelete(false)}>Отмена</button></div></div>:null}
        <div className="details-meta"><TaskStatusBadge status={task.status}/><span>{taskPriorityLabels[task.priority]}</span><span>Дедлайн: {formatDate(task.deadline)} {localTime(task.due_at)}</span><span>Исполнители: {personIds(task).map(id=>userName.get(id)||`ID ${id}`).join(", ")}</span></div>
        <TaskQuickActions task={task} users={users} onUpdated={onTaskUpdated} showWorkflow={false}/>
        {task.reminder_offsets?.length?<p className="muted">Уведомления: {task.reminder_offsets.map(n=>n===0?"в срок":n===1440?"за день":n===120?"за 2 часа":n===60?"за час":`за ${n} мин.`).join(", ")}</p>:null}
        {task.description ? <div className="rich-text">{task.description}</div> : <p className="muted">Описание не добавлено.</p>}

        {allowed.length ? <div className="workflow-box"><strong>Действия по задаче</strong>{task.status === "review" && allowed.includes("in_progress") ? <label className="field"><span>Комментарий при возврате в работу</span><textarea rows={2} value={returnComment} onChange={(e) => setReturnComment(e.target.value)} placeholder="Что нужно исправить"/></label> : null}<div className="button-row">{allowed.map((status) => <button key={status} type="button" className={status === "done" ? "button button--primary" : "button button--secondary"} disabled={busy} onClick={() => changeStatus(status)}>{status === "in_progress" ? (task.status === "review" ? "Вернуть в работу" : "Начать работу") : status === "review" ? "Отправить на проверку" : "Подтвердить выполнение"}</button>)}</div></div> : null}

        <EntityAttachments kind="task" id={task.id}/>
        <div className="section-heading section-heading--compact"><div><h3>Комментарии</h3><p>Обсуждение и вложения по задаче</p></div></div>
        {loading ? <div className="muted">Загружаем комментарии</div> : comments.length ? <div className="comment-list">{comments.map((comment) => <article className="comment" key={comment.id}><header><strong>{userName.get(comment.author_id) || `Пользователь ${comment.author_id}`}</strong><time>{formatDateTime(comment.created_at)}</time></header><p>{comment.text}</p><AttachmentList attachments={attachments[comment.id] || []} onDeleted={(id) => setAttachments((current) => ({ ...current, [comment.id]: (current[comment.id] || []).filter((item) => item.id !== id) }))}/></article>)}</div> : <p className="muted">Комментариев пока нет.</p>}

        <form className="comment-form" onSubmit={addComment}><label className="field"><span>Новый комментарий</span><textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="Зафиксируйте сообщение или приложите документ"/></label><FilePicker files={files} onFiles={setFiles}/><div className="form-actions"><button className="button button--primary" disabled={busy || (!text.trim() && !files.length)}>{busy ? "Сохраняем" : "Добавить комментарий"}</button></div></form>
      </section>
      <aside className="details-aside"><div className="detail-pair"><span>Создано</span><strong>{formatDateTime(task.created_at)}</strong></div><div className="detail-pair"><span>Обновлено</span><strong>{formatDateTime(task.updated_at)}</strong></div><div className="detail-pair"><span>Проект</span><strong>{projectName || "Не привязана"}</strong></div><div className="detail-pair"><span>Этап</span><strong>{task.stage_id ? `#${task.stage_id}` : "Без этапа"}</strong></div></aside>
    </div>
  </Modal>;
}
