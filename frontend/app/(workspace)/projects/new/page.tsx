import Link from "next/link";
import { Icon } from "@/components/Icon";
import { PageHeader } from "@/components/PageHeader";
import { ProjectForm } from "@/components/ProjectForm";
export default function NewProjectPage() { return <div className="content-page content-page--narrow"><PageHeader eyebrow="ПРОЕКТЫ" title="Новый проект" subtitle="После создания стандартные этапы проекта появятся автоматически." actions={<Link href="/projects" className="button button--secondary"><Icon name="chevronLeft" size={17}/>К проектам</Link>}/><ProjectForm/></div>; }
