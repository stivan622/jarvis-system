import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const API_BASE = process.env.JARVIS_API_URL ?? "http://localhost:3001";

// ----- API helpers -----

function toCamel(s: string): string {
  return s.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
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

async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
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
    const err = json as { errors?: string[]; error?: string };
    const msg = err.errors?.join(", ") ?? err.error ?? res.statusText;
    throw new Error(`API error ${res.status}: ${msg}`);
  }

  return camelizeKeys(json) as T;
}

function bodyInit(
  data: Record<string, unknown>,
  rootKey: string
): RequestInit {
  return {
    body: JSON.stringify({ [rootKey]: snakeizeKeys(data) }),
  };
}

// ----- Types -----

interface Workspace {
  id: string | number;
  name: string;
  createdAt: string;
  updatedAt: string;
}

interface Project {
  id: string | number;
  workspaceId: string | number;
  name: string;
  createdAt: string;
  updatedAt: string;
}

interface Task {
  id: string | number;
  projectId: string | number;
  title: string;
  done: boolean;
  thisWeek: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ScheduleEvent {
  id: string | number;
  title: string;
  date: string;
  startMinutes: number;
  durationMinutes: number;
  allDay?: boolean;
  color?: string;
  calendarName?: string;
  accountEmail?: string;
  meetLink?: string;
  projectId?: string | number;
  taskId?: string | number;
  createdAt?: string;
  updatedAt?: string;
}

interface GoogleCalendarEvent {
  id: string;
  googleEventId: string;
  googleCalendarId: string;
  googleAccountId: string | number;
  title: string;
  date: string;
  startMinutes: number;
  durationMinutes: number;
  allDay: boolean;
  color: string;
  calendarName: string;
  accountEmail: string;
  meetLink?: string;
}

// ----- MCP Server -----

const server = new McpServer({
  name: "jarvis",
  version: "1.0.0",
});

// ===== Workspace tools =====

server.tool(
  "list_workspaces",
  "ワークスペースの一覧を取得する",
  {},
  async () => {
    const workspaces = await apiRequest<Workspace[]>("/api/v1/workspaces");
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(workspaces, null, 2),
        },
      ],
    };
  }
);

server.tool(
  "create_workspace",
  "新しいワークスペースを作成する",
  {
    name: z.string().describe("ワークスペース名"),
  },
  async ({ name }) => {
    const workspace = await apiRequest<Workspace>("/api/v1/workspaces", {
      method: "POST",
      ...bodyInit({ name }, "workspace"),
    });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(workspace, null, 2),
        },
      ],
    };
  }
);

// ===== Project tools =====

server.tool(
  "list_projects",
  "プロジェクトの一覧を取得する",
  {
    workspaceId: z
      .string()
      .optional()
      .describe("絞り込むワークスペースID（省略可）"),
  },
  async ({ workspaceId }) => {
    const qs = workspaceId ? `?workspace_id=${workspaceId}` : "";
    const projects = await apiRequest<Project[]>(`/api/v1/projects${qs}`);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(projects, null, 2),
        },
      ],
    };
  }
);

server.tool(
  "create_project",
  "新しいプロジェクトを作成する",
  {
    workspaceId: z.string().describe("所属するワークスペースID"),
    name: z.string().describe("プロジェクト名"),
  },
  async ({ workspaceId, name }) => {
    const project = await apiRequest<Project>("/api/v1/projects", {
      method: "POST",
      ...bodyInit({ workspaceId, name }, "project"),
    });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(project, null, 2),
        },
      ],
    };
  }
);

server.tool(
  "update_project",
  "プロジェクト名を変更する",
  {
    id: z.string().describe("プロジェクトID"),
    name: z.string().describe("新しいプロジェクト名"),
  },
  async ({ id, name }) => {
    const project = await apiRequest<Project>(`/api/v1/projects/${id}`, {
      method: "PATCH",
      ...bodyInit({ name }, "project"),
    });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(project, null, 2),
        },
      ],
    };
  }
);

server.tool(
  "delete_project",
  "プロジェクトを削除する",
  {
    id: z.string().describe("プロジェクトID"),
  },
  async ({ id }) => {
    await apiRequest<void>(`/api/v1/projects/${id}`, { method: "DELETE" });
    return {
      content: [
        {
          type: "text",
          text: `プロジェクト ${id} を削除しました`,
        },
      ],
    };
  }
);

// ===== Task tools =====

server.tool(
  "list_tasks",
  "タスクの一覧を取得する",
  {
    projectId: z
      .string()
      .optional()
      .describe("絞り込むプロジェクトID（省略可）"),
    thisWeek: z
      .boolean()
      .optional()
      .describe("今週のタスクのみ取得する場合は true"),
  },
  async ({ projectId, thisWeek }) => {
    const qs = new URLSearchParams();
    if (projectId) qs.set("project_id", projectId);
    if (thisWeek) qs.set("this_week", "true");
    const q = qs.toString();
    const tasks = await apiRequest<Task[]>(
      `/api/v1/tasks${q ? `?${q}` : ""}`
    );
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(tasks, null, 2),
        },
      ],
    };
  }
);

server.tool(
  "create_task",
  "新しいタスクを作成する",
  {
    projectId: z.string().describe("所属するプロジェクトID"),
    title: z.string().describe("タスクのタイトル"),
    thisWeek: z
      .boolean()
      .optional()
      .describe("今週のタスクとしてマークする場合は true"),
  },
  async ({ projectId, title, thisWeek }) => {
    const data: Record<string, unknown> = { projectId, title };
    if (thisWeek !== undefined) data.thisWeek = thisWeek;
    const task = await apiRequest<Task>("/api/v1/tasks", {
      method: "POST",
      ...bodyInit(data, "task"),
    });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(task, null, 2),
        },
      ],
    };
  }
);

