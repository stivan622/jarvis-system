import { Workspace, Project, Task, ScheduleEvent, GoogleCalendarAccount, GoogleCalendarCalendar, GoogleCalendarEvent } from "@/lib/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

// ----- Key conversion helpers -----

function toCamel(s: string): string {
  return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

function toSnake(s: string): string {
  return s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}

function camelizeKeys(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(camelizeKeys);
  if (obj !== null && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([k, v]) => [
        toCamel(k),
        camelizeKeys(v),
      ])
    );
  }
  return obj;
}

function snakeizeKeys(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(snakeizeKeys);
  if (obj !== null && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([k, v]) => [
        toSnake(k),
        snakeizeKeys(v),
      ])
    );
  }
  return obj;
}

// Rails returns integer IDs; normalise to string for the frontend
function normalizeIds(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(normalizeIds);
  if (obj !== null && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([k, v]) => {
        if (k === "id" || k.endsWith("Id")) {
          return [k, v != null ? String(v) : v];
        }
        return [k, normalizeIds(v)];
      })
    );
  }
  return obj;
}

// ----- Core request wrapper -----

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(options.headers ?? {}),
    },
  });

  if (res.status === 204) return undefined as T;

  const json = await res.json();

  if (!res.ok) {
    const msg =
      (json as { errors?: string[]; error?: string }).errors?.join(", ") ??
      (json as { error?: string }).error ??
      res.statusText;
    throw new ApiError(res.status, msg);
  }

  return normalizeIds(camelizeKeys(json)) as T;
}

function body(data: Record<string, unknown>, rootKey: string): RequestInit {
  return {
    body: JSON.stringify({ [rootKey]: snakeizeKeys(data) }),
  };
}

// ----- Workspaces -----

export const workspacesApi = {
  list(): Promise<Workspace[]> {
    return request<Workspace[]>("/api/v1/workspaces");
  },
  create(data: Pick<Workspace, "name">): Promise<Workspace> {
    return request<Workspace>("/api/v1/workspaces", {
      method: "POST",
      ...body(data as Record<string, unknown>, "workspace"),
    });
  },
  update(id: string, data: Pick<Workspace, "name">): Promise<Workspace> {
    return request<Workspace>(`/api/v1/workspaces/${id}`, {
      method: "PATCH",
      ...body(data as Record<string, unknown>, "workspace"),
    });
  },
  delete(id: string): Promise<void> {
    return request<void>(`/api/v1/workspaces/${id}`, { method: "DELETE" });
  },
  reorder(ids: string[]): Promise<void> {
    return request<void>("/api/v1/workspaces/reorder", {
      method: "POST",
      body: JSON.stringify({ ids }),
    });
  },
};

// ----- Projects -----

export const projectsApi = {
  list(workspaceId?: string): Promise<Project[]> {
    const qs = workspaceId ? `?workspace_id=${workspaceId}` : "";
    return request<Project[]>(`/api/v1/projects${qs}`);
  },
  create(data: Pick<Project, "workspaceId" | "name">): Promise<Project> {
    return request<Project>("/api/v1/projects", {
      method: "POST",
      ...body(data as unknown as Record<string, unknown>, "project"),
    });
  },
  update(id: string, data: Pick<Project, "name">): Promise<Project> {
    return request<Project>(`/api/v1/projects/${id}`, {
      method: "PATCH",
      ...body(data as Record<string, unknown>, "project"),
    });
  },
  delete(id: string): Promise<void> {
    return request<void>(`/api/v1/projects/${id}`, { method: "DELETE" });
  },
  reorder(ids: string[]): Promise<void> {
    return request<void>("/api/v1/projects/reorder", {
      method: "POST",
      body: JSON.stringify({ ids }),
    });
  },
};

// ----- Tasks -----

