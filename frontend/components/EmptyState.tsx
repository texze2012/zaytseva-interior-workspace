import { ReactNode } from "react";
export function EmptyState({ title, text, action }: { title: string; text?: string; action?: ReactNode }) {
  return <div className="empty-state"><strong>{title}</strong>{text ? <p>{text}</p> : null}{action ? <div>{action}</div> : null}</div>;
}
