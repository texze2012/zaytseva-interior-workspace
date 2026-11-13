"use client";
import { DragEvent, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Task, TaskStatus, UserOption, Project } from "@/lib/types";
import { TaskCard } from "@/components/TaskCard";
import { Modal } from "@/components/Modal";
import { Icon } from "@/components/Icon";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { personIds } from "@/lib/scheduling";
import { allowedTaskMoves, moveTask, undoTaskMove } from "@/lib/taskMoves";

export const taskColumns = [{value:"planned",label:"Запланировано"},{value:"in_progress",label:"В работе"},{value:"review",label:"На согласовании"},{value:"done",label:"Принято"}] as const;
const labels = Object.fromEntries(taskColumns.map(c=>[c.value,c.label])) as Record<TaskStatus,string>;
const dragType = "application/x-zaytseva-task";
type Undo = {taskId:number;title:string;token:string;previous:TaskStatus;until:number};
type Pending = {taskId:number;status:TaskStatus};

export function TaskBoard({tasks,users,onSelect,onUpdated,compact=false,projects=[]}: {tasks:Task[];users:UserOption[];onSelect:(t:Task)=>void;onUpdated?:(t:Task)=>void;compact?:boolean;projects?:Project[]}) {
  const {token,user}=useAuth();
  const [confirmed,setConfirmed]=useState<Record<number,Task>>({});
  const confirmedRef=useRef(confirmed);confirmedRef.current=confirmed;
  const tasksRef=useRef(tasks);tasksRef.current=tasks;
  const [pending,setPending]=useState<Pending|null>(null);
  const busy=useRef(false);
  const [dragging,setDragging]=useState<number|null>(null);
  const [dropColumn,setDropColumn]=useState<TaskStatus|null>(null);
  const dragEnded=useRef(0);
  const [menuTask,setMenuTask]=useState<number|null>(null);
  const [returnTask,setReturnTask]=useState<Task|null>(null);
  const [reason,setReason]=useState("");
  const [undo,setUndo]=useState<Undo|null>(null);
  const [error,setError]=useState("");
  const [uncertain,setUncertain]=useState<number|null>(null);
  const [announcement,setAnnouncement]=useState("");
  // Keep a confirmed result until the parent receives it, but never mask a newer refresh.
  const currentTasks=tasks.map(task=>confirmed[task.id] && confirmed[task.id].updated_at>task.updated_at ? confirmed[task.id] : task);
  const visibleTasks=currentTasks.map(task=>pending?.taskId===task.id ? {...task,status:pending.status} : task);
  const dragTask=currentTasks.find(t=>t.id===dragging);
  const validDrops=dragTask?allowedTaskMoves(dragTask,user):[];
  const chosen=currentTasks.find(t=>t.id===menuTask);

  useEffect(()=>{
    if(!undo)return;
    const timer=setTimeout(()=>setUndo(null),Math.max(0,undo.until-Date.now()));
    return()=>clearTimeout(timer);
  },[undo]);
  useEffect(()=>{
    if(!undo)return;
    const latest=tasks.find(t=>t.id===undo.taskId),own=confirmed[undo.taskId];
    if(latest&&own&&latest.updated_at>own.updated_at)setUndo(null);
  },[tasks,confirmed,undo]);

  function publish(task:Task) {
    const incoming=tasksRef.current.find(t=>t.id===task.id),local=confirmedRef.current[task.id];
    if((incoming&&incoming.updated_at>task.updated_at)||(local&&local.updated_at>task.updated_at))return false;
    confirmedRef.current={...confirmedRef.current,[task.id]:task};
    setConfirmed(confirmedRef.current);
    onUpdated?.(task);
    return true;
  }

  async function refreshTask(id:number) {
    if(!token)return false;
    try {
      const latest=await api.task(token,id);
      publish(latest);setUncertain(null);
      setReturnTask(previous=>previous?.id===id?latest:previous);
      return true;
    } catch { setUncertain(id);return false; }
  }

  async function performMove(task:Task,status:TaskStatus,comment?:string) {
    if(!token||busy.current||!allowedTaskMoves(task,user).includes(status))return false;
    busy.current=true;setPending({taskId:task.id,status});setError("");setUndo(null);setUncertain(null);
    try {
      const result=await moveTask(token,task,status,comment);
      if(publish(result.task))setUndo({taskId:task.id,title:task.title,token:result.undo_token,previous:task.status,until:Date.now()+10000});
      setAnnouncement(`Задача «${task.title}»: ${labels[status]}.`);
      return true;
    } catch(e) {
      const refreshed=await refreshTask(task.id);
      setError(`${e instanceof Error?e.message:"Не удалось переместить задачу."}${refreshed?"":" Статус не подтверждён. Обновите задачу после восстановления связи."}`);
      return false;
    } finally {busy.current=false;setPending(null);}
  }

  function requestMove(task:Task,status:TaskStatus) {
    setMenuTask(null);setDragging(null);setDropColumn(null);
    if(task.status==="review"&&status==="in_progress"){
      setReason("");setError("");setReturnTask(task);
    } else void performMove(task,status);
  }

  async function performUndo() {
    if(!undo||!token||busy.current)return;
    const operation=undo;
    busy.current=true;setPending({taskId:operation.taskId,status:operation.previous});setUndo(null);setError("");
    try {
      publish(await undoTaskMove(token,operation.taskId,operation.token));
      setAnnouncement("Перемещение отменено.");
    } catch(e) {
      const refreshed=await refreshTask(operation.taskId);
      setError(`${e instanceof Error?e.message:"Не удалось отменить перемещение."}${refreshed?"":" Обновите задачу после восстановления связи."}`);
    } finally {busy.current=false;setPending(null);}
  }

  function drop(event:DragEvent<HTMLElement>,status:TaskStatus) {
    if(!dragTask||!validDrops.includes(status)||busy.current)return;
    event.preventDefault();
    if(event.dataTransfer.getData(dragType)!==String(dragTask.id))return;
    requestMove(dragTask,status);
  }

  return <div className="task-board-interactive">
    <span className="task-board-live" role="status" aria-live="polite">{announcement}</span>
    {error?<div className="task-board-error" role="alert"><span>{error}</span>{uncertain?<button type="button" className="text-link" disabled={!!pending} onClick={async()=>{if(await refreshTask(uncertain))setError("");}}>Обновить задачу</button>:null}<button type="button" className="icon-button" aria-label="Скрыть сообщение" onClick={()=>setError("")}><Icon name="close" size={16}/></button></div>:null}
    <div className={`workspace-board ${compact?"workspace-board--three":""} ${dragging?"workspace-board--dragging":""}`}>
      {taskColumns.filter(c=>!compact||c.value!=="done").map(column=>{
        const valid=validDrops.includes(column.value),rows=visibleTasks.filter(t=>t.status===column.value);
        return <section className={`task-kanban__column task-kanban__column--${column.value} ${valid?"task-kanban__column--droppable":""} ${dropColumn===column.value?"task-kanban__column--drop-active":""}`} key={column.value}
          onDragOver={event=>{if(valid&&!busy.current){event.preventDefault();event.dataTransfer.dropEffect="move";setDropColumn(column.value);}}}
          onDragLeave={event=>{if(!(event.relatedTarget instanceof Node)||!event.currentTarget.contains(event.relatedTarget))setDropColumn(current=>current===column.value?null:current);}}
          onDrop={event=>drop(event,column.value)}>
          <header className="task-kanban__head"><span>{column.label}</span><strong>{rows.length}</strong></header>
          {valid?<p className="task-board-drop-hint">{column.value==="in_progress"&&dragTask?.status==="review"?"Вернуть с причиной":"Отпустите задачу здесь"}</p>:null}
          <div className="task-kanban__body">{rows.map(task=>{
            const original=currentTasks.find(t=>t.id===task.id)||task;
            const movable=allowedTaskMoves(original,user).length>0;
            return <div key={task.id} className={`task-board-item ${pending?.taskId===task.id?"task-board-item--pending":""} ${dragging===task.id?"task-board-item--dragging":""}`} aria-busy={pending?.taskId===task.id}>
              {movable?<div className="task-board-item__tools"><button type="button" className="task-move-handle" draggable={!pending} disabled={!!pending}
                aria-label={`Переместить задачу «${task.title}»`} title="Перетащить за эту кнопку или выбрать новый статус"
                onClick={()=>{if(Date.now()-dragEnded.current>200)setMenuTask(task.id);}}
                onDragStart={event=>{if(busy.current){event.preventDefault();return;}event.stopPropagation();event.dataTransfer.setData(dragType,String(task.id));event.dataTransfer.effectAllowed="move";setDragging(task.id);setAnnouncement(`Перемещение задачи «${task.title}». Доступные статусы: ${allowedTaskMoves(original,user).map(s=>labels[s]).join(", ")}.`);}}
                onDragEnd={()=>{dragEnded.current=Date.now();setDragging(null);setDropColumn(null);}}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><circle cx="5" cy="3" r="1"/><circle cx="11" cy="3" r="1"/><circle cx="5" cy="8" r="1"/><circle cx="11" cy="8" r="1"/><circle cx="5" cy="13" r="1"/><circle cx="11" cy="13" r="1"/></svg><span>Переместить</span>
              </button>{pending?.taskId===task.id?<small>Сохраняем…</small>:null}</div>:null}
              <TaskCard task={task} users={users} onUpdated={onUpdated?updated=>{publish(updated);setUndo(current=>current?.taskId===updated.id?null:current);}:undefined} projectName={task.project_id?projects.find(p=>p.id===task.project_id)?.name||`Проект #${task.project_id}`:"Общая задача"} assigneeName={personIds(task).map(id=>users.find(u=>u.id===id)?.name||`#${id}`).join(", ")} onClick={()=>{if(pending?.taskId!==task.id)onSelect(original);}}/>
            </div>;
          })}{!rows.length?<div className="task-kanban__empty">Нет задач</div>:null}</div>
        </section>;
      })}
    </div>
    {chosen?<Modal title="Переместить задачу" subtitle={chosen.title} onClose={()=>setMenuTask(null)}><div className="task-move-options">{allowedTaskMoves(chosen,user).map(status=><button key={status} type="button" className="button button--secondary" onClick={()=>requestMove(chosen,status)}>{chosen.status==="review"&&status==="in_progress"?"Вернуть в работу…":labels[status]}<Icon name="chevronRight" size={16}/></button>)}{!allowedTaskMoves(chosen,user).length?<p>Статус или права изменились. Доступных перемещений нет.</p>:null}</div></Modal>:null}
    {returnTask?<Modal title="Вернуть в работу" subtitle={returnTask.title} onClose={()=>{if(!busy.current)setReturnTask(null);}}><form onSubmit={async event=>{event.preventDefault();if(reason.trim()&&await performMove(returnTask,"in_progress",reason.trim()))setReturnTask(null);}}>
      <label className="field"><span>Что нужно доработать</span><textarea autoFocus required maxLength={5000} value={reason} disabled={!!pending} onChange={event=>setReason(event.target.value)} rows={4} placeholder="Укажите причину возврата"/></label>
      {error?<p className="form-error" role="alert">{error}</p>:null}
      <div className="button-row"><button type="submit" className="button button--primary" disabled={!!pending||!reason.trim()||!allowedTaskMoves(returnTask,user).includes("in_progress")}>{pending?"Сохраняем…":"Вернуть в работу"}</button><button type="button" className="button button--secondary" disabled={!!pending} onClick={()=>setReturnTask(null)}>Отмена</button></div>
    </form></Modal>:null}
    {undo?createPortal(<div className="task-board-undo" role="status"><span><strong>Задача перемещена</strong><small>{undo.title}</small></span><button type="button" onClick={()=>void performUndo()}>Отменить</button><button type="button" aria-label="Скрыть отмену перемещения" onClick={()=>setUndo(null)}><Icon name="close" size={16}/></button></div>,document.body):null}
  </div>;
}
