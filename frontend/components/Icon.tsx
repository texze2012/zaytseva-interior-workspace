import { ReactNode, SVGProps } from "react";

export type IconName =
  | "dashboard" | "projects" | "waiting" | "money" | "calendar" | "tasks"
  | "plus" | "chevronRight" | "chevronLeft" | "logout" | "close" | "check"
  | "clock" | "alert" | "delivery" | "agreement" | "file" | "download"
  | "trash" | "upload" | "external" | "filter" | "search" | "user" | "menu" | "bell";

const paths: Record<IconName, ReactNode> = {
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></>,
  dashboard: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
  projects: <><path d="M3 7h7l2 2h9v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/><path d="M3 7V5a2 2 0 0 1 2-2h5l2 2h4"/></>,
  waiting: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  money: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 12h10M12 9v6"/></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/></>,
  tasks: <><path d="m5 7 2 2 4-4M13 7h6M5 14l2 2 4-4M13 14h6"/></>,
  plus: <><path d="M12 5v14M5 12h14"/></>,
  chevronRight: <path d="m9 5 7 7-7 7"/>,
  chevronLeft: <path d="m15 5-7 7 7 7"/>,
  logout: <><path d="M10 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h5"/><path d="m14 8 4 4-4 4M9 12h9"/></>,
  close: <><path d="m6 6 12 12M18 6 6 18"/></>,
  check: <path d="m5 12 4 4L19 6"/>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  alert: <><path d="M12 3 2.5 20h19L12 3Z"/><path d="M12 9v5M12 17h.01"/></>,
  delivery: <><path d="M3 6h11v11H3zM14 10h4l3 3v4h-7"/><circle cx="7" cy="19" r="2"/><circle cx="18" cy="19" r="2"/></>,
  agreement: <><path d="M8 12 5 9l-3 3 5 5 5-5M16 12l3-3 3 3-5 5-5-5"/><path d="m9 9 3-3 3 3M9 15l3 3 3-3"/></>,
  file: <><path d="M6 2h8l4 4v16H6z"/><path d="M14 2v5h5"/></>,
  download: <><path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 21h14"/></>,
  trash: <><path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14"/></>,
  upload: <><path d="M12 21V9M7 14l5-5 5 5"/><path d="M5 4h14"/></>,
  external: <><path d="M14 3h7v7M10 14 21 3"/><path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"/></>,
  filter: <path d="M4 5h16l-6 7v6l-4 2v-8L4 5Z"/>,
  search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
  user: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
  menu: <><path d="M4 7h16M4 12h16M4 17h16"/></>,
};

export function Icon({ name, size = 20, ...props }: { name: IconName; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      {paths[name]}
    </svg>
  );
}
