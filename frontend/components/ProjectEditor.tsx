"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Project, ProjectCreatePayload, ProjectStatus, ProjectType } from "@/lib/types";
import { DateInput } from "@/components/DateInput";
import { FilePicker } from "@/components/FilePicker";

export function ProjectForm({project,onSaved,onCancel}: {project?:Project;onSaved?:(p:Project)=>void;onCancel?:()=>void}) {
  const {token}=useAuth();const router=useRouter();const [saving,setSaving]=useState(false);const [saved,setSaved]=useState(project);const [error,setError]=useState("");const [files,setFiles]=useState<File[]>([]);const [cover,setCover]=useState<File[]>([]);
  const [form,setForm]=useState({name:project?.name||"",object_type:project?.object_type||"apartment" as ProjectType,area:String(project?.area||""),city:project?.city||"",address:project?.address||"",client_name:project?.client_name||"",status:project?.status||"in_progress" as ProjectStatus,start_date:project?.start_date||"",deadline:project?.deadline||"",description:project?.description||"",cover_color:project?.cover_color||"#c8b8a6"});
  async function submit(e:FormEvent){e.preventDefault();if(!token)return;setSaving(true);setError("");try{
    const payload:ProjectCreatePayload={...form,area:Number(form.area),start_date:form.start_date||null,deadline:form.deadline||null};
    let p=saved?await api.updateProject(token,saved.id,payload):await api.createProject(token,payload);setSaved(p);
    if(cover[0]){const a=await api.uploadEntityAttachment(token,"project",p.id,cover[0]);p=await api.updateProject(token,p.id,{cover_attachment_id:a.id});setSaved(p);setCover([]);}
    for(const file of files){await api.uploadEntityAttachment(token,"project",p.id,file);setFiles(current=>current.filter(f=>f!==file));}
    if(onSaved)onSaved(p);else router.push(`/projects/${p.id}`);
  }catch(e){setError(String(e));}finally{setSaving(false);}}
  return <form className="form-stack" onSubmit={submit}>{error?<div className="form-error">{error}{saved&&!project?" Проект сохранён; можно повторить загрузку файлов.":""}</div>:null}<div className="form-grid form-grid--2">
    <label className="field field--wide"><span>Название проекта</span><input required minLength={2} maxLength={150} value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label>
    <label className="field"><span>Тип объекта</span><select value={form.object_type} onChange={e=>setForm({...form,object_type:e.target.value as ProjectType})}><option value="apartment">Квартира</option><option value="house">Дом</option><option value="townhouse">Таунхаус</option><option value="apartments">Апартаменты</option><option value="commercial">Коммерческий объект</option></select></label>
    <label className="field"><span>Площадь, м²</span><input required min="0.01" max="10000" step="0.01" type="number" value={form.area} onChange={e=>setForm({...form,area:e.target.value})}/></label>
    {([["client_name","Клиент"],["city","Город"],["address","Адрес"]] as const).map(([key,label])=><label className="field" key={key}><span>{label}</span><input required={key==="client_name"} minLength={key==="client_name"?2:undefined} value={form[key]} onChange={e=>setForm({...form,[key]:e.target.value})}/></label>)}
    <label className="field"><span>Общий статус проекта</span><select value={form.status} onChange={e=>setForm({...form,status:e.target.value as ProjectStatus})}><option value="planned">Запланирован</option><option value="in_progress">В работе</option>{form.status==="review"?<option value="review">На проверке (ранее)</option>:null}<option value="completed">Завершён</option><option value="archived">Архив</option></select><small>Текущие стадии работы отмечаются в этапах проекта.</small></label>
    <label className="field"><span>Дата начала</span><DateInput value={form.start_date} onChange={e=>setForm({...form,start_date:e.target.value})}/></label><label className="field"><span>Дедлайн</span><DateInput value={form.deadline} onChange={e=>setForm({...form,deadline:e.target.value})}/></label>
    <label className="field field--wide"><span>Описание</span><textarea rows={3} value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label>
    <label className="field"><span>Цвет обложки</span><input type="color" value={form.cover_color} onChange={e=>setForm({...form,cover_color:e.target.value})}/></label>
    <label className="field"><span>Фото обложки</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setCover(e.target.files?Array.from(e.target.files).slice(0,1):[])}/></label>
  </div><FilePicker files={files} onFiles={setFiles}/><div className="form-actions"><button type="button" className="button button--secondary" disabled={saving} onClick={()=>onCancel?onCancel():saved?router.push(`/projects/${saved.id}`):router.back()}>Закрыть</button><button className="button button--primary" disabled={saving}>{saving?"Сохраняем":project||saved?"Сохранить изменения":"Создать проект"}</button></div></form>;
}
