import { Icon, IconName } from "@/components/Icon";
export function MetricCard({ label, value, note, tone = "neutral", icon }: { label: string; value: string | number; note?: string; tone?: "neutral" | "danger" | "warn" | "good"; icon: IconName }) {
  return <div className={`metric-card metric-card--${tone}`}><div className="metric-card__top"><span>{label}</span><Icon name={icon} size={18}/></div><strong>{value}</strong>{note ? <small>{note}</small> : null}</div>;
}
