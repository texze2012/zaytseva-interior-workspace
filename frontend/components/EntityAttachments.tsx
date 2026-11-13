"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Attachment } from "@/lib/types";
import { AttachmentList } from "@/components/AttachmentList";
import { FilePicker } from "@/components/FilePicker";

export function EntityAttachments({kind,id,onAttachments}: {kind:string;id:number;onAttachments?:(a:Attachment[])=>void}) {
  const {token}=useAuth();const [items,setItems]=useState<Attachment[]>([]);const [files,setFiles]=useState<File[]>([]);const [error,setError]=useState("");const [busy,setBusy]=useState(false);
  const load=useCallback(async()=>{if(!token)return;try{const a=await api.entityAttachments(token,kind,id);setItems(a);onAttachments?.(a);}catch(e){setError(String(e));}},[token,kind,id,onAttachments]);
  useEffect(()=>{load();},[load]);
  async function upload(){if(!token)return;setBusy(true);setError("");try{for(const file of files){await api.uploadEntityAttachment(token,kind,id,file);setFiles(current=>current.filter(f=>f!==file));}await load();}catch(e){setError(String(e));await load();}finally{setBusy(false);}}
  return <section className="form-stack"><h3>Фото и файлы</h3>{error?<div className="form-error">{error}</div>:null}<AttachmentList attachments={items} onDeleted={()=>load()}/><FilePicker files={files} onFiles={setFiles}/>{files.length?<button type="button" className="button button--secondary" disabled={busy} onClick={upload}>{busy?"Загружаем":"Прикрепить файлы"}</button>:null}</section>;
}
