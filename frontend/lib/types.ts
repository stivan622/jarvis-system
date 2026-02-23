export interface Workspace {
  id: string;
  name: string;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  workspaceId: string;
  name: string;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  projectId: string;
  parentTaskId?: string | null;
  title: string;
  done: boolean;
  thisWeek: boolean;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduleEvent {
  id: string;
  title: string;
  date: string;             // YYYY-MM-DD
  startMinutes: number;     // midnight からの分数（0〜1425）、15の倍数
  durationMinutes: number;  // 15以上、15の倍数
  projectId?: string;
  taskId?: string;          // タスクと紐付ける場合のタスクID
  createdAt: string;
  updatedAt: string;
}
