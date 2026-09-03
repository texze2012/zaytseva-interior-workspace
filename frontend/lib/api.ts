import {
  Agreement,
  AgreementPayload,
  Attachment,
  CalendarResponse,
  Payment,
  PaymentKind,
  PaymentPayload,
  PaymentStatus,
  PaymentSummary,
  ProcurementCheckpoint,
  ProcurementDashboard,
  ProcurementItem,
  ProcurementItemPayload,
  Project,
  ProjectCreatePayload,
  ProjectStage,
  Task,
  TaskComment,
  TaskCreatePayload,
  TaskStatus,
  User,
  UserOption,
  WaitingItem,
  WaitingItemPayload,
  WaitingStatus,
} from "@/lib/types";

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function parseError(response: Response) {
  try {
    const data = await response.json();
    if (typeof data?.detail === "string") return data.detail;
    if (Array.isArray(data?.detail)) {
      return data.detail.map((item: { msg?: string }) => item?.msg || "Ошибка проверки данных").join("; ");
    }
    return JSON.stringify(data?.detail ?? data);
  } catch {
    return `Ошибка API: ${response.status}`;
  }
}

export async function apiFetch<T>(path: string, options: RequestInit = {}, token?: string | null): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has("Accept")) headers.set("Accept", "application/json");
  if (options.body && !(options.body instanceof URLSearchParams) && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_URL}${path}`, { ...options, headers, cache: "no-store" });
  if (!response.ok) throw new ApiError(response.status, await parseError(response));
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function loginRequest(email: string, password: string) {
  const body = new URLSearchParams();
  body.set("username", email);
  body.set("password", password);
  return apiFetch<{ access_token: string; token_type: string }>("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
}

function queryString(values: Record<string, string | number | boolean | null | undefined>) {
  const query = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") query.set(key, String(value));
  });
  const result = query.toString();
  return result ? `?${result}` : "";
}

export const api = {
  me: (token: string) => apiFetch<User>("/users/me", {}, token),
  users: (token: string) => apiFetch<User[]>("/users", {}, token),
  updateUserRole: (token: string, userId: number, role: User["role"]) => apiFetch<User>(`/users/${userId}/role`, { method: "PATCH", body: JSON.stringify({ role }) }, token),
  async userOptions(token: string, currentUser: User) {
    try {
      return await apiFetch<UserOption[]>("/users/options", {}, token);
    } catch (error) {
      if (error instanceof ApiError && [403, 404, 422].includes(error.status)) {
        if (currentUser.role === "owner") {
          const users = await apiFetch<User[]>("/users", {}, token);
          return users.map(({ id, name, role }) => ({ id, name, role }));
        }
        return [{ id: currentUser.id, name: currentUser.name, role: currentUser.role }];
      }
      throw error;
    }
  },

  procurementDashboard: (token: string) => apiFetch<ProcurementDashboard>("/dashboard/procurement", {}, token),

  projects: (token: string) => apiFetch<Project[]>("/projects", {}, token),
  project: (token: string, projectId: number) => apiFetch<Project>(`/projects/${projectId}`, {}, token),
  createProject: (token: string, payload: ProjectCreatePayload) => apiFetch<Project>("/projects", { method: "POST", body: JSON.stringify(payload) }, token),
  updateProject: (token: string, projectId: number, payload: Partial<ProjectCreatePayload>) => apiFetch<Project>(`/projects/${projectId}`, { method: "PATCH", body: JSON.stringify(payload) }, token),
  stages: (token: string, projectId: number) => apiFetch<ProjectStage[]>(`/projects/${projectId}/stages`, {}, token),

  tasksByProject: (token: string, projectId: number) => apiFetch<Task[]>(`/projects/${projectId}/tasks`, {}, token),
  taskFeed(token: string, params: { projectId?: number; status?: TaskStatus | "all"; mine?: boolean; period?: "today" | "overdue" } = {}) {
    return apiFetch<Task[]>(`/tasks${queryString({
      project_id: params.projectId,
      task_status: params.status && params.status !== "all" ? params.status : undefined,
      mine: params.mine ? true : undefined,
      period: params.period,
    })}`, {}, token);
  },
  createTask: (token: string, projectId: number, payload: TaskCreatePayload) => apiFetch<Task>(`/projects/${projectId}/tasks`, { method: "POST", body: JSON.stringify(payload) }, token),
  createStandaloneTask: (token: string, payload: TaskCreatePayload) => apiFetch<Task>("/tasks", { method: "POST", body: JSON.stringify(payload) }, token),
  changeTaskStatus: (token: string, projectId: number | null, taskId: number, status: TaskStatus, comment?: string) => apiFetch<Task>(projectId ? `/projects/${projectId}/tasks/${taskId}/status` : `/tasks/${taskId}/status`, { method: "PATCH", body: JSON.stringify({ status, ...(comment ? { comment } : {}) }) }, token),
  comments: (token: string, projectId: number | null, taskId: number) => apiFetch<TaskComment[]>(projectId ? `/projects/${projectId}/tasks/${taskId}/comments` : `/tasks/${taskId}/comments`, {}, token),
  addComment: (token: string, projectId: number | null, taskId: number, text: string) => apiFetch<TaskComment>(projectId ? `/projects/${projectId}/tasks/${taskId}/comments` : `/tasks/${taskId}/comments`, { method: "POST", body: JSON.stringify({ text }) }, token),

  procurementItems: (token: string, projectId: number) => apiFetch<ProcurementItem[]>(`/projects/${projectId}/procurement-items`, {}, token),
  createProcurementItem: (token: string, projectId: number, payload: ProcurementItemPayload) => apiFetch<ProcurementItem>(`/projects/${projectId}/procurement-items`, { method: "POST", body: JSON.stringify(payload) }, token),
  updateProcurementItem: (token: string, projectId: number, itemId: number, payload: Partial<ProcurementItemPayload>) => apiFetch<ProcurementItem>(`/projects/${projectId}/procurement-items/${itemId}`, { method: "PATCH", body: JSON.stringify(payload) }, token),
  checkpoints: (token: string, projectId: number, itemId: number) => apiFetch<ProcurementCheckpoint[]>(`/projects/${projectId}/procurement-items/${itemId}/checkpoints`, {}, token),
  setCheckpoint: (token: string, projectId: number, itemId: number, checkpointId: number, isCompleted: boolean) => apiFetch<ProcurementCheckpoint>(`/projects/${projectId}/procurement-items/${itemId}/checkpoints/${checkpointId}`, { method: "PATCH", body: JSON.stringify({ is_completed: isCompleted }) }, token),

  waitingByProject: (token: string, projectId: number) => apiFetch<WaitingItem[]>(`/projects/${projectId}/waiting-items`, {}, token),
  waitingFeed: (token: string, params: { projectId?: number; status?: WaitingStatus; reminderDue?: boolean } = {}) => apiFetch<WaitingItem[]>(`/waiting-items${queryString({ project_id: params.projectId, waiting_status: params.status, reminder_due: params.reminderDue ? true : undefined })}`, {}, token),
  createWaiting: (token: string, projectId: number, payload: WaitingItemPayload) => apiFetch<WaitingItem>(`/projects/${projectId}/waiting-items`, { method: "POST", body: JSON.stringify(payload) }, token),
  updateWaiting: (token: string, id: number, payload: Partial<WaitingItemPayload>) => apiFetch<WaitingItem>(`/waiting-items/${id}`, { method: "PATCH", body: JSON.stringify(payload) }, token),
  changeWaitingStatus: (token: string, id: number, status: WaitingStatus) => apiFetch<WaitingItem>(`/waiting-items/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }, token),

  agreementsByProject: (token: string, projectId: number) => apiFetch<Agreement[]>(`/projects/${projectId}/agreements`, {}, token),
  agreementFeed: (token: string, params: { projectId?: number; mine?: boolean } = {}) => apiFetch<Agreement[]>(`/agreements${queryString({ project_id: params.projectId, mine: params.mine ? true : undefined })}`, {}, token),
  createAgreement: (token: string, projectId: number, payload: AgreementPayload) => apiFetch<Agreement>(`/projects/${projectId}/agreements`, { method: "POST", body: JSON.stringify(payload) }, token),
  updateAgreement: (token: string, id: number, payload: Partial<AgreementPayload>) => apiFetch<Agreement>(`/agreements/${id}`, { method: "PATCH", body: JSON.stringify(payload) }, token),

  paymentsByProject: (token: string, projectId: number) => apiFetch<Payment[]>(`/projects/${projectId}/payments`, {}, token),
  paymentFeed: (token: string, params: { projectId?: number; kind?: PaymentKind; status?: PaymentStatus; overdue?: boolean; dueFrom?: string; dueTo?: string; currency?: string } = {}) => apiFetch<Payment[]>(`/payments${queryString({ project_id: params.projectId, payment_kind: params.kind, payment_status: params.status, overdue: params.overdue ? true : undefined, due_from: params.dueFrom, due_to: params.dueTo, currency: params.currency })}`, {}, token),
  paymentSummary: (token: string, params: { projectId?: number; currency?: string } = {}) => apiFetch<PaymentSummary>(`/payments/summary${queryString({ project_id: params.projectId, currency: params.currency || "RUB" })}`, {}, token),
  createPayment: (token: string, projectId: number, payload: PaymentPayload) => apiFetch<Payment>(`/projects/${projectId}/payments`, { method: "POST", body: JSON.stringify(payload) }, token),
  updatePayment: (token: string, id: number, payload: Partial<PaymentPayload>) => apiFetch<Payment>(`/payments/${id}`, { method: "PATCH", body: JSON.stringify(payload) }, token),
  changePaymentStatus: (token: string, id: number, status: PaymentStatus, paidAt?: string) => apiFetch<Payment>(`/payments/${id}/status`, { method: "PATCH", body: JSON.stringify({ status, ...(paidAt ? { paid_at: paidAt } : {}) }) }, token),

  calendar: (token: string, dateFrom: string, dateTo: string, includeCompleted = false) => apiFetch<CalendarResponse>(`/calendar${queryString({ date_from: dateFrom, date_to: dateTo, include_completed: includeCompleted })}`, {}, token),

  commentAttachments: (token: string, projectId: number | null, taskId: number, commentId: number) => apiFetch<Attachment[]>(projectId ? `/projects/${projectId}/tasks/${taskId}/comments/${commentId}/attachments` : `/tasks/${taskId}/comments/${commentId}/attachments`, {}, token),
  uploadCommentAttachment(token: string, projectId: number | null, taskId: number, commentId: number, file: File) {
    const form = new FormData();
    form.append("file", file);
    return apiFetch<Attachment>(projectId ? `/projects/${projectId}/tasks/${taskId}/comments/${commentId}/attachments` : `/tasks/${taskId}/comments/${commentId}/attachments`, { method: "POST", body: form }, token);
  },
  procurementAttachments: (token: string, projectId: number, itemId: number) => apiFetch<Attachment[]>(`/projects/${projectId}/procurement-items/${itemId}/attachments`, {}, token),
  uploadProcurementAttachment(token: string, projectId: number, itemId: number, file: File) {
    const form = new FormData();
    form.append("file", file);
    return apiFetch<Attachment>(`/projects/${projectId}/procurement-items/${itemId}/attachments`, { method: "POST", body: form }, token);
  },
  deleteAttachment: (token: string, attachmentId: number) => apiFetch<void>(`/attachments/${attachmentId}`, { method: "DELETE" }, token),
  async downloadAttachment(token: string, attachment: Attachment) {
    const response = await fetch(`${API_URL}${attachment.file_url}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) throw new ApiError(response.status, await parseError(response));
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = attachment.original_name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  },
  async openAttachment(token: string, attachment: Attachment) {
    const response = await fetch(`${API_URL}${attachment.file_url}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) throw new ApiError(response.status, await parseError(response));
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener,noreferrer");
    window.setTimeout(() => URL.revokeObjectURL(url), 60000);
  },
};
