import { ReactNode } from "react";
export function PageHeader({ eyebrow, title, subtitle, actions }: { eyebrow?: string; title: string; subtitle?: string; actions?: ReactNode }) {
  return <header className="page-header"><div>{eyebrow ? <div className="eyebrow">{eyebrow}</div> : null}<h1>{title}</h1>{subtitle ? <p>{subtitle}</p> : null}</div>{actions ? <div className="page-header__actions">{actions}</div> : null}</header>;
}
