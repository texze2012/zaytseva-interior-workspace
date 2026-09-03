"use client";
import { ReactNode, useEffect } from "react";
import { Icon } from "@/components/Icon";

export function Modal({ title, subtitle, onClose, children, wide = false }: { title: string; subtitle?: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return <div className="modal-backdrop" onMouseDown={(e) => { if (e.currentTarget === e.target) onClose(); }}>
    <section className={`modal ${wide ? "modal--wide" : ""}`}>
      <header className="modal__header"><div><h2>{title}</h2>{subtitle ? <p>{subtitle}</p> : null}</div><button className="icon-button" type="button" onClick={onClose} aria-label="Закрыть"><Icon name="close"/></button></header>
      <div className="modal__body">{children}</div>
    </section>
  </div>;
}
