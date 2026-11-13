"use client";
import {useState,useEffect,FormEvent} from "react";
import {DateInput} from "@/components/DateInput";
import {Icon} from "@/components/Icon";
import {api,ApiError} from "@/lib/api";
import {useAuth} from "@/lib/auth";
import {personIds,localTime,toInstant} from "@/lib/scheduling";
import {formatDate,taskPriorityLabels} from "@/lib/format";
import {Task,UserOption,TaskStatus,TaskCreatePayload} from "@/lib/types";
type Field="deadline"|"people"|"priority";
export function TaskQuickActions({task,users,onUpdated,showWorkflow=true}:{task:Task;users:UserOption[];onUpdated:(task:Task)=>void;showWorkflow?:boolean}){
 const {token,user}=useAuth();
 const [field,setField]=useState<Field|null>(null);
 const [date,setDate]=useState(task.deadline||"");const [time,setTime]=useState(localTime(task.due_at));
 const [ids,setIds]=useState(personIds(task));const [priority,setPriority]=useState(task.priority);
 const [busy,setBusy]=useState(false);const [error,setError]=useState("");const [feedback,setFeedback]=useState("");
 useEffect(()=>{setDate(task.deadline||"");setTime(localTime(task.due_at));setIds(personIds(task));setPriority(task.priority);},[task]);
 const assigned=!!user&&personIds(task).includes(user.id);const canEdit=user?.role==="owner"||assigned||user?.id===task.created_by_id;
 const next:TaskStatus|null=task.status==="planned"?"in_progress":task.status==="in_progress"?"review":task.status==="review"&&user?.role==="owner"?"done":null;
 function open(value:Field){setField(field===value?null:value);setError("");setFeedback("");setDate(task.deadline||"");setTime(localTime(task.due_at));setIds(personIds(task));setPriority(task.priority);}
 async function change(){if(!token||!next||busy)return;setBusy(true);setError("");setFeedback("Сохраняем…");try{onUpdated(await api.changeTaskStatus(token,task.project_id,task.id,next));setFeedback("Статус сохранён");}catch(e){setFeedback("");setError(e instanceof Error?e.message:"Не удалось изменить статус");}finally{setBusy(false);}}
 async function save(e:FormEvent){
   e.preventDefault();if(!token||busy||!field)return;
   if(field==="people"&&!ids.length){setError("Выберите хотя бы одного исполнителя");return;}
   if(field==="deadline"&&time&&!date){setError("Для времени укажите дату");return;}
   const payload:Partial<TaskCreatePayload>=field==="priority"?{priority}:field==="people"?{assignee_ids:ids}:{deadline:date||null,due_at:toInstant(date,time)};
   setBusy(true);setError("");setFeedback("Сохраняем…");
   try{onUpdated(await api.updateTask(token,task.id,{...payload,expected_updated_at:task.updated_at}));setField(null);setFeedback("Изменения сохранены");}
   catch(e){setFeedback("");if(e instanceof ApiError&&e.status===409){try{onUpdated(await api.task(token,task.id));}catch{ /* The original conflict remains visible. */ }}setError(e instanceof Error?e.message:"Не удалось сохранить изменения");}
   finally{setBusy(false);}
 }
 if(!canEdit)return null;
 const names=personIds(task).map(id=>users.find(u=>u.id===id)?.name||`Участник ${id}`).join(", ");
 return <div className="task-inline">
   <div className="task-inline__controls">
     <button type="button" disabled={busy} aria-label="Изменить срок" aria-expanded={field==="deadline"} onClick={()=>open("deadline")}><Icon name="calendar" size={14}/>{task.deadline?formatDate(task.deadline):"Срок"}{localTime(task.due_at)?` · ${localTime(task.due_at)}`:""}</button>
     <button type="button" disabled={busy} aria-label="Изменить исполнителей" aria-expanded={field==="people"} onClick={()=>open("people")} title={names}><Icon name="user" size={14}/><span>{names||"Исполнители"}</span></button>
     <button type="button" disabled={busy} aria-label="Изменить приоритет" aria-expanded={field==="priority"} onClick={()=>open("priority")}>{taskPriorityLabels[task.priority]}</button>
   </div>
   {field?<form className="task-inline__editor" onSubmit={save} onKeyDown={e=>{if(e.key==="Escape"){e.preventDefault();e.stopPropagation();if(!busy)setField(null);}}}>
     {field==="deadline"?<div className="task-inline__dates"><label className="field"><span>Дата</span><DateInput value={date} disabled={busy} onChange={e=>setDate(e.target.value)}/></label><label className="field"><span>Время</span><input type="time" value={time} disabled={busy} onChange={e=>setTime(e.target.value)}/></label></div>:null}
     {field==="people"?<fieldset className="quick-people"><legend>Исполнители</legend>{users.map(u=><label key={u.id}><input type="checkbox" disabled={busy} checked={ids.includes(u.id)} onChange={e=>setIds(old=>e.target.checked?[...old,u.id]:old.filter(id=>id!==u.id))}/>{u.name}</label>)}</fieldset>:null}
     {field==="priority"?<label className="field"><span>Приоритет</span><select value={priority} disabled={busy} onChange={e=>setPriority(e.target.value as Task["priority"])}>{Object.entries(taskPriorityLabels).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>:null}
     {field==="deadline"&&task.reminder_offsets.length&&(!date||!time)?<p className="muted">Без точного времени напоминания будут отключены.</p>:null}
     <div className="button-row"><button className="button button--primary button--small" disabled={busy}>{busy?"Сохраняем…":"Сохранить"}</button><button type="button" className="button button--ghost button--small" disabled={busy} onClick={()=>setField(null)}>Отмена</button></div>
   </form>:null}
   {error?<p className="form-error" role="alert">{error}</p>:null}
   <span className="task-inline__feedback" role="status">{feedback}</span>
   {showWorkflow&&next&&(user?.role==="owner"||assigned)?<button type="button" className="task-inline__next" disabled={busy} onClick={change}>{next==="in_progress"?"Взять в работу":next==="review"?"На согласование":"Принять задачу"}<Icon name="chevronRight" size={14}/></button>:null}
 </div>;
}
