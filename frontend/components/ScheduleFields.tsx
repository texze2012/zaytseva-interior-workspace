"use client";
import { DateInput } from "@/components/DateInput";
import { UserOption } from "@/lib/types";

export function PeoplePicker({users, value, onChange}: {users: UserOption[]; value: number[]; onChange: (ids:number[])=>void}) {
  return <fieldset className="people-picker"><legend>Исполнители / участники</legend>{users.map(u => <label key={u.id}><input type="checkbox" checked={value.includes(u.id)} onChange={e => onChange(e.target.checked ? [...value,u.id] : value.filter(id=>id!==u.id))}/>{u.name}</label>)}{!value.length ? <small>Выберите хотя бы одного человека</small> : null}</fieldset>;
}
export function ScheduleFields({date,time,offsets,onChange,required=false,label="Дедлайн"}: {date:string;time:string;offsets:number[];onChange:(date:string,time:string,offsets:number[])=>void;required?:boolean;label?:string}) {
  return <div className="schedule-fields"><div className="form-grid form-grid--2"><label className="field"><span>{label}</span><DateInput required={required || Boolean(time) || offsets.length>0} value={date} onChange={e=>onChange(e.target.value,time,offsets)}/></label><label className="field"><span>Точное время</span><input type="time" required={required || offsets.length>0} value={time} onChange={e=>onChange(date,e.target.value,offsets)}/></label></div><fieldset className="people-picker"><legend>Уведомления</legend>{[[1440,"За день"],[120,"За 2 часа"],[60,"За час"],[0,"В указанное время"]].map(([offset,label])=><label key={offset}><input type="checkbox" checked={offsets.includes(Number(offset))} onChange={e=>onChange(date,time,e.target.checked?[...offsets,Number(offset)]:offsets.filter(x=>x!==offset))}/>{label}</label>)}</fieldset><small className="muted">Время: {Intl.DateTimeFormat().resolvedOptions().timeZone}. Уведомления сохраняются в рабочем пространстве.</small></div>;
}
export function PeopleFilter({users,value,onChange}: {users:UserOption[];value:string;onChange:(v:string)=>void}) {
  return <div className="people-filter" aria-label="Фильтр по исполнителю">{[{id:"all",name:"Все"},{id:"mine",name:"Мои"},...users.map(u=>({id:String(u.id),name:u.name}))].map(u=><button type="button" className={value===u.id?"active":""} key={u.id} onClick={()=>onChange(u.id)}>{u.name}</button>)}</div>;
}
