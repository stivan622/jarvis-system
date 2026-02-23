"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { CheckSquare, ChevronLeft, ChevronRight, Clock, Edit2, Square, Trash2, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { GoogleCalendarEvent, ScheduleEvent } from "@/lib/types";
import { useScheduleStore } from "@/lib/store/schedule-store";
import { useTaskStore } from "@/lib/store/task-store";
import { useGoogleCalendarStore } from "@/lib/store/google-calendar-store";
import { EventDialog, formatTime } from "./event-dialog";
import { TASK_DRAG_MIME } from "./task-panel";

// ---- 定数 ----
const SLOT_HEIGHT = 20;
const HOUR_HEIGHT = SLOT_HEIGHT * 4;
const TOTAL_HOURS = 24;
const GUTTER_W = 56;
const DEFAULT_DURATION = 30;
const DRAG_THRESHOLD = 5;
const DAYS_JA = ["月", "火", "水", "木", "金", "土", "日"];

// ---- ユーティリティ ----
function toDateStr(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return d;
}
function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });
}
function isToday(date: Date) {
  const t = new Date();
  return (
    date.getFullYear() === t.getFullYear() &&
    date.getMonth() === t.getMonth() &&
    date.getDate() === t.getDate()
  );
}

// ---- 重なりレイアウト計算 ----
type SlotItem = { id: string; startMinutes: number; durationMinutes: number };

type LayoutItem<T extends SlotItem> = {
  item: T;
  column: number;
  totalColumns: number;
};

function computeLayoutGeneric<T extends SlotItem>(items: T[]): LayoutItem<T>[] {
  if (items.length === 0) return [];

  const sorted = [...items].sort((a, b) => a.startMinutes - b.startMinutes);
  const columns: number[] = [];
  const assignments: { item: T; column: number }[] = [];

  for (const item of sorted) {
    const end = item.startMinutes + item.durationMinutes;
    let placed = false;
    for (let col = 0; col < columns.length; col++) {
      if (columns[col] <= item.startMinutes) {
        columns[col] = end;
        assignments.push({ item, column: col });
        placed = true;
        break;
      }
    }
    if (!placed) {
      columns.push(end);
      assignments.push({ item, column: columns.length - 1 });
    }
  }

  return assignments.map(({ item, column }) => {
    const end = item.startMinutes + item.durationMinutes;
    const overlapping = assignments.filter(({ item: other }) => {
      const otherEnd = other.startMinutes + other.durationMinutes;
      return other.startMinutes < end && otherEnd > item.startMinutes;
    });
    const maxCol = Math.max(...overlapping.map((o) => o.column));
    return { item, column, totalColumns: maxCol + 1 };
  });
}


// ---- 型 ----
type DragState = {
  type: "move" | "resize";
  eventId: string;
  original: ScheduleEvent;
  currentDate: string;
  currentStartMinutes: number;
  currentDurationMinutes: number;
  grabOffsetMinutes: number;
  activated: boolean;
  startClientX: number;
  startClientY: number;
};

type CreatingSlot = {
  date: string;
  startMinutes: number;
  durationMinutes: number;
} | null;

type QuickView = { event: ScheduleEvent; x: number; y: number } | null;
type DetailDialog = {
  open: boolean;
  date: string;
  startMinutes: number;
  title: string;
  editingEvent?: ScheduleEvent | null;
};

