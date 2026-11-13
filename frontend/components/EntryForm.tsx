"use client";
import { FormEvent, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { localDate, localTime, parseInstant, toInstant } from "@/lib/scheduling";
import { entryTimePayload } from "@/lib/calendarMoves";
import { Project, ScheduledEntry, UserOption } from "@/lib/types";
import { PeoplePicker, ScheduleFields } from "@/components/ScheduleFields";
import { FilePicker } from "@/components/FilePicker";
import { EntityAttachments } from "@/components/EntityAttachments";

export function EntryForm({kind,entry,initialDate,projectId,onSaved,onCancel}: {kind:"reminders"|"events";entry?:ScheduledEntry;initialDate?:string;projectId?:number;onSaved:(e:ScheduledEntry)=>void;onCancel:()=>void}) {
  const {token,user}=useAuth();const [users,setUsers]=useState<UserOption[]>([]);const [projects,setProjects]=useState<Project[]>([]);const [saved,setSaved]=useState(entry);const [files,setFiles]=useState<File[]>([]);const [busy,setBusy]=useState(false);const [error,setError]=useState("");
  const [form,setForm]=useState({title:entry?.title||"",description:entry?.description||"",project_id:entry?.project_id||projectId||null,date:entry?localDate(parseInstant(entry.due_at)):initialDate||localDate(),time:entry?localTime(entry.due_at):"09:00",offsets:entry?.reminder_offsets||[0],assignee_ids:entry?.assignee_ids||(user?[user.id]:[])});
  useEffect(()=>{if(!token||!user)return;Promise.all([api.userOptions(token,user),api.projects(token)]).then(([u,p])=>{setUsers(u);setProjects(p);}).catch(e=>setError(String(e)));},[token,user]);
  async function submit(e: FormEvent) {
    e.preventDefault(); if (!token || busy) return;
    setBusy(true); setError("");
    try {
      if (!form.assignee_ids.length) throw new Error("Выберите участников");
      // Keep the original instant when only text/people were edited: the form
      // displays minutes, while the saved value may include seconds or a repeated
      // autumn clock hour. A changed start retains the original event duration.
      const unchangedStart = saved && form.date === localDate(parseInstant(saved.due_at)) && form.time === localTime(saved.due_at);
      const dueAt = unchangedStart ? saved.due_at : toInstant(form.date, form.time);
      if (!dueAt) throw new Error("Укажите дату и точное время.");
      const payload = {
        title: form.title.trim(), description: form.description || null, project_id: form.project_id,
        ...entryTimePayload(saved, dueAt, kind),
        assignee_ids: form.assignee_ids, reminder_offsets: form.offsets,
      };
      const result = saved
        ? await api.updateEntry(token, kind, saved.id, { ...payload, expected_revision: saved.revision })
        : await api.createEntry(token, kind, payload);
      setSaved(result);
      for (const file of files) {
        await api.uploadEntityAttachment(token, kind === "events" ? "event" : "reminder", result.id, file);
        setFiles(current => current.filter(f => f !== file));
      }
      onSaved(result);
    } catch (e) { setError(String(e)); }
    finally { setBusy(false); }
  }
  return <form className="form-stack" onSubmit={submit}>{error?<div className="form-error">{error}{saved&&!entry?" Запись сохранена; повторите загрузку файлов.":""}</div>:null}<label className="field"><span>{kind==="events"?"Название события":"Что нужно сделать"}</span><input required minLength={2} maxLength={200} value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></label><label className="field"><span>Описание</span><textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label><label className="field"><span>Проект</span><select value={form.project_id||""} onChange={e=>setForm({...form,project_id:Number(e.target.value)||null})}><option value="">Студия</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label><PeoplePicker users={users} value={form.assignee_ids} onChange={assignee_ids=>setForm({...form,assignee_ids})}/><ScheduleFields required label={kind==="events"?"Начало события":"Напомнить"} date={form.date} time={form.time} offsets={form.offsets} onChange={(date,time,offsets)=>setForm({...form,date,time,offsets})}/>{entry?<EntityAttachments kind={kind==="events"?"event":"reminder"} id={entry.id}/>:null}<FilePicker files={files} onFiles={setFiles}/><div className="form-actions"><button type="button" className="button button--secondary" disabled={busy} onClick={()=>saved&&!entry?onSaved(saved):onCancel()}>Закрыть</button><button className="button button--primary" disabled={busy}>{busy?"Сохраняем":"Сохранить"}</button></div></form>;
}
