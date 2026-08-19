import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";

export default function ActivityPage() {
  return (
    <div className="content-page">
      <PageHeader
        title="Активность"
        subtitle="История действий студии"
      />

      <EmptyState
        title="Журнал активности подключим к backend"
        text="Текущий backend уже хранит проекты, задачи, статусы и комментарии. Для общего журнала нужен отдельный ActivityLog endpoint — экран оставлен в структуре, чтобы навигация соответствовала референсу."
      />
    </div>
  );
}
