"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon, IconName } from "@/components/Icon";
import { Modal } from "@/components/Modal";
import { useAuth } from "@/lib/auth";

const links: Array<{ href: string; label: string; icon: IconName }> = [
  { href: "/dashboard", label: "Главная", icon: "dashboard" },
  { href: "/projects", label: "Проекты", icon: "projects" },
  { href: "/tasks", label: "Задачи", icon: "tasks" },
  { href: "/calendar", label: "Календарь", icon: "calendar" },
];
const moreLinks: Array<{ href: string; label: string; detail: string; icon: IconName }> = [
  {href:"/waiting",label:"Жду",detail:"Ответы и договорённости",icon:"waiting"},
  {href:"/reminders",label:"Напоминания",detail:"Позвонить, уточнить, ответить",icon:"bell"},
  {href:"/selection",label:"Отбор",detail:"Варианты для согласования",icon:"check"},
  {href:"/updates",label:"Что нового",detail:"Изменения в пространстве",icon:"file"},
  {href:"/profile",label:"Профиль",detail:"Ваши данные",icon:"user"},
];
export function BottomNav() {
  const pathname=usePathname();
  const {user,logout}=useAuth();
  const [open,setOpen]=useState(false);
  useEffect(()=>{setOpen(false);},[pathname]);
  const isActive=(href:string)=>pathname===href||pathname.startsWith(`${href}/`);
  return <>
    <nav className="bottom-nav" aria-label="Мобильная навигация">{links.map(link=><Link key={link.href} href={link.href} aria-current={isActive(link.href)?"page":undefined} className={`bottom-nav__item ${isActive(link.href)?"bottom-nav__item--active":""}`}><Icon name={link.icon} size={20}/><small>{link.label}</small></Link>)}
      <button className={`bottom-nav__item ${!links.some(link=>isActive(link.href))||open?"bottom-nav__item--active":""}`} onClick={()=>setOpen(true)} aria-expanded={open} aria-label="Ещё разделы"><Icon name="menu" size={20}/><small>Ещё</small></button>
    </nav>
    {open?<Modal title="Рабочее пространство" subtitle={user?.name} onClose={()=>setOpen(false)}><div className="mobile-menu-grid">
      {moreLinks.map(link=><Link href={link.href} key={link.href} className={isActive(link.href)?"active":""} onClick={()=>setOpen(false)}><Icon name={link.icon} size={21}/><span><strong>{link.label}</strong><small>{link.detail}</small></span><Icon name="chevronRight" size={16}/></Link>)}
      {user?.role==="owner"?<Link href="/team" onClick={()=>setOpen(false)}><Icon name="projects" size={21}/><span><strong>Команда</strong><small>Сотрудники студии</small></span><Icon name="chevronRight" size={16}/></Link>:null}
      <button className="mobile-menu-logout" onClick={logout}><Icon name="logout" size={18}/>Выйти из аккаунта</button>
    </div></Modal>:null}
  </>;
}
