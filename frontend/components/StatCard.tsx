import { ReactNode } from "react";

export function StatCard({
  label,
  value,
  hint,
  tone = "neutral",
  icon,
}: {
  label: string;
  value: number | string;
  hint?: string;
  tone?: "neutral" | "sand" | "blue" | "green" | "red";
  icon?: ReactNode;
}) {
  return (
    <div className={`stat-card stat-card--${tone}`}>
      <div className="stat-card__top">
        <span className="stat-card__icon">{icon ?? "•"}</span>
        <span>{label}</span>
      </div>
      <strong>{value}</strong>
      {hint ? <small>{hint}</small> : null}
    </div>
  );
}
