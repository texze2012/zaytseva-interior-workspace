"use client";
import {useEffect,useState} from "react";
export function Feedback(){
 const [messages,setMessages]=useState<{id:number;text:string}[]>([]);
 useEffect(()=>{let id=0;const timers:ReturnType<typeof setTimeout>[]=[];const receive=(event:Event)=>{const row={id:++id,text:(event as CustomEvent<string>).detail};setMessages(old=>[...old.slice(-2),row]);timers.push(setTimeout(()=>setMessages(old=>old.filter(m=>m.id!==row.id)),5000));};window.addEventListener("zi:saved",receive);return()=>{window.removeEventListener("zi:saved",receive);timers.forEach(clearTimeout);};},[]);
 return <div className="feedback-stack" role="status" aria-live="polite">{messages.map(m=><div className="feedback" key={m.id}><span>✓ {m.text}</span><button aria-label="Скрыть уведомление" onClick={()=>setMessages(old=>old.filter(x=>x.id!==m.id))}>×</button></div>)}</div>;
}
