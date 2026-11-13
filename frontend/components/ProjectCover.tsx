"use client";
import { useEffect, useState } from "react";
import { API_URL } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Project } from "@/lib/types";

export function ProjectCover({project, variant="card"}: {project:Project;variant?:"card"|"hero"}) {
  const {token}=useAuth(); const [url,setUrl]=useState("");
  useEffect(()=>{setUrl("");if(!token||!project.cover_attachment_id)return;const controller=new AbortController();let blobUrl="";
    fetch(`${API_URL}/attachments/${project.cover_attachment_id}/file`,{headers:{Authorization:`Bearer ${token}`},signal:controller.signal}).then(async r=>{if(!r.ok)throw new Error("Обложка недоступна");return r.blob();}).then(blob=>{if(!controller.signal.aborted){blobUrl=URL.createObjectURL(blob);setUrl(blobUrl);}}).catch(()=>{});
    return()=>{controller.abort();if(blobUrl)URL.revokeObjectURL(blobUrl);};
  },[project.cover_attachment_id,token]);
  return <div className={`project-cover project-cover--${variant} ${url?"project-cover--image":"project-cover--color"}`} style={{backgroundColor:project.cover_color||"#c8b8a6"}}>
    {url ? <img src={url} alt={`Обложка проекта ${project.name}`} loading={variant==="hero"?"eager":"lazy"} decoding="async" onError={()=>setUrl("")}/> : <div className="project-cover__composition" aria-hidden="true">
      <span className="project-cover__plane project-cover__plane--back"/>
      <span className="project-cover__plane project-cover__plane--front"/>
      <span className="project-cover__initial">{project.name.slice(0,1)}</span>
      <span className="project-cover__caption">Цвет проекта</span>
    </div>}
  </div>;
}
