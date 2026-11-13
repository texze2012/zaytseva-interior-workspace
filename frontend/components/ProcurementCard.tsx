import { localDate } from "@/lib/scheduling";
import { ProcurementStatusBadge } from "@/components/StatusBadge";
import { ProductPhoto } from "@/components/ProductPhoto";
import { formatDate, formatMoney } from "@/lib/format";
import { ProcurementItem } from "@/lib/types";
export function ProcurementCard({ item, onClick }: { item: ProcurementItem; onClick: () => void }) {
  const overdue = item.expected_delivery_date && item.expected_delivery_date < localDate() && !["delivered", "completed"].includes(item.status);
  return <button type="button" className="procurement-card procurement-card--visual" onClick={onClick}>
    <span className="procurement-card__image"><ProductPhoto target={{projectId:item.project_id,itemId:item.id}} fallbackTarget={item.selected_variant_id ? {projectId:item.project_id,itemId:item.id,variantId:item.selected_variant_id} : undefined} alt={item.name}/><span className="procurement-card__image-status"><ProcurementStatusBadge status={item.status}/></span></span>
    <span className="procurement-card__body"><span className="procurement-card__top"><span><span className="eyebrow">{[item.room,item.category].filter(Boolean).join(" · ") || "Позиция"}</span><strong>{item.name}</strong><small>{item.sourcing_type === "custom" ? "На заказ · " : ""}{[item.brand,item.article].filter(Boolean).join(" · ") || "Без бренда и артикула"}</small></span></span>
      {item.status === "studio_review" ? <span className="attention-label">Требуется решение руководителя</span> : item.status === "approval" ? <span className="attention-label">Ждём согласования клиента</span> : null}
      {overdue ? <span className="attention-label attention-label--danger">Поставка просрочена</span> : null}
      <span className="procurement-card__price">{formatMoney(item.total_amount,item.currency)}<small>{item.quantity} {item.unit}</small></span>
      <span className="procurement-card__numbers"><span><small>Поставщик</small><strong>{item.supplier_name || "Не указан"}</strong></span><span><small>Поставка</small><strong>{formatDate(item.expected_delivery_date)}</strong></span></span>
      <span className="procurement-card__open">Открыть позицию <span aria-hidden="true">↗</span></span>
    </span>
  </button>;
}
