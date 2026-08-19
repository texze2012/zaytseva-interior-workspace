import { PageHeader } from "@/components/PageHeader";
import { ProjectForm } from "@/components/ProjectForm";

export default function NewProjectPage() {
  return (
    <div className="content-page content-page--narrow">
      <PageHeader
        title="Новый проект"
        subtitle="Создайте карточку реального объекта. Этапы будут добавлены автоматически."
      />
      <ProjectForm />
    </div>
  );
}
