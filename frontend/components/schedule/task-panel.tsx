"use client";

import { useMemo, useEffect } from "react";
import { CalendarCheck2, CheckCircle2, Circle, GripVertical, ListTodo } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useTaskStore } from "@/lib/store/task-store";
import { useProjectStore } from "@/lib/store/project-store";
import { useScheduleStore } from "@/lib/store/schedule-store";
import { Task } from "@/lib/types";
import { GoogleCalendarPanel } from "@/components/schedule/google-calendar-panel";

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

  useEffect(() => {
    tkInit();
    pjInit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scheduledTaskIds = useMemo(
    () => new Set(events.map((e) => e.taskId).filter(Boolean) as string[]),
    [events]
  );

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

      {/* 進捗サマリー */}
      <div className="flex-shrink-0 space-y-2 border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">今週の進捗</span>
          <span className="tabular-nums text-xs font-medium">
            <span className="text-foreground">{doneCount}</span>
            <span className="text-muted-foreground"> / {total}</span>
          </span>
        </div>
        <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              progressPct === 100 ? "bg-emerald-500" : "bg-emerald-400"
            )}
            style={{ width: `${progressPct}%` }}
          />
        </div>
        {total > 0 && (
          <p className="text-[11px] text-muted-foreground">
            {progressPct === 100 ? (
              <span className="font-medium text-emerald-600">全タスク完了！</span>
            ) : (
              `${progressPct}% 完了`
            )}
          </p>
        )}
        {total === 0 && (
          <p className="text-[11px] text-muted-foreground/60">タスクなし</p>
        )}
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
