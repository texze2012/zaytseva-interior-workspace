"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/dashboard", label: "Главная", mark: "⌂" },
  { href: "/projects", label: "Проекты", mark: "▦" },
  { href: "/tasks", label: "Задачи", mark: "✓" },
  { href: "/calendar", label: "Календарь", mark: "□" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="bottom-nav">
      {links.map((link) => {
        const active =
          pathname === link.href ||
          (link.href !== "/dashboard" &&
            pathname.startsWith(`${link.href}/`));

        return (
          <Link
            key={link.href}
            href={link.href}
            className={`bottom-nav__item ${
              active ? "bottom-nav__item--active" : ""
            }`}
          >
            <span>{link.mark}</span>
            <small>{link.label}</small>
          </Link>
        );
      })}
    </nav>
  );
}
