import {
  CalendarEventType,
  PaymentKind,
  PaymentStatus,
  ProcurementStatus,
  ProjectStatus,
  ProjectType,
  TaskPriority,
  TaskStatus,
  WaitingStatus,
} from "@/lib/types";

export function formatDate(value?: string | null, fallback = "Не указано") {
  if (!value) return fallback;
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(year, month - 1, day));
}

export function formatShortDate(value?: string | null, fallback = "—") {
  if (!value) return fallback;
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit" }).format(new Date(year, month - 1, day));
}

export function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(date);
}

export function formatMoney(value: number | string | null | undefined, currency = "RUB") {
  if (value === null || value === undefined || value === "") return "—";
  const number = Number(value);
  if (Number.isNaN(number)) return String(value);
  try {
    return new Intl.NumberFormat("ru-RU", { style: "currency", currency, maximumFractionDigits: 2 }).format(number);
  } catch {
    return `${new Intl.NumberFormat("ru-RU").format(number)} ${currency}`;
  }
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

export function getInitial(name: string) {
  return name.trim().charAt(0).toUpperCase() || "Z";
}

export const projectTypeLabels: Record<ProjectType, string> = {
  apartment: "Квартира",
  house: "Дом",
  apartments: "Апартаменты",
  commercial: "Коммерческий объект",
};

export const projectStatusLabels: Record<ProjectStatus, string> = {
  planned: "Запланирован",
  in_progress: "В работе",
  review: "На проверке",
  completed: "Завершён",
  archived: "Архив",
};

export const taskStatusLabels: Record<TaskStatus, string> = {
  planned: "Запланировано",
  in_progress: "В работе",
  review: "На согласовании",
  done: "Принято",
};

export const taskPriorityLabels: Record<TaskPriority, string> = {
  low: "Низкий",
  medium: "Средний",
  high: "Высокий",
  urgent: "Срочный",
};

export const procurementStatusLabels: Record<ProcurementStatus, string> = {
  selection: "Подбор",
  quote_requested: "КП запрошено",
  quote_received: "КП получено",
  approval: "На согласовании",
  approved: "Согласовано",
  ordered: "Заказано",
  in_production: "В производстве",
  in_delivery: "В доставке",
  delivered: "Доставлено",
  problem: "Проблема",
  completed: "Закрыто",
};

export const waitingStatusLabels: Record<WaitingStatus, string> = {
  waiting: "Ждём",
  resolved: "Получено",
  cancelled: "Отменено",
};

export const paymentKindLabels: Record<PaymentKind, string> = {
  client_payment: "От клиента",
  supplier_payment: "Поставщику",
  bonus: "Бонус / комиссия",
  other: "Прочее",
};

export const paymentStatusLabels: Record<PaymentStatus, string> = {
  pending: "Ожидается",
  paid: "Оплачено",
  cancelled: "Отменено",
};

export const calendarTypeLabels: Record<CalendarEventType, string> = {
  task: "Задача",
  waiting: "Ожидание",
  payment: "Оплата",
  delivery: "Поставка",
  project_stage: "Этап",
  agreement: "Договорённость",
};
