"use client";
import { useState } from "react";
import { WaitingStatusBadge } from "@/components/StatusBadge";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { WaitingItem, WaitingStatus } from "@/lib/types";

export function WaitingCard({ item, projectName, procurementName, onUpdated }: { item: WaitingItem; projectName?: string; procurementName?: string; onUpdated: (item: WaitingItem) => void }) {
  const { token } = useAuth(); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function change(status: WaitingStatus) { if (!token) return; setBusy(true); setError(""); try { onUpdated(await api.changeWaitingStatus(token, item.id, status)); } catch (e) { setError(e instanceof Error ? e.message : "Не удалось изменить статус"); } finally { setBusy(false); } }
  return <article className={`waiting-card ${item.is_reminder_due && item.status === "waiting" ? "waiting-card--due" : ""}`}><div className="waiting-card__top"><div>{projectName ? <span className="eyebrow">{projectName}</span> : null}<h3>{item.title}</h3></div><WaitingStatusBadge status={item.status} due={item.is_reminder_due}/></div><div className="waiting-card__body"><div><span>Ждём от</span><strong>{item.waiting_from}</strong></div><div><span>Запрос отправлен</span><strong>{formatDate(item.requested_at)}</strong></div><div><span>Напомнить</span><strong>{formatDate(item.next_reminder_date)}</strong></div>{procurementName ? <div><span>Позиция</span><strong>{procurementName}</strong></div> : null}</div>{item.notes ? <p className="waiting-card__note">{item.notes}</p> : null}{error ? <div className="inline-error">{error}</div> : null}<div className="button-row button-row--compact">{item.status === "waiting" ? <><button className="button button--primary button--small" type="button" disabled={busy} onClick={() => change("resolved")}>Получено</button><button className="button button--ghost button--small" type="button" disabled={busy} onClick={() => change("cancelled")}>Отменить</button></> : <button className="button button--secondary button--small" type="button" disabled={busy} onClick={() => change("waiting")}>Открыть снова</button>}</div></article>;
}
