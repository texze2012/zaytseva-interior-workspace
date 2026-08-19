"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useAuth } from "@/lib/auth";
import { getInitial } from "@/lib/format";

const links = [
  { href: "/dashboard", label: "Главная", mark: "⌂" },
  { href: "/projects", label: "Проекты", mark: "▦" },
  { href: "/tasks", label: "Задачи", mark: "✓" },
  { href: "/calendar", label: "Календарь", mark: "□" },
  { href: "/activity", label: "Активность", mark: "◌" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand__monogram">ZI</div>
        <div>
          <div className="brand__name">Zaytseva</div>
          <div className="brand__sub">INTERIOR</div>
        </div>
      </div>

      <nav className="sidebar__nav">
        {links.map((link) => {
          const active =
            pathname === link.href ||
            (link.href !== "/dashboard" &&
              pathname.startsWith(`${link.href}/`));

          return (
            <Link
              className={`nav-link ${active ? "nav-link--active" : ""}`}
              href={link.href}
              key={link.href}
            >
              <span className="nav-link__mark">{link.mark}</span>
              <span>{link.label}</span>
            </Link>
          );
        })}
      </nav>

      <button className="profile-card" onClick={logout} type="button">
        <span className="avatar">
          {getInitial(user?.name || "Z")}
        </span>
        <span className="profile-card__text">
          <strong>{user?.name || "Пользователь"}</strong>
          <small>
            {user?.role === "owner"
              ? "Руководитель студии"
              : "Дизайнер"}
          </small>
        </span>
        <span className="profile-card__logout">↗</span>
      </button>
    </aside>
  );
}
