"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Task, UserOption, Project } from "@/lib/types";
import { localDate, isOverdue, personIds } from "@/lib/scheduling";
import { PeopleFilter } from "@/components/ScheduleFields";
import { TaskBoard } from "@/components/TaskBoard";
import { TaskDetailsModal } from "@/components/TaskDetailsModal";
import { Icon } from "@/components/Icon";
import { Modal } from "@/components/Modal";
import { NewTaskForm } from "@/components/NewTaskForm";
export function TaskDispatcher({onChanged}:{onChanged?:()=>void}={}){
 const {token,user}=useAuth();const [projects,setProjects]=useState<Project[]>([]);const [tasks,setTasks]=useState<Task[]>([]);const [users,setUsers]=useState<UserOption[]>([]);const [person,setPerson]=useState("all");const [period,setPeriod]=useState("all");const [selected,setSelected]=useState<Task|null>(null);const [adding,setAdding]=useState(false);const [error,setError]=useState("");const [loading,setLoading]=useState(true);
 useEffect(()=>{if(!token||!user)return;Promise.all([api.taskFeed(token),api.userOptions(token,user),api.projects(token)]).then(([t,u,p])=>{setTasks(t);setUsers(u);setProjects(p);}).catch(e=>setError(String(e))).finally(()=>setLoading(false));},[token,user]);
 function replace(t:Task){setTasks(current=>current.map(x=>x.id===t.id?t:x));setSelected(current=>current?.id===t.id?t:current);onChanged?.();}
 const own=tasks.filter(t=>person==="all"||personIds(t).includes(person==="mine"?user!.id:Number(person)));const visible=own.filter(t=>period==="all"||period==="today"&&t.deadline===localDate()||period==="overdue"&&isOverdue(t));
 return <section className="section dispatcher"><div className="section-heading"><div><h2>Работа команды</h2><p>Сегодня: {own.filter(t=>t.deadline===localDate()&&t.status!=="done").length} · Просрочено: {own.filter(isOverdue).length}</p></div><button className="button button--primary" onClick={()=>setAdding(true)}><Icon name="plus" size={16}/>Новая задача</button></div><div className="dispatcher-filters"><PeopleFilter users={users} value={person} onChange={setPerson}/><div className="dispatcher-period" aria-label="Период задач">{[["all","Все активные"],["today","Сегодня"],["overdue","Просрочено"]].map(([id,label])=><button key={id} className={period===id?"active":""} aria-pressed={period===id} onClick={()=>setPeriod(id)}>{label}</button>)}</div></div>{error?<div className="form-error">{error}</div>:null}{loading?<p>Загружаем задачи…</p>:<TaskBoard compact projects={projects} tasks={visible} users={users} onSelect={setSelected} onUpdated={replace}/>}{selected?<TaskDetailsModal task={selected} projectName={projects.find(p=>p.id===selected.project_id)?.name} users={users} onClose={()=>setSelected(null)} onTaskUpdated={replace} onDeleted={id=>{setTasks(current=>current.filter(t=>t.id!==id));onChanged?.();}}/>:null}{adding?<Modal title="Новая задача" onClose={()=>setAdding(false)}><NewTaskForm onCancel={()=>setAdding(false)} onCreated={t=>{setTasks(current=>[t,...current]);setAdding(false);onChanged?.();}}/></Modal>:null}</section>;
}
