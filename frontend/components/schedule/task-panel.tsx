"use client";

import { useMemo, useEffect } from "react";
import { CalendarCheck2, CheckCircle2, Circle, GripVertical, ListTodo } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useTaskStore } from "@/lib/store/task-store";
import { useProjectStore } from "@/lib/store/project-store";
import { useScheduleStore } from "@/lib/store/schedule-store";
import { useGoogleCalendarStore } from "@/lib/store/google-calendar-store";
import { Task } from "@/lib/types";
import { GoogleCalendarPanel } from "@/components/schedule/google-calendar-panel";

// ---- タスク可能時間計算 ----
const TASK_WIN_START = 600;  // 10:00（分）
const TASK_WIN_END = 1200;   // 20:00（分）

/** 重複インターバルをマージして合計時間を返す（同日内の二重カウント防止） */
function sumMergedIntervals(intervals: [number, number][]): number {
  if (intervals.length === 0) return 0;
  const sorted = [...intervals].sort((a, b) => a[0] - b[0]);
  let total = 0;
  let curStart = sorted[0][0];
  let curEnd = sorted[0][1];
  for (let i = 1; i < sorted.length; i++) {
    const [s, e] = sorted[i];
    if (s <= curEnd) {
      curEnd = Math.max(curEnd, e);
    } else {
      total += curEnd - curStart;
      curStart = s;
      curEnd = e;
    }
  }
  total += curEnd - curStart;
  return total;
}

function formatMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}分`;
  if (m === 0) return `${h}時間`;
  return `${h}時間${m}分`;
}

function TaskPanelSkeleton() {
  return (
    <div className="flex h-full w-64 flex-shrink-0 flex-col overflow-hidden border-r bg-background">
      <div className="flex flex-shrink-0 items-center gap-2 border-b px-4 py-[9px]">
        <Skeleton className="h-4 w-4 rounded" />
        <Skeleton className="h-4 w-28" />
      </div>
      <div className="flex-shrink-0 space-y-2 border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-10" />
        </div>
        <Skeleton className="h-1.5 w-full rounded-full" />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2 space-y-1">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-8 w-full rounded-md" />
        ))}
      </div>
    </div>
  );
}

export const TASK_DRAG_MIME = "application/jarvis-task";

function TaskDragItem({ task, isScheduled }: { task: Task; isScheduled: boolean }) {
  const { updateTask } = useTaskStore();

  function handleDragStart(e: React.DragEvent) {
    e.dataTransfer.setData(
      TASK_DRAG_MIME,
      JSON.stringify({ taskId: task.id, title: task.title })
    );
    e.dataTransfer.effectAllowed = "copy";
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className={cn(
        "group flex items-center gap-1.5 rounded-md px-2 py-1.5",
        "cursor-grab select-none transition-colors hover:bg-accent active:cursor-grabbing",
        task.done && "opacity-50"
      )}
    >
      <GripVertical className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/30 transition-colors group-hover:text-muted-foreground/60" />
      <button
        className="flex-shrink-0 cursor-pointer"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          updateTask(task.id, { done: !task.done });
        }}
      >
        {task.done ? (
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
        ) : (
          <Circle className="h-3.5 w-3.5 text-muted-foreground/50 transition-colors hover:text-muted-foreground" />
        )}
      </button>
      <span
        className={cn(
          "min-w-0 flex-1 truncate text-xs leading-tight",
          task.done && "text-muted-foreground line-through"
        )}
      >
        {task.title}
      </span>
      {isScheduled && (
        <CalendarCheck2 className="h-3 w-3 flex-shrink-0 text-blue-400" />
      )}
    </div>
  );
}

export function TaskPanel() {
  const { tasks, loading: tkLoading, init: tkInit } = useTaskStore();
  const { projects, loading: pjLoading, init: pjInit } = useProjectStore();
  const { events } = useScheduleStore();
  const { events: gcalEvents } = useGoogleCalendarStore();

  useEffect(() => {
    tkInit();
    pjInit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scheduledTaskIds = useMemo(
    () => new Set(events.map((e) => e.taskId).filter(Boolean) as string[]),
    [events]
  );

  // 今週の日付セット（月〜日）
  const weekDateSet = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const day = today.getDay();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - (day === 0 ? 6 : day - 1));
    const dates = new Set<string>();
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      dates.add(
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
      );
    }
    return dates;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 10〜20時ウィンドウ内の集計（過去日・経過時間除外、重複マージ）
  const { nonTaskMinutes, taskMinutes, totalWindowMinutes } = useMemo(() => {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    let totalWindow = 0;
    const nonTaskByDate = new Map<string, [number, number][]>();
    const taskByDate = new Map<string, [number, number][]>();

    for (const dateStr of weekDateSet) {
      // 過去の日はスキップ
      if (dateStr < todayStr) continue;

      // 今日は現在時刻以降、未来日はフルウィンドウ
      const winStart = dateStr === todayStr
        ? Math.max(TASK_WIN_START, nowMinutes)
        : TASK_WIN_START;

      if (winStart >= TASK_WIN_END) continue;
      totalWindow += TASK_WIN_END - winStart;

      const clip = (startMin: number, durMin: number): [number, number] | null => {
        const s = Math.max(startMin, winStart);
        const e = Math.min(startMin + durMin, TASK_WIN_END);
        return e > s ? [s, e] : null;
      };

      for (const ev of events) {
        if (ev.date !== dateStr) continue;
        const interval = clip(ev.startMinutes, ev.durationMinutes);
        if (!interval) continue;
        const bucket = ev.taskId ? taskByDate : nonTaskByDate;
        bucket.set(dateStr, [...(bucket.get(dateStr) ?? []), interval]);
      }

      for (const ev of gcalEvents) {
        if (ev.date !== dateStr || ev.allDay) continue;
        const interval = clip(ev.startMinutes, ev.durationMinutes);
        if (!interval) continue;
        nonTaskByDate.set(dateStr, [...(nonTaskByDate.get(dateStr) ?? []), interval]);
      }
    }

    let nonTask = 0;
    for (const intervals of nonTaskByDate.values()) nonTask += sumMergedIntervals(intervals);
    let task = 0;
    for (const intervals of taskByDate.values()) task += sumMergedIntervals(intervals);

    return { nonTaskMinutes: nonTask, taskMinutes: task, totalWindowMinutes: totalWindow };
  }, [events, gcalEvents, weekDateSet]);

  const taskAvailableMinutes = Math.max(0, totalWindowMinutes - nonTaskMinutes);
  const remainingMinutes = Math.max(0, taskAvailableMinutes - taskMinutes);
  const remainingPct =
    taskAvailableMinutes > 0
      ? Math.round((remainingMinutes / taskAvailableMinutes) * 100)
      : 0;

  const thisWeekTasks = useMemo(() => tasks.filter((t) => t.thisWeek), [tasks]);
  const doneCount = useMemo(
    () => thisWeekTasks.filter((t) => t.done).length,
    [thisWeekTasks]
  );
  const total = thisWeekTasks.length;
  const progressPct = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  const projectMap = useMemo(
    () => new Map(projects.map((p) => [p.id, p.name])),
    [projects]
  );

  const grouped = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const task of thisWeekTasks) {
      const existing = map.get(task.projectId) ?? [];
      map.set(task.projectId, [...existing, task]);
    }
    return Array.from(map.entries());
  }, [thisWeekTasks]);

  if (tkLoading || pjLoading) return <TaskPanelSkeleton />;

  return (
    <div className="flex h-full w-64 flex-shrink-0 flex-col overflow-hidden border-r bg-background">
      {/* ヘッダー */}
      <div className="flex flex-shrink-0 items-center gap-2 border-b px-4 py-[9px]">
        <ListTodo className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-semibold">今週のタスク</span>
      </div>

      {/* 進捗サマリー（コンパクト） */}
      <div className="flex-shrink-0 border-b px-3 py-2 space-y-1.5">
        {/* 今週の進捗 */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">今週の進捗</span>
            <span className="tabular-nums text-[11px] font-medium">
              {progressPct === 100 ? (
                <span className="font-medium text-emerald-600">完了！</span>
              ) : (
                <>
                  <span className="text-foreground">{doneCount}</span>
                  <span className="text-muted-foreground"> / {total}</span>
                  {total > 0 && (
                    <span className="text-muted-foreground/60 ml-1">({progressPct}%)</span>
                  )}
                </>
              )}
            </span>
          </div>
          <div className="relative h-1 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                progressPct === 100 ? "bg-emerald-500" : "bg-emerald-400"
              )}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* 残りタスク可能時間 */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">タスク可能時間</span>
            <span className="tabular-nums text-[11px] font-medium">
              {remainingMinutes === 0 ? (
                <span className="font-medium text-red-500">残りなし</span>
              ) : (
                <>
                  <span
                    className={cn(
                      "text-foreground",
                      remainingPct <= 25 && "text-red-500",
                      remainingPct > 25 && remainingPct <= 50 && "text-amber-500"
                    )}
                  >
                    {formatMinutes(remainingMinutes)}
                  </span>
                  <span className="text-muted-foreground"> 残り</span>
                </>
              )}
            </span>
          </div>
          <div className="relative h-1 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                remainingPct > 50
                  ? "bg-sky-400"
                  : remainingPct > 25
                    ? "bg-amber-400"
                    : "bg-red-400"
              )}
              style={{ width: `${remainingPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* タスク一覧 */}
      <div className="min-h-0 flex-1 overflow-y-auto py-2">
        {total === 0 ? (
          <div className="space-y-1 px-4 py-8 text-center">
            <p className="text-xs text-muted-foreground">今週のタスクがありません</p>
            <p className="text-[11px] text-muted-foreground/60">
              プロジェクトでタスクに
              <br />
              「今週」フラグを設定してください
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {grouped.map(([projectId, projectTasks]) => (
              <div key={projectId}>
                <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                  {projectMap.get(projectId) ?? "—"}
                </p>
                {projectTasks.map((task) => (
                  <TaskDragItem
                    key={task.id}
                    task={task}
                    isScheduled={scheduledTaskIds.has(task.id)}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Google Calendar 連携パネル */}
      <GoogleCalendarPanel />
    </div>
  );
}