server.tool(
  "update_task",
  "タスクを更新する（タイトル変更・完了マーク・今週フラグの切り替えなど）",
  {
    id: z.string().describe("タスクID"),
    title: z.string().optional().describe("新しいタイトル"),
    done: z.boolean().optional().describe("完了状態（true=完了）"),
    thisWeek: z.boolean().optional().describe("今週フラグ（true=今週）"),
  },
  async ({ id, title, done, thisWeek }) => {
    const data: Record<string, unknown> = {};
    if (title !== undefined) data.title = title;
    if (done !== undefined) data.done = done;
    if (thisWeek !== undefined) data.thisWeek = thisWeek;

    const task = await apiRequest<Task>(`/api/v1/tasks/${id}`, {
      method: "PATCH",
      ...bodyInit(data, "task"),
    });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(task, null, 2),
        },
      ],
    };
  }
);

server.tool(
  "delete_task",
  "タスクを削除する",
  {
    id: z.string().describe("タスクID"),
  },
  async ({ id }) => {
    await apiRequest<void>(`/api/v1/tasks/${id}`, { method: "DELETE" });
    return {
      content: [
        {
          type: "text",
          text: `タスク ${id} を削除しました`,
        },
      ],
    };
  }
);

// ===== Schedule Event tools =====

server.tool(
  "list_schedule_events",
  "手動登録したスケジュールイベントの一覧を取得する",
  {
    dateFrom: z.string().optional().describe("取得開始日（YYYY-MM-DD形式、省略可）"),
    dateTo: z.string().optional().describe("取得終了日（YYYY-MM-DD形式、省略可）"),
  },
  async ({ dateFrom, dateTo }) => {
    const qs = new URLSearchParams();
    if (dateFrom) qs.set("date_from", dateFrom);
    if (dateTo) qs.set("date_to", dateTo);
    const q = qs.toString();
    const events = await apiRequest<ScheduleEvent[]>(
      `/api/v1/schedule_events${q ? `?${q}` : ""}`
    );
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(events, null, 2),
        },
      ],
    };
  }
);

server.tool(
  "list_google_calendar_events",
  "Googleカレンダーのイベント一覧を取得する",
  {
    dateFrom: z.string().optional().describe("取得開始日（YYYY-MM-DD形式、省略可）"),
    dateTo: z.string().optional().describe("取得終了日（YYYY-MM-DD形式、省略可）"),
  },
  async ({ dateFrom, dateTo }) => {
    const qs = new URLSearchParams();
    if (dateFrom) qs.set("date_from", dateFrom);
    if (dateTo) qs.set("date_to", dateTo);
    const q = qs.toString();
    const events = await apiRequest<GoogleCalendarEvent[]>(
      `/api/v1/google_calendar/events${q ? `?${q}` : ""}`
    );
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(events, null, 2),
        },
      ],
    };
  }
);

server.tool(
  "create_schedule_event",
  "新しいスケジュールイベントを作成する",
  {
    title: z.string().describe("イベントのタイトル"),
    date: z.string().describe("日付（YYYY-MM-DD形式）"),
    startMinutes: z.number().describe("開始時刻（0時からの分数、例: 9時=540）"),
    durationMinutes: z.number().describe("所要時間（分）"),
    projectId: z.string().optional().describe("関連するプロジェクトID（省略可）"),
    taskId: z.string().optional().describe("関連するタスクID（省略可）"),
  },
  async ({ title, date, startMinutes, durationMinutes, projectId, taskId }) => {
    const data: Record<string, unknown> = { title, date, startMinutes, durationMinutes };
    if (projectId !== undefined) data.projectId = projectId;
    if (taskId !== undefined) data.taskId = taskId;
    const event = await apiRequest<ScheduleEvent>("/api/v1/schedule_events", {
      method: "POST",
      ...bodyInit(data, "schedule_event"),
    });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(event, null, 2),
        },
      ],
    };
  }
);

server.tool(
  "update_schedule_event",
  "スケジュールイベントを更新する",
  {
    id: z.string().describe("イベントID"),
    title: z.string().optional().describe("新しいタイトル"),
    date: z.string().optional().describe("新しい日付（YYYY-MM-DD形式）"),
    startMinutes: z.number().optional().describe("新しい開始時刻（0時からの分数）"),
    durationMinutes: z.number().optional().describe("新しい所要時間（分）"),
    projectId: z.string().optional().describe("関連するプロジェクトID"),
    taskId: z.string().optional().describe("関連するタスクID"),
  },
  async ({ id, title, date, startMinutes, durationMinutes, projectId, taskId }) => {
    const data: Record<string, unknown> = {};
    if (title !== undefined) data.title = title;
    if (date !== undefined) data.date = date;
    if (startMinutes !== undefined) data.startMinutes = startMinutes;
    if (durationMinutes !== undefined) data.durationMinutes = durationMinutes;
    if (projectId !== undefined) data.projectId = projectId;
    if (taskId !== undefined) data.taskId = taskId;
    const event = await apiRequest<ScheduleEvent>(`/api/v1/schedule_events/${id}`, {
      method: "PATCH",
      ...bodyInit(data, "schedule_event"),
    });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(event, null, 2),
        },
      ],
    };
  }
);

server.tool(
  "delete_schedule_event",
  "スケジュールイベントを削除する",
  {
    id: z.string().describe("イベントID"),
  },
  async ({ id }) => {
    await apiRequest<void>(`/api/v1/schedule_events/${id}`, { method: "DELETE" });
    return {
      content: [
        {
          type: "text",
          text: `スケジュールイベント ${id} を削除しました`,
        },
      ],
    };
  }
);

// ===== Start server =====

const transport = new StdioServerTransport();
await server.connect(transport);
