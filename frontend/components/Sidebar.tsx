"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon, IconName } from "@/components/Icon";
import { useAuth } from "@/lib/auth";
import { getInitial } from "@/lib/format";

const links: Array<{ href: string; label: string; icon: IconName }> = [
  { href: "/dashboard", label: "Главная", icon: "dashboard" },
  { href: "/projects", label: "Проекты", icon: "projects" },
  { href: "/waiting", label: "Жду", icon: "waiting" },
  { href: "/calendar", label: "Календарь", icon: "calendar" },
  { href: "/reminders", label: "Напоминания", icon: "waiting" },
  { href: "/tasks", label: "Задачи", icon: "tasks" },
  { href: "/selection", label: "Отбор", icon: "check" },
  { href: "/updates", label: "Что нового", icon: "check" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  useEffect(() => { setOpen(false); }, [pathname]);

  return <aside className="sidebar">
    <Link href="/dashboard" className="brand"><span className="brand__mark">ZI</span><span><strong>Zaytseva</strong><small>INTERIOR WORKSPACE</small></span></Link>
    <span className="sidebar__label">Рабочее пространство</span>
    <nav className="sidebar__nav" aria-label="Главная навигация">
      {links.map((link) => {
        const active = pathname === link.href || (link.href !== "/dashboard" && pathname.startsWith(`${link.href}/`));
        return <Link key={link.href} href={link.href} aria-current={active ? "page" : undefined} className={`nav-link ${active ? "nav-link--active" : ""}`}><Icon name={link.icon} size={18}/><span>{link.label}</span>{active ? <span className="nav-link__indicator" aria-hidden="true"/> : null}</Link>;
      })}
    </nav>

    <div className="profile-menu" ref={wrapperRef}>
      {open ? <div className="profile-menu__popover">
        <div className="profile-menu__identity"><strong>{user?.name}</strong><span>{user?.email}</span></div>
        <Link href="/profile" className="profile-menu__item"><Icon name="user" size={17}/><span>Профиль</span></Link>
        {user?.role === "owner" ? <Link href="/team" className="profile-menu__item"><Icon name="projects" size={17}/><span>Управление командой</span></Link> : null}
        <div className="profile-menu__divider"/>
        <button type="button" className="profile-menu__item profile-menu__item--danger" onClick={logout}><Icon name="logout" size={17}/><span>Выйти</span></button>
      </div> : null}

      <button type="button" className={`profile-card ${open ? "profile-card--open" : ""}`} onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        <span className="avatar">{getInitial(user?.name || "Z")}</span>
        <span className="profile-card__text"><strong>{user?.name}</strong><small>{user?.role === "owner" ? "Руководитель студии" : "Дизайнер / комплектатор"}</small></span>
        <Icon name="chevronRight" size={17}/>
      </button>
    </div>
  </aside>;
}
