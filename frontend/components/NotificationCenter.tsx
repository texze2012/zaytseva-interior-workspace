"use client";
import { GlobalSearch } from "@/components/GlobalSearch";
import { Icon } from "@/components/Icon";
import { currentRelease } from "@/lib/releases";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { NotificationItem } from "@/lib/types";
import { parseInstant } from "@/lib/scheduling";

const sections: Record<string,string> = {dashboard:"Главная",projects:"Проекты",tasks:"Задачи",waiting:"Жду",calendar:"Календарь",reminders:"Напоминания",selection:"Отбор",updates:"Что нового",profile:"Профиль",team:"Команда"};

export function NotificationCenter() {
 const {token}=useAuth();
 const pathname=usePathname();
 const [items,setItems]=useState<NotificationItem[]>([]);
 const [error,setError]=useState("");
 const [open,setOpen]=useState(false);
 const panel=useRef<HTMLDivElement>(null);
 const trigger=useRef<HTMLButtonElement>(null);
 useEffect(()=>{
  if(!token)return;
  let active=true;
  const load=()=>api.notifications(token).then(rows=>{if(active){setItems(rows);setError("");}}).catch(()=>{if(active)setError("Уведомления временно недоступны");});
  load();const timer=setInterval(load,30000);
  return()=>{active=false;clearInterval(timer);};
 },[token]);
 useEffect(()=>{setOpen(false);},[pathname]);
 useEffect(()=>{
  if(!open)return;
  const outside=(event:PointerEvent)=>{if(!panel.current?.contains(event.target as Node))setOpen(false);};
  const escape=(event:KeyboardEvent)=>{if(event.key==="Escape"){setOpen(false);trigger.current?.focus();}};
  document.addEventListener("pointerdown",outside);document.addEventListener("keydown",escape);
  return()=>{document.removeEventListener("pointerdown",outside);document.removeEventListener("keydown",escape);};
 },[open]);
 return <header className="workspace-topbar">
  <div className="workspace-breadcrumb"><span>Студия</span><span aria-hidden="true">/</span><strong>{sections[pathname.split('/')[1]]||"Рабочее пространство"}</strong></div>
  <div className="workspace-tools">
   <GlobalSearch/>
   <Link href="/updates" className="workspace-release" title={`Что нового · ${currentRelease.version}`}>Что нового<span className="release-dot" aria-hidden="true"/></Link>
   <div className="notification-center" ref={panel}>
    <button ref={trigger} className={`notification-trigger ${error?"notification-trigger--error":""}`} onClick={()=>setOpen(!open)} aria-expanded={open} aria-controls="notification-panel" aria-label={`Уведомления${items.length?`: ${items.length}`:""}${error?", временно недоступны":""}`} title={error||"Уведомления"}>
     <Icon name="bell" size={20}/>{items.length?<span className="notification-count">{items.length>99?"99+":items.length}</span>:null}
    </button>
    {open?<div className="notification-panel" id="notification-panel"><div className="section-heading"><h3>Уведомления</h3><span className="muted">{items.length}</span></div>
     {error?<p role="alert">{error}</p>:null}
     {items.map(n=><div className="notification-row" key={n.id}><Link href={n.target_type==="task"?`/tasks?task=${n.target_id}`:n.target_type==="waiting"?"/waiting":n.target_type==="reminder"?"/reminders":"/calendar"} onClick={()=>setOpen(false)}><strong>{n.title}</strong><small>{parseInstant(n.due_at).toLocaleString("ru-RU")}</small></Link><button className="text-link" onClick={async()=>{try{await api.readNotification(token!,n.id);setItems(current=>current.filter(x=>x.id!==n.id));}catch{setError("Не удалось отметить уведомление прочитанным");}}}>Прочитано</button></div>)}
     {!items.length&&!error?<div className="notification-empty"><Icon name="check" size={22}/><strong>Всё спокойно</strong><p>Новые напоминания появятся здесь.</p></div>:null}
    </div>:null}
   </div>
  </div>
 </header>;
}
