import { ProcurementStatusBadge } from "@/components/StatusBadge";
import { formatDate, formatMoney } from "@/lib/format";
import { ProcurementItem } from "@/lib/types";
export function ProcurementCard({ item, onClick }: { item: ProcurementItem; onClick: () => void }) {
  return <button type="button" className="procurement-card" onClick={onClick}><div className="procurement-card__top"><div><span className="eyebrow">{item.room || item.category || "Позиция"}</span><strong>{item.name}</strong><small>{[item.brand, item.article].filter(Boolean).join(" · ") || "Без бренда и артикула"}</small></div><ProcurementStatusBadge status={item.status}/></div><div className="procurement-card__numbers"><span><small>Количество</small><strong>{item.quantity} {item.unit}</strong></span><span><small>Сумма</small><strong>{formatMoney(item.total_amount, item.currency)}</strong></span><span><small>Поставщик</small><strong>{item.supplier_name || "Не указан"}</strong></span><span><small>Поставка</small><strong>{formatDate(item.expected_delivery_date)}</strong></span></div></button>;
}
