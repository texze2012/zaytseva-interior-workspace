import type { Metadata } from "next";
import "@/app/globals.css";
import "@/app/redesign.css";
import "@/app/project-gallery.css";
import "@/app/workspace-interactive.css";
import "@/app/task-board-interactive.css";
import "@/app/calendar-interactive.css";
import "@/app/procurement-interactive.css";
import { AuthProvider } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Zaytseva Interior Workspace",
  description: "Рабочее пространство дизайн-студии",
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ru"><body><AuthProvider>{children}</AuthProvider></body></html>;
}
