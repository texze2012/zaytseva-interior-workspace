import { formatDate } from "@/lib/format";
import { Agreement } from "@/lib/types";
export function AgreementCard({ item, responsibleName, procurementName }: { item: Agreement; responsibleName?: string; procurementName?: string }) {
  return <article className="agreement-card"><header><span className="eyebrow">{formatDate(item.agreement_date)}</span><strong>{item.with_whom}</strong></header><p className="agreement-card__decision">{item.decision}</p>{item.action ? <div className="agreement-card__action"><span>Следующее действие</span><strong>{item.action}</strong></div> : null}<footer>{procurementName ? <span>Позиция: {procurementName}</span> : null}<span>Ответственный: {responsibleName || "Не назначен"}</span><span>Срок: {formatDate(item.deadline)}</span>{item.task_id ? <span>Связанная задача #{item.task_id}</span> : null}</footer></article>;
}
