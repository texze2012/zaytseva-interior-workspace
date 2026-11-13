"use client";
import { ChangeEvent, InputHTMLAttributes, useEffect, useRef, useState } from "react";

// Typing 25.09 uses the current year. A native picker remains available.
export function DateInput({ value, onChange, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  const display = (v: string) => v ? v.split("-").reverse().join(".") : "";
  const [draft, setDraft] = useState(display(String(value || "")));
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => setDraft(display(String(value || ""))), [value]);
  function commit(text: string) {
    if (!text) { input.current?.setCustomValidity(""); onChange?.({target:{value:""}} as ChangeEvent<HTMLInputElement>); return; }
    const match = text.match(/^(\d{1,2})[.\/\-](\d{1,2})(?:[.\/\-](\d{4}))?$/);
    if (!match) { input.current?.setCustomValidity("Введите ДД.ММ или ДД.ММ.ГГГГ"); return; }
    const [,d,m,y] = match; const year = Number(y || new Date().getFullYear());
    const date = new Date(year, Number(m)-1, Number(d));
    if (date.getFullYear()!==year || date.getMonth()!==Number(m)-1 || date.getDate()!==Number(d)) {input.current?.setCustomValidity("Такой даты нет"); return;}
    input.current?.setCustomValidity("");
    const iso = `${year}-${m.padStart(2,"0")}-${d.padStart(2,"0")}`;
    setDraft(display(iso)); onChange?.({target:{value:iso}} as ChangeEvent<HTMLInputElement>);
  }
  return <span className="date-input"><input {...props} ref={input} type="text" inputMode="numeric" placeholder="ДД.ММ · год подставится" value={draft} onChange={e => {setDraft(e.target.value); e.target.setCustomValidity("");}} onBlur={e => commit(e.target.value)} onKeyDown={e => {if(e.key === "Enter") commit(draft);}}/><input aria-label="Выбрать дату в календаре" type="date" value={String(value || "")} onChange={e => {input.current?.setCustomValidity("");onChange?.(e);}}/></span>;
}
