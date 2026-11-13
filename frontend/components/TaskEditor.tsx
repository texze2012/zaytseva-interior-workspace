"use client";
import { FormEvent, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { localTime, personIds, toInstant } from "@/lib/scheduling";
import { Project, ProjectStage, Task, TaskPriority, UserOption } from "@/lib/types";
import { PeoplePicker, ScheduleFields } from "@/components/ScheduleFields";
import { FilePicker } from "@/components/FilePicker";

export function NewTaskForm({projectId,stages:initialStages,projects:initialProjects,onCreated,onCancel,initialTask,initialDate="",initialStageId}: {projectId?:number|null;stages?:ProjectStage[];projects?:Project[];onCreated:(task:Task)=>void;onCancel:()=>void;initialTask?:Task;initialDate?:string;initialStageId?:number|null}) {
  const {token,user}=useAuth();const [users,setUsers]=useState<UserOption[]>([]);const [projects,setProjects]=useState<Project[]>(initialProjects||[]);const [stages,setStages]=useState<ProjectStage[]>(initialStages||[]);
  const [form,setForm]=useState({title:initialTask?.title||"",description:initialTask?.description||"",project_id:String(initialTask?.project_id||projectId||""),stage_id:String(initialTask?.stage_id||initialStageId||""),priority:initialTask?.priority||"medium" as TaskPriority,assignee_ids:initialTask?personIds(initialTask):user?[user.id]:[],deadline:initialTask?.deadline||initialDate,time:localTime(initialTask?.due_at),offsets:initialTask?.reminder_offsets||[]});
  const [files,setFiles]=useState<File[]>([]);const [saved,setSaved]=useState<Task|undefined>(initialTask);const [saving,setSaving]=useState(false);const [error,setError]=useState("");
  const fixedProject=projectId!=null||Boolean(initialTask);
  useEffect(()=>{if(!token||!user)return;Promise.all([api.userOptions(token,user),initialProjects?Promise.resolve(initialProjects):api.projects(token)]).then(([u,p])=>{setUsers(u);setProjects(p);}).catch(e=>setError(String(e)));},[token,user,initialProjects]);
  useEffect(()=>{if(!token)return;if(!form.project_id){setStages([]);return;}let active=true;api.stages(token,Number(form.project_id)).then(s=>{if(active)setStages(s);}).catch(e=>{if(active)setError(String(e));});return()=>{active=false;};},[token,form.project_id]);
  async function submit(e:FormEvent){e.preventDefault();if(!token)return;setSaving(true);setError("");try{
    if(!form.assignee_ids.length)throw new Error("Выберите исполнителей");
    const payload={title:form.title.trim(),description:form.description.trim()||null,stage_id:form.stage_id?Number(form.stage_id):null,priority:form.priority,assignee_id:form.assignee_ids[0],assignee_ids:form.assignee_ids,deadline:form.deadline||null,due_at:toInstant(form.deadline,form.time),reminder_offsets:form.offsets};
    const task=saved?await api.updateTask(token,saved.id,{...payload,expected_updated_at:saved.updated_at}):form.project_id?await api.createTask(token,Number(form.project_id),payload):await api.createStandaloneTask(token,payload);
    setSaved(task);
    for(const file of files){await api.uploadEntityAttachment(token,"task",task.id,file);setFiles(current=>current.filter(f=>f!==file));}
    onCreated(task);
  }catch(e){setError(e instanceof Error?e.message:"Ошибка сохранения");}finally{setSaving(false);}}
  return <form className="form-stack" onSubmit={submit}>{error?<div className="form-error">{error}{saved&&!initialTask?" Задача уже сохранена. Повторное сохранение продолжит загрузку файлов без создания копии.":""}</div>:null}
    <label className="field"><span>Название</span><input required minLength={2} maxLength={200} value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></label>
    <label className="field"><span>Описание</span><textarea rows={3} value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label>
    {!fixedProject?<label className="field"><span>Проект</span><select disabled={Boolean(saved)} value={form.project_id} onChange={e=>setForm({...form,project_id:e.target.value,stage_id:""})}><option value="">Общая задача студии</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>:null}
    {form.project_id?<label className="field"><span>Этап</span><select value={form.stage_id} onChange={e=>setForm({...form,stage_id:e.target.value})}><option value="">Без этапа</option>{stages.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>:null}
    <PeoplePicker users={users} value={form.assignee_ids} onChange={ids=>setForm({...form,assignee_ids:ids})}/>
    <label className="field"><span>Приоритет</span><select value={form.priority} onChange={e=>setForm({...form,priority:e.target.value as TaskPriority})}><option value="low">Низкий</option><option value="medium">Средний</option><option value="high">Высокий</option><option value="urgent">Срочный</option></select></label>
    <ScheduleFields date={form.deadline} time={form.time} offsets={form.offsets} onChange={(deadline,time,offsets)=>setForm({...form,deadline,time,offsets})}/>
    <FilePicker files={files} onFiles={setFiles}/>
    <div className="form-actions"><button type="button" className="button button--secondary" disabled={saving} onClick={()=>saved&&!initialTask?onCreated(saved):onCancel()}>{saved&&!initialTask?"Закрыть сохранённую задачу":"Отмена"}</button><button className="button button--primary" disabled={saving}>{saving?"Сохраняем":initialTask||saved?"Сохранить изменения":"Создать задачу"}</button></div>
  </form>;
}