// ---- CreatingEventBlock ----
function CreatingEventBlock({
  startMinutes,
  durationMinutes,
  onSave,
  onCancel,
  onOpenDetail,
  onResize,
  onMove,
}: {
  startMinutes: number;
  durationMinutes: number;
  onSave: (title: string) => void;
  onCancel: () => void;
  onOpenDetail: (title: string) => void;
  onResize: (durationMinutes: number) => void;
  onMove: (startMinutes: number) => void;
}) {
  const [title, setTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const committedRef = useRef(false);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const top = (startMinutes / 15) * SLOT_HEIGHT;
  const height = Math.max((durationMinutes / 15) * SLOT_HEIGHT, HOUR_HEIGHT / 2);

  function commit(fn: () => void) {
    committedRef.current = true;
    fn();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.nativeEvent.isComposing) {
      e.preventDefault();
      commit(() => (title.trim() ? onSave(title.trim()) : onCancel()));
    }
    if (e.key === "Escape") commit(onCancel);
    if (e.key === "Tab") {
      e.preventDefault();
      commit(() => onOpenDetail(title.trim()));
    }
  }

  function handleBlur() {
    if (!committedRef.current) {
      title.trim() ? onSave(title.trim()) : onCancel();
    }
  }

  function handleBlockMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest("input")) return;
    e.preventDefault();
    e.stopPropagation();
    const startY = e.clientY;
    const origStart = startMinutes;

    const onMouseMove = (me: MouseEvent) => {
      const dy = me.clientY - startY;
      const deltaSlots = Math.round(dy / SLOT_HEIGHT);
      const newStart = Math.max(0, Math.min(origStart + deltaSlots * 15, TOTAL_HOURS * 60 - durationMinutes));
      onMove(newStart);
    };
    const onMouseUp = () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }

  return (
    <div
      className="event-block absolute z-20 flex flex-col gap-0.5 overflow-hidden rounded bg-blue-500 px-2 py-1.5 shadow-xl ring-2 ring-blue-300/80 cursor-grab active:cursor-grabbing"
      style={{ top, height, left: "3px", right: "3px" }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={handleBlockMouseDown}
    >
      <input
        ref={inputRef}
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder="タイトル..."
        className="w-full bg-transparent text-xs font-medium text-white placeholder-blue-200/60 focus:outline-none"
      />
      <p className="text-[10px] leading-tight text-blue-100">
        {formatTime(startMinutes)}–{formatTime(startMinutes + durationMinutes)}
      </p>
      <p className="text-[10px] leading-tight text-blue-200/50">Tab: 詳細設定</p>

      {/* リサイズハンドル（非表示・機能のみ） */}
      <div
        className="resize-handle absolute bottom-0 left-0 right-0 h-2 cursor-s-resize"
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const startY = e.clientY;
          const origDuration = durationMinutes;
          const origStart = startMinutes;

          const onMouseMove = (me: MouseEvent) => {
            const dy = me.clientY - startY;
            const deltaSlots = Math.round(dy / SLOT_HEIGHT);
            const newDuration = Math.max(15, origDuration + deltaSlots * 15);
            const capped = Math.min(newDuration, TOTAL_HOURS * 60 - origStart);
            onResize(capped);
          };
          const onMouseUp = () => {
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseup", onMouseUp);
          };
          document.addEventListener("mousemove", onMouseMove);
          document.addEventListener("mouseup", onMouseUp);
        }}
      />
    </div>
  );
}

// ---- EventBlock ----
function EventBlock({
  event,
  isDragging,
  column,
  totalColumns,
  onStartMove,
  onStartResize,
}: {
  event: ScheduleEvent;
  isDragging: boolean;
  column: number;
  totalColumns: number;
  onStartMove: (event: ScheduleEvent, clientX: number, clientY: number) => void;
  onStartResize: (event: ScheduleEvent, clientX: number, clientY: number) => void;
}) {
  const top = (event.startMinutes / 15) * SLOT_HEIGHT;
  const height = Math.max((event.durationMinutes / 15) * SLOT_HEIGHT, SLOT_HEIGHT);

  const { tasks, updateTask } = useTaskStore();
  const linkedTask = event.taskId ? tasks.find((t) => t.id === event.taskId) : undefined;
  const isTask = linkedTask !== undefined;

  // 重なりレイアウト: 列幅の計算（少し間隔を入れる）
  const GAP = 2;
  const widthPct = `calc(${100 / totalColumns}% - ${GAP}px)`;
  const leftPct = `calc(${(column / totalColumns) * 100}% + ${column > 0 ? GAP / 2 : 1}px)`;

  return (
    <div
      className={cn(
        "event-block absolute z-10 select-none overflow-hidden rounded px-1.5 py-0.5 text-white ring-1 ring-white/40",
        isTask
          ? isDragging
            ? "z-30 cursor-grabbing bg-slate-400 opacity-90 shadow-2xl ring-2 ring-slate-200"
            : "cursor-grab bg-slate-400 transition-colors hover:bg-slate-500"
          : isDragging
            ? "z-30 cursor-grabbing bg-blue-500 opacity-90 shadow-2xl ring-2 ring-blue-300"
            : "cursor-grab bg-blue-500 transition-colors hover:bg-blue-600"
      )}
      style={{
        top,
        height,
        left: leftPct,
        width: widthPct,
      }}
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onStartMove(event, e.clientX, e.clientY);
      }}
    >
      <div className="flex items-start gap-1">
        {isTask && (
          <div
            className="mt-0.5 flex-shrink-0"
            onMouseDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
            onClick={(e) => {
              e.stopPropagation();
              updateTask(linkedTask.id, { done: !linkedTask.done });
            }}
          >
            {linkedTask.done ? (
              <CheckSquare className="h-3 w-3 text-white" />
            ) : (
              <Square className="h-3 w-3 text-white/80" />
            )}
          </div>
        )}
        <p
          className={cn(
            "min-w-0 flex-1 truncate text-xs font-medium leading-tight",
            linkedTask?.done && "opacity-70 line-through"
          )}
        >
          {event.title}
        </p>
      </div>
      {height > SLOT_HEIGHT * 1.5 && (
        <p className={cn("text-[10px] leading-tight", isTask ? "text-slate-100" : "text-blue-100")}>
          {formatTime(event.startMinutes)}–{formatTime(event.startMinutes + event.durationMinutes)}
        </p>
      )}

      {/* リサイズハンドル（非表示・機能のみ） */}
      {!isDragging && (
        <div
          className="absolute bottom-0 left-0 right-0 h-2 cursor-s-resize"
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onStartResize(event, e.clientX, e.clientY);
          }}
        />
      )}
    </div>
  );
}

