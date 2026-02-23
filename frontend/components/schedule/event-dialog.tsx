"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ScheduleEvent } from "@/lib/types";

export function formatTime(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60).toString().padStart(2, "0");
  const m = (totalMinutes % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

const TIME_OPTIONS = Array.from({ length: 24 * 4 }, (_, i) => ({
  value: i * 15,
  label: formatTime(i * 15),
}));

const DURATION_OPTIONS = [
  { value: 15, label: "15分" },
  { value: 30, label: "30分" },
  { value: 45, label: "45分" },
  { value: 60, label: "1時間" },
  { value: 90, label: "1時間30分" },
  { value: 120, label: "2時間" },
  { value: 150, label: "2時間30分" },
  { value: 180, label: "3時間" },
  { value: 240, label: "4時間" },
  { value: 360, label: "6時間" },
  { value: 480, label: "8時間" },
];

interface EventDialogProps {
  open: boolean;
  onClose: () => void;
  initialDate?: string;
  initialStartMinutes?: number;
  initialTitle?: string;
  editingEvent?: ScheduleEvent | null;
  onSave: (event: ScheduleEvent) => void;
  onDelete?: (id: string) => void;
}

const selectCls =
  "h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring";

export function EventDialog({
  open,
  onClose,
  initialDate,
  initialStartMinutes,
  initialTitle,
  editingEvent,
  onSave,
  onDelete,
}: EventDialogProps) {
  const today = new Date().toISOString().split("T")[0];

  const [title, setTitle] = useState("");
  const [date, setDate] = useState(today);
  const [startMinutes, setStartMinutes] = useState(9 * 60);
  const [durationMinutes, setDurationMinutes] = useState(60);

  useEffect(() => {
    if (!open) return;
    if (editingEvent) {
      setTitle(editingEvent.title);
      setDate(editingEvent.date);
      setStartMinutes(editingEvent.startMinutes);
      setDurationMinutes(editingEvent.durationMinutes);
    } else {
      setTitle(initialTitle ?? "");
      setDate(initialDate ?? today);
      setStartMinutes(initialStartMinutes ?? 9 * 60);
      setDurationMinutes(60);
    }
  }, [open, editingEvent, initialDate, initialStartMinutes, initialTitle, today]);

  function handleSave() {
    if (!title.trim()) {
      toast.error("タイトルを入力してください");
      return;
    }
    const now = new Date().toISOString();
    onSave({
      id: editingEvent?.id ?? crypto.randomUUID(),
      title: title.trim(),
      date,
      startMinutes,
      durationMinutes,
      createdAt: editingEvent?.createdAt ?? now,
      updatedAt: now,
    });
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{editingEvent ? "予定を編集" : "予定を追加"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>タイトル</Label>
            <Input
              autoFocus
              placeholder="予定のタイトル"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.nativeEvent.isComposing) handleSave();
              }}
            />
          </div>

          <div className="space-y-1.5">
            <Label>日付</Label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={selectCls}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>開始時間</Label>
              <select
                value={startMinutes}
                onChange={(e) => setStartMinutes(Number(e.target.value))}
                className={selectCls}
              >
                {TIME_OPTIONS.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label>時間</Label>
              <select
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className={selectCls}
              >
                {DURATION_OPTIONS.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-row items-center justify-between">
          {editingEvent && onDelete ? (
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive hover:text-destructive"
              onClick={() => {
                onDelete(editingEvent.id);
                onClose();
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          ) : (
            <div />
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              キャンセル
            </Button>
            <Button onClick={handleSave} disabled={!title.trim()}>
              {editingEvent ? "保存" : "追加"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
