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

export type ProjectType = "apartment" | "townhouse" | "house" | "apartments" | "commercial";
export type ProjectStatus = "planned" | "in_progress" | "review" | "completed" | "archived";

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
  cover_color: string;
  cover_attachment_id?: number | null;
  created_by_id: number;
  description: string | null;
  created_at: string;
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
  cover_color: string;
  cover_attachment_id?: number | null;
  description?: string | null;
}

export type ProjectStageStatus = "planned" | "in_progress" | "completed";
export interface ProjectStage {
  id: number;
  project_id: number;
  name: string;
  position: number;
  status: ProjectStageStatus;
  deadline: string | null;
  created_at: string;
}

export type TaskStatus = "planned" | "in_progress" | "review" | "done";
export type TaskPriority = "low" | "medium" | "high" | "urgent";
export interface Task {
  id: number;
  project_id: number | null;
  stage_id: number | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assignee_id: number;
  assignee_ids: number[];
  due_at?: string | null;
  reminder_offsets: number[];
  created_by_id: number;
  deadline: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskCreatePayload {
  title: string;
  description?: string | null;
  stage_id?: number | null;
  priority: TaskPriority;
  assignee_id: number;
  assignee_ids: number[];
  due_at?: string | null;
  reminder_offsets: number[];
  deadline?: string | null;
}

export interface TaskComment {
  id: number;
  task_id: number;
  author_id: number;
  text: string;
  created_at: string;
}

export type ProcurementStatus =
  | "selection"
  | "studio_review"
  | "quote_requested"
  | "quote_received"
  | "approval"
  | "approved"
  | "ordered"
  | "in_production"
  | "in_delivery"
  | "delivered"
  | "problem"
  | "completed";

export interface ProcurementItem {
  room_id: number | null;
  sourcing_type: "retail" | "custom";
  selected_variant_id: number | null;
  id: number;
  project_id: number;
  name: string;
  room: string | null;
  category: string | null;
  brand: string | null;
  article: string | null;
  product_url: string | null;
  quantity: number | string;
  unit: string;
  unit_price: number | string | null;
  total_amount: number | string | null;
  currency: string;
  supplier_name: string | null;
  status: ProcurementStatus;
  expected_delivery_date: string | null;
  notes: string | null;
  created_by_id: number;
  created_at: string;
  updated_at: string;
}

export interface ProcurementItemPayload {
  room_id?: number | null;
  sourcing_type?: "retail" | "custom";
  name: string;
  room?: string | null;
  category?: string | null;
  brand?: string | null;
  article?: string | null;
  product_url?: string | null;
  quantity: number;
  unit: string;
  unit_price?: number | null;
  currency: string;
  supplier_name?: string | null;
  status: ProcurementStatus;
  expected_delivery_date?: string | null;
  notes?: string | null;
}

export interface ProcurementCheckpoint {
  id: number;
  item_id: number;
  code: string;
  label: string;
  phase: "before_order" | "after_order" | string;
  position: number;
  is_completed: boolean;
  completed_at: string | null;
  completed_by_id: number | null;
  created_at: string;
}

export type WaitingStatus = "waiting" | "resolved" | "cancelled";
export interface WaitingItem {
  id: number;
  project_id: number;
  procurement_item_id: number | null;
  title: string;
  waiting_from: string;
  requested_at: string;
  next_reminder_date: string | null;
  due_at?: string | null;
  reminder_offsets: number[];
  assignee_ids: number[];
  status: WaitingStatus;
  is_reminder_due: boolean;
  notes: string | null;
  created_by_id: number;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WaitingItemPayload {
  title: string;
  waiting_from: string;
  procurement_item_id?: number | null;
  requested_at?: string | null;
  next_reminder_date?: string | null;
  due_at?: string | null;
  reminder_offsets?: number[];
  assignee_ids?: number[];
  notes?: string | null;
}

export interface Agreement {
  id: number;
  project_id: number;
  procurement_item_id: number | null;
  agreement_date: string;
  with_whom: string;
  decision: string;
  action: string | null;
  responsible_id: number | null;
  deadline: string | null;
  task_id: number | null;
  created_by_id: number;
  created_at: string;
  updated_at: string;
}

export interface AgreementPayload {
  procurement_item_id?: number | null;
  agreement_date?: string | null;
  with_whom: string;
  decision: string;
  action?: string | null;
  responsible_id?: number | null;
  deadline?: string | null;
}

export type PaymentKind = "client_payment" | "supplier_payment" | "bonus" | "other";
export type PaymentStatus = "pending" | "paid" | "cancelled";
export interface Payment {
  id: number;
  project_id: number;
  procurement_item_id: number | null;
  title: string;
  kind: PaymentKind;
  amount: number | string;
  currency: string;
  counterparty: string | null;
  status: PaymentStatus;
  due_date: string | null;
  paid_at: string | null;
  is_overdue: boolean;
  notes: string | null;
  created_by_id: number;
  created_at: string;
  updated_at: string;
}

export interface PaymentPayload {
  procurement_item_id?: number | null;
  title: string;
  kind: PaymentKind;
  amount: number;
  currency: string;
  counterparty?: string | null;
  due_date?: string | null;
  notes?: string | null;
}

export interface PaymentSummary {
  currency: string;
  client_expected: number | string;
  client_received: number | string;
  supplier_to_pay: number | string;
  supplier_paid: number | string;
  bonuses_received: number | string;
  overdue_count: number;
}

export interface Attachment {
  id: number;
  target_type: string;
  target_id: number;
  original_name: string;
  content_type: string;
  size_bytes: number;
  uploaded_by_id: number;
  created_at: string;
  file_url: string;
}

export interface ProcurementDashboard {
  counts: {
    problem_items: number;
    waiting: number;
    reminders_due: number;
    overdue_payments: number;
    upcoming_deliveries: number;
    today_tasks: number;
    review_tasks: number;
    recent_agreements: number;
  };
  money: PaymentSummary;
  problem_items: Array<{ project_name: string; item: ProcurementItem }>;
  reminders_due: Array<{ project_name: string; waiting_item: WaitingItem }>;
  overdue_payments: Array<{ project_name: string; payment: Payment }>;
  upcoming_deliveries: Array<{ project_name: string; item: ProcurementItem }>;
  today_tasks: Array<{ project_name: string; task: Task }>;
  review_tasks: Array<{ project_name: string; task: Task }>;
  recent_agreements: Array<{ project_name: string; agreement: Agreement }>;
}

export type CalendarEventType = "event" | "reminder" | "task" | "waiting" | "payment" | "delivery" | "project_stage" | "agreement";
export interface CalendarEvent {
  created_by_id?: number | null;
  id: string;
  event_type: CalendarEventType;
  event_date: string;
  title: string;
  subtitle: string | null;
  project_id: number | null;
  project_name: string;
  entity_id: number;
  procurement_item_id: number | null;
  status: string | null;
  priority: string | null;
  amount: number | string | null;
  currency: string | null;
  is_overdue: boolean;
  due_at?: string | null;
  assignee_ids: number[];
}

export interface CalendarResponse {
  date_from: string;
  date_to: string;
  events: CalendarEvent[];
}

export interface ScheduledEntry {
  revision: string;
  id: number; title: string; description: string | null; project_id: number | null;
  due_at: string; ends_at?: string | null; assignee_ids: number[];
  reminder_offsets: number[]; completed: boolean; created_by_id: number;
}
export type EntryPayload = Omit<ScheduledEntry, "id" | "created_by_id" | "completed" | "revision">;
export interface NotificationItem { id: number; target_type: string; target_id: number; title: string; due_at: string; read_at: string | null; }

export interface ProjectRoom {id:number;project_id:number;name:string;}
export type VariantStatus = "candidate" | "studio_review" | "shortlisted" | "rejected" | "selected";
export interface ProcurementVariant {id:number;item_id:number;title:string;product_url:string|null;brand:string|null;article:string|null;supplier_name:string|null;unit_price:number|string|null;currency:string;notes:string|null;status:VariantStatus;reviewer_note:string|null;reviewed_by_id:number|null;reviewed_at:string|null;}
export type VariantPayload = Omit<ProcurementVariant,"id"|"item_id"|"status"|"reviewer_note"|"reviewed_by_id"|"reviewed_at">;
