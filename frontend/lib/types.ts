export type UserRole = "owner" | "designer";

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  created_at: string;
}

export interface UserOption {
  id: number;
  name: string;
  role: UserRole;
}

export type ProjectType =
  | "apartment"
  | "house"
  | "apartments"
  | "commercial";

export type ProjectStatus =
  | "planned"
  | "in_progress"
  | "review"
  | "completed"
  | "archived";

export interface Project {
  id: number;
  name: string;
  object_type: ProjectType;
  area: number;
  city: string | null;
  address: string | null;
  client_name: string;
  status: ProjectStatus;
  start_date: string | null;
  deadline: string | null;
  responsible_id: number;
  created_by_id: number;
  description: string | null;
  created_at: string;
}

export type ProjectStageStatus =
  | "planned"
  | "in_progress"
  | "completed";

export interface ProjectStage {
  id: number;
  project_id: number;
  name: string;
  position: number;
  status: ProjectStageStatus;
  deadline: string | null;
  created_at: string;
}

export type TaskStatus =
  | "planned"
  | "in_progress"
  | "review"
  | "done";

export type TaskPriority =
  | "low"
  | "medium"
  | "high"
  | "urgent";

export interface Task {
  id: number;
  project_id: number;
  stage_id: number | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assignee_id: number;
  created_by_id: number;
  deadline: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskComment {
  id: number;
  task_id: number;
  author_id: number;
  text: string;
  created_at: string;
}

export interface Dashboard {
  counts: {
    today: number;
    overdue: number;
    in_progress: number;
    review: number;
  };
  today: Task[];
  overdue: Task[];
  in_progress: Task[];
  review: Task[];
}

export interface ProjectCreatePayload {
  name: string;
  object_type: ProjectType;
  area: number;
  city?: string | null;
  address?: string | null;
  client_name: string;
  status: ProjectStatus;
  start_date?: string | null;
  deadline?: string | null;
  responsible_id: number;
  description?: string | null;
}

export interface TaskCreatePayload {
  title: string;
  description?: string | null;
  stage_id?: number | null;
  priority: TaskPriority;
  assignee_id: number;
  deadline?: string | null;
}