// ---- GCalEventBlock ----
function GCalEventBlock({
  event,
  column,
  totalColumns,
}: {
  event: GoogleCalendarEvent;
  column: number;
  totalColumns: number;
}) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const top = (event.startMinutes / 15) * SLOT_HEIGHT;
  const height = Math.max((event.durationMinutes / 15) * SLOT_HEIGHT, SLOT_HEIGHT);

  const GAP = 2;
  const widthPct = `calc(${100 / totalColumns}% - ${GAP}px)`;
  const leftPct = `calc(${(column / totalColumns) * 100}% + ${column > 0 ? GAP / 2 : 1}px)`;

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    setTooltipPos({ x: e.clientX, y: e.clientY });
    setShowTooltip((v) => !v);
  }

  return (
    <>
      <div
        className="event-block absolute z-10 select-none overflow-hidden rounded px-1.5 py-0.5 text-white ring-1 ring-white/30 cursor-pointer opacity-90 hover:opacity-100 transition-opacity"
        style={{
          top,
          height,
          left: leftPct,
          width: widthPct,
          backgroundColor: event.color,
          backgroundImage: `repeating-linear-gradient(
            45deg,
            transparent,
            transparent 4px,
            rgba(255,255,255,0.08) 4px,
            rgba(255,255,255,0.08) 8px
          )`,
        }}
        onClick={handleClick}
      >
        <p className="min-w-0 truncate text-xs font-medium leading-tight">{event.title}</p>
        {height > SLOT_HEIGHT * 1.5 && (
          <p className="text-[10px] leading-tight opacity-80">
            {formatTime(event.startMinutes)}–{formatTime(event.startMinutes + event.durationMinutes)}
          </p>
        )}
      </div>

      {showTooltip && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowTooltip(false)} />
          <div
            className="fixed z-50 w-56 overflow-hidden rounded-lg border bg-background shadow-xl p-3"
            style={{
              left: Math.min(tooltipPos.x + 8, (typeof window !== "undefined" ? window.innerWidth : 800) - 240),
              top: Math.min(tooltipPos.y - 8, (typeof window !== "undefined" ? window.innerHeight : 600) - 140),
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-2 mb-2">
              <div
                className="mt-0.5 h-3 w-3 flex-shrink-0 rounded-full"
                style={{ backgroundColor: event.color }}
              />
              <p className="text-sm font-medium leading-tight">{event.title}</p>
            </div>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3 flex-shrink-0" />
              {event.allDay
                ? "終日"
                : `${formatTime(event.startMinutes)}–${formatTime(event.startMinutes + event.durationMinutes)}`}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground/70 truncate">{event.calendarName}</p>
            <p className="text-[10px] text-muted-foreground/50 truncate">{event.accountEmail}</p>
            {event.meetLink && (
              <a
                href={event.meetLink}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 flex items-center gap-1.5 rounded-md bg-[#1a73e8] px-2.5 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90"
                onClick={(e) => e.stopPropagation()}
              >
                <Video className="h-3 w-3 flex-shrink-0" />
                Google Meet に参加
              </a>
            )}
          </div>
        </>
      )}
    </>
  );
}

