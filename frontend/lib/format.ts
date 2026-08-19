import {
  ProjectStatus,
  ProjectType,
  TaskPriority,
  TaskStatus,
} from "@/lib/types";

export const projectTypeLabel: Record<ProjectType, string> = {
  apartment: "Квартира",
  house: "Загородный дом",
  apartments: "Апартаменты",
  commercial: "Коммерческий объект",
};

export const projectStatusLabel: Record<ProjectStatus, string> = {
  planned: "Запланировано",
  in_progress: "В работе",
  review: "На согласовании",
  completed: "Завершено",
  archived: "Архив",
};

export const taskStatusLabel: Record<TaskStatus, string> = {
  planned: "Запланировано",
  in_progress: "В работе",
  review: "На согласовании",
  done: "Готово",
};

export const priorityLabel: Record<TaskPriority, string> = {
  low: "Низкий",
  medium: "Средний",
  high: "Высокий",
  urgent: "Срочный",
};

export function formatDate(value?: string | null) {
  if (!value) return "Без срока";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
  }).format(new Date(`${value}T12:00:00`));
}

export function formatLongDate(value?: string | null) {
  if (!value) return "Срок не указан";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function isToday(value?: string | null) {
  if (!value) return false;
  const today = new Date();
  const target = new Date(`${value}T12:00:00`);
  return (
    today.getFullYear() === target.getFullYear() &&
    today.getMonth() === target.getMonth() &&
    today.getDate() === target.getDate()
  );
}

export function getProjectProgress(
  tasks: { status: TaskStatus }[]
) {
  if (tasks.length === 0) return 0;
  const done = tasks.filter((task) => task.status === "done").length;
  return Math.round((done / tasks.length) * 100);
}

export function getInitial(value: string) {
  return value.trim().charAt(0).toUpperCase() || "Z";
}
