"use client";
import { ReactNode, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/Icon";

const modalStack: HTMLElement[] = [];
let bodyOverflowBeforeModals = "";

export function Modal({ title, subtitle, onClose, children, wide = false, drawer = false }: { title: string; subtitle?: string; onClose: () => void; children: ReactNode; wide?: boolean; drawer?: boolean }) {
  const id=useId();const ref=useRef<HTMLElement>(null);const close=useRef(onClose);close.current=onClose;
  const [mounted,setMounted]=useState(false);
  const previousFocus=useRef<HTMLElement|null>(null);
  useEffect(()=>{previousFocus.current=document.activeElement as HTMLElement|null;setMounted(true);},[]);
  useEffect(() => {
    if(!mounted||!ref.current)return;
    const dialog=ref.current;
    if(!modalStack.length)bodyOverflowBeforeModals=document.body.style.overflow;
    modalStack.push(dialog);
    document.body.style.overflow="hidden";
    if(!dialog.contains(document.activeElement))dialog.focus();
    return()=>{
      const wasTop=modalStack.at(-1)===dialog;
      const index=modalStack.indexOf(dialog);
      if(index!==-1)modalStack.splice(index,1);
      if(!modalStack.length)document.body.style.overflow=bodyOverflowBeforeModals;
      if(wasTop){
        const parent=modalStack.at(-1),previous=previousFocus.current;
        if(previous?.isConnected&&(!parent||parent.contains(previous)))previous.focus();
        else parent?.focus();
      }
    };
  },[mounted]);
  useEffect(() => {
    if(!mounted)return;
    const onKey = (event: KeyboardEvent) => {
      const dialog=ref.current;
      if(!dialog||modalStack.at(-1)!==dialog)return;
      if(event.key==="Escape"){event.preventDefault();close.current();}
      if(event.key==="Tab"){
        const elements=Array.from(dialog.querySelectorAll<HTMLElement>("button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),summary,[tabindex=\"0\"]")).filter(el=>el.getClientRects().length);
        const first=elements[0],last=elements.at(-1);
        if(!first){event.preventDefault();dialog.focus();return;}
        if(event.shiftKey&&(document.activeElement===first||document.activeElement===dialog||!dialog.contains(document.activeElement))){event.preventDefault();last?.focus();}
        else if(!event.shiftKey&&(document.activeElement===last||!dialog.contains(document.activeElement))){event.preventDefault();first.focus();}
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mounted]);
  if(!mounted)return null;
  return createPortal(<div className={`modal-backdrop ${drawer ? "modal-backdrop--drawer" : ""}`} onMouseDown={(e) => { if (e.currentTarget === e.target) onClose(); }}>
    <section ref={ref} role="dialog" aria-modal="true" aria-labelledby={id} tabIndex={-1} className={`modal ${wide ? "modal--wide" : ""} ${drawer ? "modal--drawer" : ""}`}>
      <header className="modal__header"><div><h2 id={id}>{title}</h2>{subtitle ? <p>{subtitle}</p> : null}</div><button className="icon-button" type="button" onClick={onClose} aria-label="Закрыть"><Icon name="close"/></button></header>
      <div className="modal__body">{children}</div>
    </section>
  </div>,document.body);
}