// ---- EventQuickView ----
function EventQuickView({
  event,
  position,
  onClose,
  onUpdate,
  onDelete,
  onOpenDetail,
}: {
  event: ScheduleEvent;
  position: { x: number; y: number };
  onClose: () => void;
  onUpdate: (title: string) => void;
  onDelete: () => void;
  onOpenDetail: () => void;
}) {
  const [title, setTitle] = useState(event.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const CARD_W = 256;
  const safeX =
    typeof window !== "undefined"
      ? Math.min(position.x + 8, window.innerWidth - CARD_W - 12)
      : position.x + 8;
  const safeY =
    typeof window !== "undefined"
      ? Math.min(position.y - 8, window.innerHeight - 160)
      : position.y - 8;

  function handleSave() {
    const trimmed = title.trim();
    if (trimmed && trimmed !== event.title) onUpdate(trimmed);
    onClose();
  }

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={handleSave} />
      <div
        className="fixed z-50 w-64 overflow-hidden rounded-lg border bg-background shadow-xl"
        style={{ left: safeX, top: safeY }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-3 pb-2">
          <input
            ref={inputRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                e.preventDefault();
                handleSave();
              }
              if (e.key === "Escape") onClose();
            }}
            className="w-full bg-transparent text-sm font-medium focus:outline-none"
          />
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3 flex-shrink-0" />
            {formatTime(event.startMinutes)}–
            {formatTime(event.startMinutes + event.durationMinutes)}
            <span className="ml-1 text-muted-foreground/60">({event.durationMinutes}分)</span>
          </p>
        </div>
        <div className="flex items-center justify-between border-t px-2 py-1.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              onDelete();
              onClose();
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              onOpenDetail();
              onClose();
            }}
          >
            <Edit2 className="mr-1 h-3 w-3" />
            詳細を編集
          </Button>
        </div>
      </div>
    </>
  );
}

// ---- DayColumn ----
function DayColumn({
  day,
  events,
  gcalEvents,
  currentMinutes,
  creatingSlot,
  draggingEventId,
  onSlotClick,
  onStartMove,
  onStartResize,
  onInlineSave,
  onInlineCancel,
  onInlineOpenDetail,
  onInlineResize,
  onInlineMove,
  onDropTask,
}: {
  day: Date;
  events: ScheduleEvent[];
  gcalEvents: GoogleCalendarEvent[];
  currentMinutes: number;
  creatingSlot: CreatingSlot;
  draggingEventId: string | null;
  onSlotClick: (date: string, startMinutes: number) => void;
  onStartMove: (event: ScheduleEvent, clientX: number, clientY: number) => void;
  onStartResize: (event: ScheduleEvent, clientX: number, clientY: number) => void;
  onInlineSave: (title: string) => void;
  onInlineCancel: () => void;
  onInlineOpenDetail: (title: string) => void;
  onInlineResize: (durationMinutes: number) => void;
  onInlineMove: (startMinutes: number) => void;
  onDropTask: (taskId: string, title: string, date: string, startMinutes: number) => void;
}) {
  const today = isToday(day);
  const [dragOver, setDragOver] = useState(false);
  const [dragOverMinutes, setDragOverMinutes] = useState<number | null>(null);
  const dateStr = toDateStr(day);
  const isCreatingHere = creatingSlot?.date === dateStr;

  function calcMinutesFromClientY(e: React.DragEvent<HTMLDivElement>): number {
    const rect = e.currentTarget.getBoundingClientRect();
    const relY = e.clientY - rect.top;
    const slotIndex = Math.floor(relY / SLOT_HEIGHT);
    return Math.min(slotIndex * 15, (TOTAL_HOURS * 4 - 1) * 15);
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    if (!e.dataTransfer.types.includes(TASK_DRAG_MIME)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setDragOver(true);
    setDragOverMinutes(calcMinutesFromClientY(e));
  }

  function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOver(false);
      setDragOverMinutes(null);
    }
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    setDragOverMinutes(null);
    const raw = e.dataTransfer.getData(TASK_DRAG_MIME);
    if (!raw) return;
    const { taskId, title } = JSON.parse(raw) as { taskId: string; title: string };
    const startMins = calcMinutesFromClientY(e);
    onDropTask(taskId, title, dateStr, startMins);
  }

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest(".event-block")) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const slotIndex = Math.floor(y / SLOT_HEIGHT);
    const startMins = Math.min(slotIndex * 15, (TOTAL_HOURS * 4 - 1) * 15);
    onSlotClick(dateStr, startMins);
  }

  // GCalイベントとシステムイベントを統合してレイアウト計算（重なりを正しく処理）
  const filteredGcalEvents = useMemo(() => gcalEvents.filter((e) => !e.allDay), [gcalEvents]);

  const combinedLayoutMap = useMemo(() => {
    const allSlotItems: SlotItem[] = [
      ...events.map((e) => ({ id: e.id, startMinutes: e.startMinutes, durationMinutes: e.durationMinutes })),
      ...filteredGcalEvents.map((e) => ({ id: e.id, startMinutes: e.startMinutes, durationMinutes: e.durationMinutes })),
    ];
    const result = computeLayoutGeneric(allSlotItems);
    const map = new Map<string, { column: number; totalColumns: number }>();
    for (const { item, column, totalColumns } of result) {
      map.set(item.id, { column, totalColumns });
    }
    return map;
  }, [events, filteredGcalEvents]);

  return (
    <div
      className={cn(
        "relative flex-1 cursor-pointer border-r border-border/40 last:border-r-0",
        today && "bg-blue-50/30 dark:bg-blue-950/20",
        dragOver && "bg-slate-50/40 dark:bg-slate-950/20"
      )}
      style={{ height: TOTAL_HOURS * HOUR_HEIGHT }}
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* グリッド線 */}
      {Array.from({ length: TOTAL_HOURS * 2 }, (_, i) => (
        <div
          key={i}
          className={cn(
            "pointer-events-none absolute w-full border-t",
            i % 2 === 0 ? "border-border/50" : "border-border/20"
          )}
          style={{ top: i * (HOUR_HEIGHT / 2) }}
        />
      ))}

      {/* Google Calendar イベント（読み取り専用） */}
      {filteredGcalEvents.map((event) => {
        const { column, totalColumns } = combinedLayoutMap.get(event.id) ?? { column: 0, totalColumns: 1 };
        return (
          <GCalEventBlock
            key={event.id}
            event={event}
            column={column}
            totalColumns={totalColumns}
          />
        );
      })}

      {/* イベント（重なりレイアウト付き） */}
      {events.map((event) => {
        const { column, totalColumns } = combinedLayoutMap.get(event.id) ?? { column: 0, totalColumns: 1 };
        return (
          <EventBlock
            key={event.id}
            event={event}
            isDragging={event.id === draggingEventId}
            column={column}
            totalColumns={totalColumns}
            onStartMove={onStartMove}
            onStartResize={onStartResize}
          />
        );
      })}

      {/* インライン作成ブロック */}
      {isCreatingHere && creatingSlot && (
        <CreatingEventBlock
          startMinutes={creatingSlot.startMinutes}
          durationMinutes={creatingSlot.durationMinutes}
          onSave={onInlineSave}
          onCancel={onInlineCancel}
          onOpenDetail={onInlineOpenDetail}
          onResize={onInlineResize}
          onMove={onInlineMove}
        />
      )}

      {/* タスクドラッグ中のプレビューブロック */}
      {dragOver && dragOverMinutes !== null && (
        <div
          className="pointer-events-none absolute left-0.5 right-0.5 z-30 rounded-lg border-2 border-dashed border-slate-500/60 bg-slate-500/10"
          style={{
            top: (dragOverMinutes / 15) * SLOT_HEIGHT,
            height: (DEFAULT_DURATION / 15) * SLOT_HEIGHT,
          }}
        />
      )}

      {/* 現在時刻インジケーター */}
      {today && (
        <div
          className="pointer-events-none absolute left-0 right-0 z-20 flex items-center"
          style={{ top: (currentMinutes / 15) * SLOT_HEIGHT }}
        >
          <span
            className="h-2 w-2 flex-shrink-0 rounded-full bg-red-500"
            style={{ marginLeft: -4 }}
          />
          <span className="h-px flex-1 bg-red-500" />
        </div>
      )}
    </div>
  );
}

