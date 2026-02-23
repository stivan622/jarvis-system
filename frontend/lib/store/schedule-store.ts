import { create } from "zustand";
import { toast } from "sonner";
import { ScheduleEvent } from "@/lib/types";
import { scheduleEventsApi, googleCalendarApi } from "@/lib/api";

interface ScheduleStore {
  events: ScheduleEvent[];
  loading: boolean;
  init: (params?: { dateFrom?: string; dateTo?: string }) => Promise<void>;
  createEvent: (data: Omit<ScheduleEvent, "id" | "createdAt" | "updatedAt">) => Promise<ScheduleEvent>;
  updateEvent: (id: string, data: Partial<Omit<ScheduleEvent, "id" | "createdAt" | "updatedAt">>) => void;
  deleteEvent: (id: string) => void;
}

export const useScheduleStore = create<ScheduleStore>((set, get) => ({
  events: [],
  loading: true,

  init: async (params) => {
    set({ loading: true });
    try {
      const [localResult, googleResult] = await Promise.allSettled([
        scheduleEventsApi.list(params),
        googleCalendarApi.list(params),
      ]);

      const local = localResult.status === "fulfilled" ? localResult.value : [];
      const google = googleResult.status === "fulfilled" ? googleResult.value : [];

      if (googleResult.status === "rejected") {
        console.warn("Google Calendar fetch failed:", googleResult.reason);
      }

      const taggedLocal = local.map((e) => ({ ...e, source: "local" as const }));
      const taggedGoogle = google.map((e) => ({ ...e, source: "google" as const }));

      set({ events: [...taggedLocal, ...taggedGoogle], loading: false });
    } catch {
      set({ loading: false });
      toast.error("スケジュールの読み込みに失敗しました");
    }
  },

  createEvent: async (data) => {
    const event = await scheduleEventsApi.create(data);
    set((state) => ({ events: [...state.events, { ...event, source: "local" as const }] }));
    return event;
  },

  updateEvent: (id, data) => {
    const target = get().events.find((e) => e.id === id);
    if (target?.source === "google") return;

    const old = target;
    set((state) => ({
      events: state.events.map((e) =>
        e.id === id ? { ...e, ...data } : e
      ),
    }));
    scheduleEventsApi.update(id, data).then((updated) => {
      set((state) => ({
        events: state.events.map((e) => (e.id === id ? { ...updated, source: "local" as const } : e)),
      }));
    }).catch(() => {
      if (old) {
        set((state) => ({
          events: state.events.map((e) => (e.id === id ? old : e)),
        }));
      }
      toast.error("予定の更新に失敗しました");
    });
  },

  deleteEvent: (id) => {
    const target = get().events.find((e) => e.id === id);
    if (target?.source === "google") return;

    const old = target;
    set((state) => ({ events: state.events.filter((e) => e.id !== id) }));
    scheduleEventsApi.delete(id).catch(() => {
      if (old) {
        set((state) => ({ events: [...state.events, old] }));
      }
      toast.error("予定の削除に失敗しました");
    });
  },
}));
