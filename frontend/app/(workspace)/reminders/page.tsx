"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { ScheduledEntry, UserOption } from "@/lib/types";
import { parseInstant } from "@/lib/scheduling";
import { PageHeader } from "@/components/PageHeader";
import { PeopleFilter } from "@/components/ScheduleFields";
import { Modal } from "@/components/Modal";
import { EntryForm } from "@/components/EntryForm";
export default function RemindersPage(){
 const {token,user}=useAuth();const [items,setItems]=useState<ScheduledEntry[]>([]);const [users,setUsers]=useState<UserOption[]>([]);const [person,setPerson]=useState("all");const [showDone,setShowDone]=useState(false);const [edit,setEdit]=useState<ScheduledEntry|null|undefined>(undefined);const [error,setError]=useState("");const [loading,setLoading]=useState(true);const [busy,setBusy]=useState(false);
 useEffect(()=>{if(!token||!user)return;Promise.all([api.entries(token,"reminders"),api.userOptions(token,user)]).then(([r,u])=>{setItems(r);setUsers(u);}).catch(e=>setError(String(e))).finally(()=>setLoading(false));},[token,user]);
 const visible=items.filter(r=>(showDone||!r.completed)&&(person==="all"||r.assignee_ids.includes(person==="mine"?user!.id:Number(person))));
 return <div className="content-page"><PageHeader title="Напоминания" eyebrow="КОРОТКИЕ ДЕЙСТВИЯ" subtitle="Позвонить, узнать, ответить — достаточно отметить выполненным." actions={<button className="button button--primary" onClick={()=>setEdit(null)}>Новое напоминание</button>}/><PeopleFilter users={users} value={person} onChange={setPerson}/><label className="check-filter"><input type="checkbox" checked={showDone} onChange={e=>setShowDone(e.target.checked)}/>Показывать выполненные</label>{error?<div className="form-error">{error}</div>:null}<section className="section"><div className="compact-list">{visible.map(r=><article className="compact-row" key={r.id}><label className="check-filter"><input aria-label={`Выполнено: ${r.title}`} type="checkbox" disabled={busy||!(user?.role==="owner"||r.created_by_id===user?.id||r.assignee_ids.includes(user?.id||0))} checked={r.completed} onChange={async e=>{if(!token)return;setBusy(true);try{const updated=await api.updateEntry(token,"reminders",r.id,{completed:e.target.checked});setItems(current=>current.map(x=>x.id===r.id?updated:x));}catch(e){setError(String(e));}finally{setBusy(false);}}}/><span><strong>{r.title}</strong><small>{parseInstant(r.due_at).toLocaleString("ru-RU")} · {r.assignee_ids.map(id=>users.find(u=>u.id===id)?.name).join(", ")}</small></span></label><button className="button button--secondary button--small" onClick={()=>setEdit(r)}>Открыть</button></article>)}</div>{loading?<p>Загружаем напоминания…</p>:!visible.length?<p className="quiet-state">Напоминаний нет.</p>:null}</section>{edit!==undefined?<Modal title={edit?"Напоминание":"Новое напоминание"} onClose={()=>setEdit(undefined)}><EntryForm kind="reminders" entry={edit||undefined} onCancel={()=>setEdit(undefined)} onSaved={r=>{setItems(current=>[r,...current.filter(x=>x.id!==r.id)].sort((a,b)=>a.due_at.localeCompare(b.due_at)));setEdit(undefined);}}/></Modal>:null}</div>;
}
