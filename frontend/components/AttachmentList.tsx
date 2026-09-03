"use client";
import { useState } from "react";
import { Icon } from "@/components/Icon";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatFileSize } from "@/lib/format";
import { Attachment } from "@/lib/types";

export function AttachmentList({ attachments, onDeleted, allowDelete = true }: { attachments: Attachment[]; onDeleted?: (id: number) => void; allowDelete?: boolean }) {
  const { token } = useAuth();
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState("");

  if (!attachments.length) return null;

  async function openFile(item: Attachment) {
    if (!token) return;
    setError(""); setBusyId(item.id);
    try { await api.openAttachment(token, item); } catch (e) { setError(e instanceof Error ? e.message : "Не удалось открыть файл"); } finally { setBusyId(null); }
  }
  async function downloadFile(item: Attachment) {
    if (!token) return;
    setError(""); setBusyId(item.id);
    try { await api.downloadAttachment(token, item); } catch (e) { setError(e instanceof Error ? e.message : "Не удалось скачать файл"); } finally { setBusyId(null); }
  }
  async function remove(item: Attachment) {
    if (!token || !onDeleted) return;
    if (!window.confirm(`Удалить файл «${item.original_name}»?`)) return;
    setError(""); setBusyId(item.id);
    try { await api.deleteAttachment(token, item.id); onDeleted(item.id); } catch (e) { setError(e instanceof Error ? e.message : "Не удалось удалить файл"); } finally { setBusyId(null); }
  }

  return <div className="attachment-list">
    {error ? <div className="inline-error">{error}</div> : null}
    {attachments.map((item) => <div className="attachment-row" key={item.id}>
      <button type="button" className="attachment-row__main" onClick={() => openFile(item)} disabled={busyId === item.id}>
        <span className="file-icon"><Icon name="file" size={18}/></span>
        <span><strong>{item.original_name}</strong><small>{formatFileSize(item.size_bytes)}</small></span>
      </button>
      <div className="attachment-row__actions">
        <button type="button" className="icon-button icon-button--small" onClick={() => downloadFile(item)} title="Скачать"><Icon name="download" size={16}/></button>
        {allowDelete && onDeleted ? <button type="button" className="icon-button icon-button--small" onClick={() => remove(item)} title="Удалить"><Icon name="trash" size={16}/></button> : null}
      </div>
    </div>)}
  </div>;
}