// ---- WeekViewSkeleton ----
function WeekViewSkeleton() {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex flex-shrink-0 items-center justify-between border-b px-4 py-2">
        <div className="flex items-center gap-1.5">
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-8 w-14 rounded-md" />
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
        <Skeleton className="h-4 w-44" />
        <div className="w-28" />
      </div>
      <div className="flex flex-shrink-0 border-b">
        <div style={{ width: GUTTER_W }} className="flex-shrink-0 border-r border-border/40" />
        {[...Array(7)].map((_, i) => (
          <div
            key={i}
            className="flex flex-1 flex-col items-center gap-1 border-r border-border/40 py-1.5 last:border-r-0"
          >
            <Skeleton className="h-3 w-4" />
            <Skeleton className="h-7 w-7 rounded-full" />
          </div>
        ))}
      </div>
      <div className="flex-1 overflow-hidden">
        <div className="flex h-full">
          <div style={{ width: GUTTER_W }} className="flex-shrink-0 border-r border-border/40" />
          <div className="relative flex-1">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                style={{ height: HOUR_HEIGHT * 2 }}
                className="border-b border-border/20"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- WeekView ----
export function WeekView() {
  const { events, loading, createEvent, updateEvent, deleteEvent, init: scheduleInit } = useScheduleStore();
  const { events: gcalEvents, loadEvents: loadGcalEvents } = useGoogleCalendarStore();

  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const days = getWeekDays(weekStart);
  const daysRef = useRef(days);
  useEffect(() => { daysRef.current = days; });

  useEffect(() => {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    const params = {
      dateFrom: toDateStr(weekStart),
      dateTo: toDateStr(weekEnd),
    };
    scheduleInit(params);
    loadGcalEvents(params);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart]);

  const [creatingSlot, setCreatingSlot] = useState<CreatingSlot>(null);
  const [quickView, setQuickView] = useState<QuickView>(null);
  const [detailDialog, setDetailDialog] = useState<DetailDialog>({
    open: false,
    date: "",
    startMinutes: 9 * 60,
    title: "",
    editingEvent: null,
  });
  const [dragging, setDragging] = useState<DragState | null>(null);

  const dragResultRef = useRef<{
    save?: ScheduleEvent;
    click?: { event: ScheduleEvent; x: number; y: number };
  } | null>(null);

  const gridRef = useRef<HTMLDivElement>(null);

  const [currentMinutes, setCurrentMinutes] = useState(() => {
    const n = new Date();
    return n.getHours() * 60 + n.getMinutes();
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const n = new Date();
      setCurrentMinutes(n.getHours() * 60 + n.getMinutes());
    }, 60_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (gridRef.current) {
      const top = (currentMinutes / 15) * SLOT_HEIGHT - 240;
      gridRef.current.scrollTop = Math.max(0, top);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!dragging?.activated) return;
    document.body.style.userSelect = "none";
    document.body.style.cursor = "grabbing";
    return () => {
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
  }, [dragging?.activated]);

  useEffect(() => {
    if (dragging !== null || !dragResultRef.current) return;
    const result = dragResultRef.current;
    dragResultRef.current = null;
    if (result.save) {
      const { id, createdAt, updatedAt, ...data } = result.save;
      void createdAt; void updatedAt;
      updateEvent(id, data);
    }
    if (result.click) setQuickView(result.click);
  }, [dragging, updateEvent]);

  // ---- ドラッグ開始 ----
  const startMoveDrag = useCallback(
    (event: ScheduleEvent, clientX: number, clientY: number) => {
      setCreatingSlot(null);
      setQuickView(null);
      if (!gridRef.current) return;
      const rect = gridRef.current.getBoundingClientRect();
      const scrollTop = gridRef.current.scrollTop;
      const relY = clientY - rect.top + scrollTop;
      const grabOffsetMinutes = Math.max(
        0,
        Math.round((relY - (event.startMinutes / 15) * SLOT_HEIGHT) / SLOT_HEIGHT) * 15
      );
      setDragging({
        type: "move",
        eventId: event.id,
        original: event,
        currentDate: event.date,
        currentStartMinutes: event.startMinutes,
        currentDurationMinutes: event.durationMinutes,
        grabOffsetMinutes,
        activated: false,
        startClientX: clientX,
        startClientY: clientY,
      });
    },
    []
  );

  const startResizeDrag = useCallback(
    (event: ScheduleEvent, clientX: number, clientY: number) => {
      setCreatingSlot(null);
      setQuickView(null);
      setDragging({
        type: "resize",
        eventId: event.id,
        original: event,
        currentDate: event.date,
        currentStartMinutes: event.startMinutes,
        currentDurationMinutes: event.durationMinutes,
        grabOffsetMinutes: 0,
        activated: false,
        startClientX: clientX,
        startClientY: clientY,
      });
    },
    []
  );

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!gridRef.current) return;

    setDragging((prev) => {
      if (!prev) return null;

      const dx = e.clientX - prev.startClientX;
      const dy = e.clientY - prev.startClientY;
      const activated =
        prev.activated || Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD;

      if (!activated) return prev;

      const rect = gridRef.current!.getBoundingClientRect();
      const scrollTop = gridRef.current!.scrollTop;

      if (prev.type === "move") {
        const grabPx = (prev.grabOffsetMinutes / 15) * SLOT_HEIGHT;
        const rawY = e.clientY - rect.top + scrollTop - grabPx;
        const slotIndex = Math.round(rawY / SLOT_HEIGHT);
        const newStart = Math.max(
          0,
          Math.min(slotIndex * 15, TOTAL_HOURS * 60 - prev.currentDurationMinutes)
        );

        const x = e.clientX - rect.left - GUTTER_W;
        const dayWidth = (rect.width - GUTTER_W) / 7;
        const dayIndex = Math.max(0, Math.min(Math.floor(x / dayWidth), 6));
        const newDate = toDateStr(daysRef.current[dayIndex]);

        if (
          activated === prev.activated &&
          newDate === prev.currentDate &&
          newStart === prev.currentStartMinutes
        ) {
          return prev;
        }
        return { ...prev, activated, currentDate: newDate, currentStartMinutes: newStart };
      } else {
        const endY = e.clientY - rect.top + scrollTop;
        const newEndSlot = Math.round(endY / SLOT_HEIGHT);
        const newDuration = Math.max(15, newEndSlot * 15 - prev.currentStartMinutes);
        const cappedDuration = Math.min(
          newDuration,
          TOTAL_HOURS * 60 - prev.currentStartMinutes
        );

        if (activated === prev.activated && cappedDuration === prev.currentDurationMinutes) {
          return prev;
        }
        return { ...prev, activated, currentDurationMinutes: cappedDuration };
      }
    });
  }, []);

  const handleMouseUp = useCallback(() => {
    setDragging((prev) => {
      if (!prev) return null;

      if (prev.activated) {
        dragResultRef.current = {
          save: {
            ...prev.original,
            date: prev.currentDate,
            startMinutes: prev.currentStartMinutes,
            durationMinutes: prev.currentDurationMinutes,
            updatedAt: new Date().toISOString(),
          },
        };
      } else {
        dragResultRef.current = {
          click: {
            event: prev.original,
            x: prev.startClientX,
            y: prev.startClientY,
          },
        };
      }
      return null;
    });
  }, []);

  const isDragging = dragging !== null;
  useEffect(() => {
    if (!isDragging) return;
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const displayEvents = useMemo(() => {
    if (!dragging?.activated) return events;
    return events.map((e) =>
      e.id === dragging.eventId
        ? {
            ...e,
            date: dragging.currentDate,
            startMinutes: dragging.currentStartMinutes,
            durationMinutes: dragging.currentDurationMinutes,
          }
        : e
    );
  }, [events, dragging]);

  const shiftWeek = useCallback((delta: number) => {
    setWeekStart((d) => {
      const n = new Date(d);
      n.setDate(d.getDate() + delta * 7);
      return n;
    });
  }, []);

  function formatWeekRange() {
    const s = days[0], e = days[6];
    const sy = s.getFullYear(), sm = s.getMonth() + 1, sd = s.getDate();
    const ey = e.getFullYear(), em = e.getMonth() + 1, ed = e.getDate();
    if (sy === ey && sm === em) return `${sy}年${sm}月${sd}日–${ed}日`;
    if (sy === ey) return `${sy}年${sm}月${sd}日–${em}月${ed}日`;
    return `${sy}年${sm}月${sd}日–${ey}年${em}月${ed}日`;
  }

  if (loading) return <WeekViewSkeleton />;

  // ---- ハンドラー ----
  function handleSlotClick(date: string, startMinutes: number) {
    setQuickView(null);
    setCreatingSlot({ date, startMinutes, durationMinutes: DEFAULT_DURATION });
  }

  async function handleInlineSave(title: string) {
    if (!creatingSlot) return;
    const durationMinutes = Math.min(creatingSlot.durationMinutes, TOTAL_HOURS * 60 - creatingSlot.startMinutes);
    setCreatingSlot(null);
    try {
      await createEvent({
        title,
        date: creatingSlot.date,
        startMinutes: creatingSlot.startMinutes,
        durationMinutes,
      });
      toast.success(`「${title}」を追加しました`);
    } catch {
      toast.error("予定の追加に失敗しました");
    }
  }

  function handleInlineOpenDetail(title: string) {
    if (!creatingSlot) return;
    setDetailDialog({
      open: true,
      date: creatingSlot.date,
      startMinutes: creatingSlot.startMinutes,
      title,
      editingEvent: null,
    });
    setCreatingSlot(null);
  }

  function handleInlineResize(durationMinutes: number) {
    setCreatingSlot((prev) => prev ? { ...prev, durationMinutes } : null);
  }

  function handleInlineMove(startMinutes: number) {
    setCreatingSlot((prev) => prev ? { ...prev, startMinutes } : null);
  }

  function handleQuickUpdate(title: string) {
    if (!quickView) return;
    updateEvent(quickView.event.id, { title });
    toast.success("予定を更新しました");
  }

  function handleQuickDelete() {
    if (!quickView) return;
    deleteEvent(quickView.event.id);
    setQuickView(null);
    toast.success("予定を削除しました");
  }

  function handleQuickOpenDetail() {
    if (!quickView) return;
    setDetailDialog({
      open: true,
      date: quickView.event.date,
      startMinutes: quickView.event.startMinutes,
      title: quickView.event.title,
      editingEvent: quickView.event,
    });
  }

  async function handleDetailSave(event: ScheduleEvent) {
    if (detailDialog.editingEvent) {
      updateEvent(event.id, {
        title: event.title,
        date: event.date,
        startMinutes: event.startMinutes,
        durationMinutes: event.durationMinutes,
        projectId: event.projectId,
        taskId: event.taskId,
      });
      toast.success("予定を更新しました");
    } else {
      try {
        await createEvent({
          title: event.title,
          date: event.date,
          startMinutes: event.startMinutes,
          durationMinutes: event.durationMinutes,
          projectId: event.projectId,
          taskId: event.taskId,
        });
        toast.success(`「${event.title}」を追加しました`);
      } catch {
        toast.error("予定の追加に失敗しました");
      }
    }
  }

  function handleDetailDelete(id: string) {
    deleteEvent(id);
    toast.success("予定を削除しました");
  }

  function handleDropTask(taskId: string, title: string, date: string, startMinutes: number) {
    const durationMinutes = Math.min(DEFAULT_DURATION, TOTAL_HOURS * 60 - startMinutes);
    void createEvent({
      title,
      date,
      startMinutes,
      durationMinutes,
      taskId,
    }).then(() => {
      toast.success(`「${title}」をスケジュールに追加しました`);
    }).catch(() => {
      toast.error("スケジュールへの追加に失敗しました");
    });
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {dragging?.activated && (
        <div className="fixed inset-0 z-[9998] cursor-grabbing" style={{ userSelect: "none" }} />
      )}

      {/* ナビゲーションバー */}
      <div className="flex flex-shrink-0 items-center justify-between border-b px-4 py-2">
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => shiftWeek(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => setWeekStart(getWeekStart(new Date()))}
          >
            今週
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => shiftWeek(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <span className="text-sm font-medium">{formatWeekRange()}</span>
        <div className="w-28" />
      </div>

      {/* 曜日ヘッダー */}
      <div className="flex flex-shrink-0 border-b">
        <div style={{ width: GUTTER_W }} className="flex-shrink-0 border-r border-border/40" />
        {days.map((day, i) => (
          <div
            key={i}
            className={cn(
              "flex flex-1 flex-col items-center py-1.5 border-r border-border/40 last:border-r-0",
              isToday(day) && "bg-blue-50/50 dark:bg-blue-950/20"
            )}
          >
            <span className="text-xs text-muted-foreground">{DAYS_JA[i]}</span>
            <span
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium",
                isToday(day) && "bg-blue-500 text-white"
              )}
            >
              {day.getDate()}
            </span>
          </div>
        ))}
      </div>

      {/* スクロール可能なグリッド */}
      <div ref={gridRef} className="flex-1 overflow-y-auto">
        <div className="flex">
          {/* 時刻ラベル */}
          <div style={{ width: GUTTER_W }} className="flex-shrink-0 border-r border-border/40">
            {Array.from({ length: TOTAL_HOURS }, (_, h) => (
              <div
                key={h}
                style={{ height: HOUR_HEIGHT }}
                className="relative flex items-start justify-end pr-2"
              >
                {h > 0 && (
                  <span className="text-xs text-muted-foreground" style={{ marginTop: -8 }}>
                    {h}:00
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* 日ごとのカラム */}
          <div className="flex flex-1">
            {days.map((day, i) => {
              const dateStr = toDateStr(day);
              const dayEvents = displayEvents.filter((e) => e.date === dateStr);
              const dayGcalEvents = gcalEvents.filter((e) => e.date === dateStr);
              const isCreatingHere = creatingSlot?.date === dateStr;

              return (
                <DayColumn
                  key={i}
                  day={day}
                  events={dayEvents}
                  gcalEvents={dayGcalEvents}
                  currentMinutes={currentMinutes}
                  creatingSlot={isCreatingHere ? creatingSlot : null}
                  draggingEventId={dragging?.activated ? dragging.eventId : null}
                  onSlotClick={handleSlotClick}
                  onStartMove={startMoveDrag}
                  onStartResize={startResizeDrag}
                  onInlineSave={handleInlineSave}
                  onInlineCancel={() => setCreatingSlot(null)}
                  onInlineOpenDetail={handleInlineOpenDetail}
                  onInlineResize={handleInlineResize}
                  onInlineMove={handleInlineMove}
                  onDropTask={handleDropTask}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* クイックビュー */}
      {quickView && (
        <EventQuickView
          event={quickView.event}
          position={{ x: quickView.x, y: quickView.y }}
          onClose={() => setQuickView(null)}
          onUpdate={handleQuickUpdate}
          onDelete={handleQuickDelete}
          onOpenDetail={handleQuickOpenDetail}
        />
      )}

      {/* 詳細ダイアログ */}
      <EventDialog
        open={detailDialog.open}
        onClose={() => setDetailDialog((d) => ({ ...d, open: false }))}
        initialDate={detailDialog.date}
        initialStartMinutes={detailDialog.startMinutes}
        initialTitle={detailDialog.title}
        editingEvent={detailDialog.editingEvent}
        onSave={handleDetailSave}
        onDelete={handleDetailDelete}
      />
    </div>
  );
}
