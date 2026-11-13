"use client";
import { ProjectStage, Task } from "@/lib/types";
import { Icon } from "@/components/Icon";

export function ProjectStageStrip({stages,tasks,selected,onSelect}:{stages:ProjectStage[];tasks:Task[];selected:number|null;onSelect:(stage:ProjectStage)=>void}) {
  if(!stages.length)return null;
  return <nav className="stage-strip" aria-label="Ход проекта">{[...stages].sort((a,b)=>a.position-b.position).map((stage,index)=>{
    const linked=tasks.filter(task=>task.stage_id===stage.id);
    const completed=linked.filter(task=>task.status==="done").length;
    return <button key={stage.id} type="button" aria-pressed={selected===stage.id} onClick={()=>onSelect(stage)} className={`stage-step stage-step--${stage.status} ${selected===stage.id?"stage-step--selected":""}`}>
      <span className="stage-step__number">{stage.status==="completed"?<Icon name="check" size={16}/>:index+1}</span>
      <span><strong>{stage.name}</strong><small>{stage.status==="completed"?"Этап завершён":stage.status==="in_progress"?"В работе":"Запланирован"}{linked.length?` · ${completed}/${linked.length} задач`:""}</small></span>
      <Icon name="chevronRight" size={14}/>
    </button>;
  })}</nav>;
}
