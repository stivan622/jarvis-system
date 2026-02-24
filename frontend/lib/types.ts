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

// ----- Google Calendar -----

export interface GoogleCalendarAccount {
  id: string;
  email: string;
  name: string | null;
  pictureUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GoogleCalendarCalendar {
  id: string | null;
  calendarId: string;
  name: string;
  color: string;
  enabled: boolean;
}

export interface GoogleCalendarEvent {
  id: string;                  // "gcal_{googleCalendarId}_{googleEventId}"
  googleEventId: string;
  googleCalendarId: string;
  googleAccountId: string;
  title: string;
  date: string;                // YYYY-MM-DD
  startMinutes: number;
  durationMinutes: number;
  allDay: boolean;
  color: string;
  calendarName: string;
  accountEmail: string;
  meetLink?: string | null;    // Google Meet URL
}
