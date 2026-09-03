"use client";

import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/lib/auth";

export default function ProfilePage() {
  const { user } = useAuth();
  return <div className="content-page">
    <PageHeader eyebrow="ПРОФИЛЬ" title={user?.name || "Профиль"} subtitle="Данные вашей учётной записи."/>
    <section className="profile-page-card">
      <div className="detail-pair"><span>Имя</span><strong>{user?.name}</strong></div>
      <div className="detail-pair"><span>Email</span><strong>{user?.email}</strong></div>
      <div className="detail-pair"><span>Роль</span><strong>{user?.role === "owner" ? "Руководитель студии" : "Дизайнер / комплектатор"}</strong></div>
    </section>
  </div>;
}
