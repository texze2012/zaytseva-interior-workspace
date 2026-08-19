"use client";

import { ReactNode } from "react";

import { BottomNav } from "@/components/BottomNav";
import { Sidebar } from "@/components/Sidebar";
import { Spinner } from "@/components/Spinner";
import { useAuth } from "@/lib/auth";

export function AppShell({ children }: { children: ReactNode }) {
  const { loading, user } = useAuth();

  if (loading || !user) {
    return (
      <div className="fullscreen-loader">
        <Spinner />
        <span>Загружаем рабочее пространство</span>
      </div>
    );
  }

  return (
    <div className="workspace-shell">
      <Sidebar />
      <main className="workspace-main">{children}</main>
      <BottomNav />
    </div>
  );
}
