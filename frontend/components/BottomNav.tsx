"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, IconName } from "@/components/Icon";

const links: Array<{ href: string; label: string; icon: IconName }> = [
  { href: "/dashboard", label: "Главная", icon: "dashboard" },
  { href: "/projects", label: "Проекты", icon: "projects" },
  { href: "/waiting", label: "Жду", icon: "waiting" },
  { href: "/calendar", label: "Календарь", icon: "calendar" },
  { href: "/tasks", label: "Задачи", icon: "tasks" },
];

export function BottomNav() {
  const pathname = usePathname();
  return <nav className="bottom-nav">{links.map((link) => {
    const active = pathname === link.href || (link.href !== "/dashboard" && pathname.startsWith(`${link.href}/`));
    return <Link key={link.href} href={link.href} className={`bottom-nav__item ${active ? "bottom-nav__item--active" : ""}`}><Icon name={link.icon} size={20}/><small>{link.label}</small></Link>;
  })}</nav>;
}