export const tasksApi = {
  list(params?: { projectId?: string; thisWeek?: boolean }): Promise<Task[]> {
    const qs = new URLSearchParams();
    if (params?.projectId) qs.set("project_id", params.projectId);
    if (params?.thisWeek) qs.set("this_week", "true");
    const q = qs.toString();
    return request<Task[]>(`/api/v1/tasks${q ? `?${q}` : ""}`);
  },
  create(data: Pick<Task, "projectId" | "title">): Promise<Task> {
    return request<Task>("/api/v1/tasks", {
      method: "POST",
      ...body(data as unknown as Record<string, unknown>, "task"),
    });
  },
  update(
    id: string,
    data: Partial<Pick<Task, "title" | "done" | "thisWeek">>
  ): Promise<Task> {
    return request<Task>(`/api/v1/tasks/${id}`, {
      method: "PATCH",
      ...body(data as unknown as Record<string, unknown>, "task"),
    });
  },
  delete(id: string): Promise<void> {
    return request<void>(`/api/v1/tasks/${id}`, { method: "DELETE" });
  },
  reorder(ids: string[]): Promise<void> {
    return request<void>("/api/v1/tasks/reorder", {
      method: "POST",
      body: JSON.stringify({ ids }),
    });
  },
};

// ----- Schedule Events -----

export const scheduleEventsApi = {
  list(params?: { dateFrom?: string; dateTo?: string }): Promise<ScheduleEvent[]> {
    const qs = new URLSearchParams();
    if (params?.dateFrom) qs.set("date_from", params.dateFrom);
    if (params?.dateTo) qs.set("date_to", params.dateTo);
    const q = qs.toString();
    return request<ScheduleEvent[]>(`/api/v1/schedule_events${q ? `?${q}` : ""}`);
  },
  create(
    data: Omit<ScheduleEvent, "id" | "createdAt" | "updatedAt">
  ): Promise<ScheduleEvent> {
    return request<ScheduleEvent>("/api/v1/schedule_events", {
      method: "POST",
      ...body(data as unknown as Record<string, unknown>, "schedule_event"),
    });
  },
  update(
    id: string,
    data: Partial<Omit<ScheduleEvent, "id" | "createdAt" | "updatedAt">>
  ): Promise<ScheduleEvent> {
    return request<ScheduleEvent>(`/api/v1/schedule_events/${id}`, {
      method: "PATCH",
      ...body(data as unknown as Record<string, unknown>, "schedule_event"),
    });
  },
  delete(id: string): Promise<void> {
    return request<void>(`/api/v1/schedule_events/${id}`, { method: "DELETE" });
  },
};

// ----- Google Calendar -----

export const googleCalendarApi = {
  getAuthUrl(): Promise<{ url: string }> {
    return request<{ url: string }>("/api/v1/google_calendar/auth_url");
  },

  listAccounts(): Promise<GoogleCalendarAccount[]> {
    return request<GoogleCalendarAccount[]>("/api/v1/google_calendar/accounts");
  },

  deleteAccount(id: string): Promise<void> {
    return request<void>(`/api/v1/google_calendar/accounts/${id}`, { method: "DELETE" });
  },

  listCalendars(accountId: string): Promise<GoogleCalendarCalendar[]> {
    return request<GoogleCalendarCalendar[]>(
      `/api/v1/google_calendar/accounts/${accountId}/calendars`
    );
  },

  updateCalendar(
    accountId: string,
    calendarId: string,
    data: Partial<Pick<GoogleCalendarCalendar, "name" | "color" | "enabled">>
  ): Promise<GoogleCalendarCalendar> {
    return request<GoogleCalendarCalendar>(
      `/api/v1/google_calendar/accounts/${accountId}/calendars/${encodeURIComponent(calendarId)}`,
      {
        method: "PATCH",
        ...body(data as Record<string, unknown>, "calendar"),
      }
    );
  },

  listEvents(params?: { dateFrom?: string; dateTo?: string }): Promise<GoogleCalendarEvent[]> {
    const qs = new URLSearchParams();
    if (params?.dateFrom) qs.set("date_from", params.dateFrom);
    if (params?.dateTo) qs.set("date_to", params.dateTo);
    const q = qs.toString();
    return request<GoogleCalendarEvent[]>(`/api/v1/google_calendar/events${q ? `?${q}` : ""}`);
  },
};
