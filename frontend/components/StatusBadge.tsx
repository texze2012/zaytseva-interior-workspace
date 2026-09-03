import {
  paymentStatusLabels,
  procurementStatusLabels,
  projectStatusLabels,
  taskStatusLabels,
  waitingStatusLabels,
} from "@/lib/format";
import { PaymentStatus, ProcurementStatus, ProjectStatus, TaskStatus, WaitingStatus } from "@/lib/types";

export function StatusBadge({ label, tone = "neutral" }: { label: string; tone?: "neutral" | "good" | "warn" | "danger" | "info" }) {
  return <span className={`status-badge status-badge--${tone}`}>{label}</span>;
}

export function ProcurementStatusBadge({ status }: { status: ProcurementStatus }) {
  const tone = status === "problem" ? "danger" : ["delivered", "completed", "approved"].includes(status) ? "good" : ["approval", "quote_requested", "quote_received"].includes(status) ? "warn" : "neutral";
  return <StatusBadge label={procurementStatusLabels[status]} tone={tone} />;
}
export function WaitingStatusBadge({ status, due = false }: { status: WaitingStatus; due?: boolean }) {
  const tone = due && status === "waiting" ? "danger" : status === "resolved" ? "good" : status === "waiting" ? "warn" : "neutral";
  return <StatusBadge label={waitingStatusLabels[status]} tone={tone} />;
}
export function PaymentStatusBadge({ status, overdue = false }: { status: PaymentStatus; overdue?: boolean }) {
  const tone = overdue ? "danger" : status === "paid" ? "good" : status === "pending" ? "warn" : "neutral";
  return <StatusBadge label={paymentStatusLabels[status]} tone={tone} />;
}
export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const tone = status === "done" ? "good" : status === "review" ? "warn" : status === "in_progress" ? "info" : "neutral";
  return <StatusBadge label={taskStatusLabels[status]} tone={tone} />;
}
export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  const tone = status === "completed" ? "good" : status === "review" ? "warn" : status === "in_progress" ? "info" : "neutral";
  return <StatusBadge label={projectStatusLabels[status]} tone={tone} />;
}
