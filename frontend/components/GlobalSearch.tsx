"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
import {Modal} from "@/components/Modal";
import {Icon} from "@/components/Icon";
import {api} from "@/lib/api";
import {useAuth} from "@/lib/auth";
type Result={key:string;title:string;context:string;href:string};
export function GlobalSearch(){
 const {token}=useAuth();const [open,setOpen]=useState(false);const [query,setQuery]=useState("");const [rows,setRows]=useState<Result[]>([]);const [loading,setLoading]=useState(false);const [error,setError]=useState("");
 useEffect(()=>{const onKey=(event:KeyboardEvent)=>{if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==="k"){event.preventDefault();setOpen(true);}};window.addEventListener("keydown",onKey);return()=>window.removeEventListener("keydown",onKey);},[]);
 useEffect(()=>{if(!open||!token)return;let active=true;setLoading(true);setError("");(async()=>{try{
  const [projects,tasks]=await Promise.all([api.projects(token),api.taskFeed(token)]);
  const groups=await Promise.allSettled(projects.map(p=>api.procurementItems(token,p.id)));
  const results:Result[]=[...projects.map(p=>({key:`p${p.id}`,title:p.name,context:`Проект · ${p.client_name} · ${p.address||""}`,href:`/projects/${p.id}`})),...tasks.map(t=>({key:`t${t.id}`,title:t.title,context:`Задача · ${projects.find(p=>p.id===t.project_id)?.name||"Общая"} · ${t.description||""}`,href:`/tasks?task=${t.id}`}))];
  groups.forEach((g,index)=>{if(g.status==="fulfilled")results.push(...g.value.map(i=>({key:`i${i.id}`,title:i.name,context:`Комплектация · ${projects[index].name} · ${i.room||""} · ${i.article||""} · ${i.supplier_name||""}`,href:`/projects/${i.project_id}?tab=procurement&item=${i.id}`})));});
  if(active){setRows(results);if(groups.some(g=>g.status==="rejected"))setError("Часть комплектации не загрузилась. Закройте поиск и попробуйте снова.");}
 }catch{if(active){setRows([]);setError("Не удалось загрузить поиск. Проверьте соединение и откройте поиск повторно.");}}finally{if(active)setLoading(false);}})();return()=>{active=false;};},[open,token]);
 const found=query.trim().length<2?[]:rows.filter(r=>(r.title+" "+r.context).toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
 return <><button className="workspace-search" onClick={()=>setOpen(true)} aria-label="Поиск по рабочему пространству"><Icon name="search" size={18}/><span>Найти в пространстве</span><kbd>Ctrl K</kbd></button>{open?<Modal title="Поиск по рабочему пространству" onClose={()=>setOpen(false)}><label className="field"><span>Проект, задача или позиция</span><input autoFocus type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Название, клиент, артикул…"/></label>{error?<p role="alert" className="form-error">{error}</p>:null}{loading?<p>Загружаем данные…</p>:query.trim().length<2?<p className="muted">Введите минимум два символа.</p>:<><p className="muted">Найдено: {found.length}{found.length>50?" · показаны первые 50, уточните запрос":""}</p><div className="search-results">{found.slice(0,50).map(r=><Link key={r.key} href={r.href} onClick={()=>{window.dispatchEvent(new CustomEvent("zi:search-open",{detail:r.href}));setOpen(false);}}><strong>{r.title}</strong><small>{r.context}</small></Link>)}</div></>}</Modal>:null}</>;
}
