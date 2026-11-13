"use client";
import Link from "next/link";
import {useCallback,useEffect,useState} from "react";
import {TaskDispatcher} from "@/components/TaskDispatcher";
import {PageHeader} from "@/components/PageHeader";
import {Icon} from "@/components/Icon";
import {api} from "@/lib/api";
import {useAuth} from "@/lib/auth";
import {formatDate} from "@/lib/format";
import {localDate,parseInstant,isOverdue,localTime} from "@/lib/scheduling";
import {Project,ProcurementItem,WaitingItem,Task} from "@/lib/types";
export default function DashboardPage(){
 const {token,user}=useAuth();const [tasks,setTasks]=useState<Task[]>([]);const [projects,setProjects]=useState<Project[]>([]);const [items,setItems]=useState<ProcurementItem[]>([]);const [waiting,setWaiting]=useState<WaitingItem[]>([]);const [loading,setLoading]=useState(true);const [error,setError]=useState("");const [refresh,setRefresh]=useState(0);
 const load=useCallback(async()=>{if(!token)return;setLoading(true);setError("");try{const [ps,ws,ts]=await Promise.all([api.projects(token),api.waitingFeed(token,{status:"waiting"}),api.taskFeed(token)]);const groups=await Promise.all(ps.map(p=>api.procurementItems(token,p.id)));setProjects(ps);setItems(groups.flat());setWaiting(ws);setTasks(ts);}catch(e){setError(e instanceof Error?e.message:"Не удалось проверить записи, требующие внимания");}finally{setLoading(false);}},[token]);
 useEffect(()=>{load();},[load,refresh]);
 useEffect(()=>{const timer=setInterval(load,60000);const focus=()=>{load();};window.addEventListener("focus",focus);return()=>{clearInterval(timer);window.removeEventListener("focus",focus);};},[load]);
 const overdueTasks=tasks.filter(isOverdue).sort((a,b)=>String(a.due_at||a.deadline).localeCompare(String(b.due_at||b.deadline)));
 const today=localDate();const projectName=(id:number)=>projects.find(p=>p.id===id)?.name||"Проект";
 const attention=items.filter(i=>i.status==="problem"||Boolean(i.expected_delivery_date&&i.expected_delivery_date<today&&!["delivered","completed"].includes(i.status))).sort((a,b)=>String(a.expected_delivery_date||"9999").localeCompare(String(b.expected_delivery_date||"9999")));
 const reminders=waiting.filter(w=>w.status==="waiting"&&(w.due_at?parseInstant(w.due_at).getTime()<=Date.now():Boolean(w.next_reminder_date&&w.next_reminder_date<=today))).sort((a,b)=>String(a.due_at||a.next_reminder_date).localeCompare(String(b.due_at||b.next_reminder_date)));
 return <div className="content-page"><PageHeader eyebrow="РАБОЧИЙ ДЕНЬ" title={`Добрый день, ${user?.name?.split(" ")[0]||""}`} subtitle="Задачи команды и вопросы, которым нужна ваша реакция." actions={<button className="button button--secondary" disabled={loading} onClick={()=>setRefresh(n=>n+1)}>Обновить</button>}/><TaskDispatcher key={refresh} onChanged={load}/>
 <section className="dashboard-attention" aria-labelledby="attention-title"><h2 id="attention-title">Требует внимания</h2>{loading?<p className="muted" role="status">Проверяем задачи, поставки и ожидания…</p>:error?<div className="form-error" role="alert">Не удалось проверить все записи. {error}<button className="button button--secondary button--small" onClick={load}>Повторить</button></div>:overdueTasks.length||attention.length||reminders.length?<div className="dashboard-action-list">
 {overdueTasks.map(t=><Link key={`task-${t.id}`} className="dashboard-action-row" href={`/tasks?task=${t.id}`}><Icon name="tasks" size={19}/><span><strong>{t.title}</strong><small>{t.project_id?projectName(t.project_id):"Общая задача"}</small><span className="dashboard-action-reason">Задача просрочена · срок {formatDate(t.deadline)} {localTime(t.due_at)}</span></span><Icon name="chevronRight" size={17}/></Link>)}
 {attention.map(i=>{const overdue=Boolean(i.expected_delivery_date&&i.expected_delivery_date<today&&!["delivered","completed"].includes(i.status));return <Link key={`item-${i.id}`} className="dashboard-action-row" href={`/projects/${i.project_id}?tab=procurement&item=${i.id}`}><Icon name="alert" size={19}/><span><strong>{i.name}</strong><small>{projectName(i.project_id)}{i.supplier_name?` · ${i.supplier_name}`:""}</small><span className="dashboard-action-reason">{i.status==="problem"?"Проблемная позиция":""}{i.status==="problem"&&overdue?" · ":""}{overdue?`Поставка просрочена с ${formatDate(i.expected_delivery_date)}`:""}</span></span><Icon name="chevronRight" size={17}/></Link>;})}
 {reminders.map(w=><Link key={`waiting-${w.id}`} className="dashboard-action-row dashboard-action-row--waiting" href={`/waiting?waiting=${w.id}`}><Icon name="waiting" size={19}/><span><strong>{w.title}</strong><small>{projectName(w.project_id)} · {w.waiting_from}</small><span className="dashboard-action-reason">Пора напомнить · {formatDate(w.next_reminder_date||w.due_at?.slice(0,10))}</span></span><Icon name="chevronRight" size={17}/></Link>)}
 </div>:<p className="dashboard-all-clear"><Icon name="check" size={18}/>Всё под контролем</p>}</section></div>;
}
