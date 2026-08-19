import {
  Dashboard,
  Project,
  ProjectCreatePayload,
  ProjectStage,
  Task,
  TaskComment,
  TaskCreatePayload,
  TaskStatus,
  User,
  UserOption,
} from "@/lib/types";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

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
    if (typeof data?.detail === "string") {
      return data.detail;
    }
    return JSON.stringify(data?.detail ?? data);
  } catch {
    return `Ошибка API: ${response.status}`;
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null
): Promise<T> {
  const headers = new Headers(options.headers);

  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  if (
    options.body &&
    !(options.body instanceof URLSearchParams) &&
    !(options.body instanceof FormData) &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new ApiError(response.status, await parseError(response));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function loginRequest(email: string, password: string) {
  const body = new URLSearchParams();
  body.set("username", email);
  body.set("password", password);

  return apiFetch<{ access_token: string; token_type: string }>(
    "/auth/login",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    }
  );
}

export const api = {
  me(token: string) {
    return apiFetch<User>("/users/me", {}, token);
  },

  users(token: string) {
    return apiFetch<User[]>("/users", {}, token);
  },

  async userOptions(token: string, currentUser: User) {
    try {
      return await apiFetch<UserOption[]>("/users/options", {}, token);
    } catch (error) {
      if (
        error instanceof ApiError &&
        (error.status === 403 || error.status === 404 || error.status === 422)
      ) {
        if (currentUser.role === "owner") {
          const users = await apiFetch<User[]>("/users", {}, token);
          return users.map(({ id, name, role }) => ({ id, name, role }));
        }

        return [
          {
            id: currentUser.id,
            name: currentUser.name,
            role: currentUser.role,
          },
        ];
      }
      throw error;
    }
  },

  dashboard(token: string) {
    return apiFetch<Dashboard>("/dashboard", {}, token);
  },

  projects(token: string) {
    return apiFetch<Project[]>("/projects", {}, token);
  },

  project(token: string, projectId: number) {
    return apiFetch<Project>(`/projects/${projectId}`, {}, token);
  },

  createProject(
    token: string,
    payload: ProjectCreatePayload
  ) {
    return apiFetch<Project>(
      "/projects",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      token
    );
  },

  updateProject(
    token: string,
    projectId: number,
    payload: Partial<ProjectCreatePayload>
  ) {
    return apiFetch<Project>(
      `/projects/${projectId}`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
      token
    );
  },

  stages(token: string, projectId: number) {
    return apiFetch<ProjectStage[]>(
      `/projects/${projectId}/stages`,
      {},
      token
    );
  },

  tasksByProject(token: string, projectId: number) {
    return apiFetch<Task[]>(
      `/projects/${projectId}/tasks`,
      {},
      token
    );
  },

  createTask(
    token: string,
    projectId: number,
    payload: TaskCreatePayload
  ) {
    return apiFetch<Task>(
      `/projects/${projectId}/tasks`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      token
    );
  },

  taskFeed(
    token: string,
    params: {
      projectId?: number;
      status?: TaskStatus | "all";
      mine?: boolean;
      period?: "today" | "overdue";
    } = {}
  ) {
    const query = new URLSearchParams();

    if (params.projectId) {
      query.set("project_id", String(params.projectId));
    }
    if (params.status && params.status !== "all") {
      query.set("task_status", params.status);
    }
    if (params.mine) {
      query.set("mine", "true");
    }
    if (params.period) {
      query.set("period", params.period);
    }

    const suffix = query.toString() ? `?${query.toString()}` : "";
    return apiFetch<Task[]>(`/tasks${suffix}`, {}, token);
  },

  changeTaskStatus(
    token: string,
    projectId: number,
    taskId: number,
    status: TaskStatus,
    comment?: string
  ) {
    return apiFetch<Task>(
      `/projects/${projectId}/tasks/${taskId}/status`,
      {
        method: "PATCH",
        body: JSON.stringify({
          status,
          ...(comment ? { comment } : {}),
        }),
      },
      token
    );
  },

  comments(
    token: string,
    projectId: number,
    taskId: number
  ) {
    return apiFetch<TaskComment[]>(
      `/projects/${projectId}/tasks/${taskId}/comments`,
      {},
      token
    );
  },

  addComment(
    token: string,
    projectId: number,
    taskId: number,
    text: string
  ) {
    return apiFetch<TaskComment>(
      `/projects/${projectId}/tasks/${taskId}/comments`,
      {
        method: "POST",
        body: JSON.stringify({ text }),
      },
      token
    );
  },
};
