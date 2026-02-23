import { create } from "zustand";
import { toast } from "sonner";
import { GoogleCalendarAccount, GoogleCalendarCalendar, GoogleCalendarEvent } from "@/lib/types";
import { googleCalendarApi } from "@/lib/api";

interface DateRange {
  dateFrom?: string;
  dateTo?: string;
}

interface GoogleCalendarStore {
  accounts: GoogleCalendarAccount[];
  calendars: Record<string, GoogleCalendarCalendar[]>; // accountId -> calendars
  events: GoogleCalendarEvent[];
  loadingAccounts: boolean;
  loadingEvents: boolean;
  currentDateRange: DateRange;

  initAccounts: () => Promise<void>;
  connectAccount: () => Promise<void>;
  disconnectAccount: (accountId: string) => Promise<void>;

  loadCalendars: (accountId: string) => Promise<void>;
  toggleCalendar: (accountId: string, calendarId: string, enabled: boolean) => Promise<void>;

  loadEvents: (params?: DateRange) => Promise<void>;
}

export const useGoogleCalendarStore = create<GoogleCalendarStore>((set, get) => ({
  accounts: [],
  calendars: {},
  events: [],
  loadingAccounts: false,
  loadingEvents: false,
  currentDateRange: {},

  initAccounts: async () => {
    set({ loadingAccounts: true });
    try {
      const accounts = await googleCalendarApi.listAccounts();
      set({ accounts, loadingAccounts: false });
    } catch {
      set({ loadingAccounts: false });
      toast.error("Googleアカウントの読み込みに失敗しました");
    }
  },

  connectAccount: async () => {
    try {
      const { url } = await googleCalendarApi.getAuthUrl();
      const popup = window.open(url, "google_oauth", "width=600,height=700,left=200,top=100");
      if (!popup) {
        toast.error("ポップアップがブロックされました。ポップアップを許可してください。");
        return;
      }

      await new Promise<void>((resolve) => {
        const handleMessage = (e: MessageEvent) => {
          if (e.data?.type === "google_calendar_connected") {
            window.removeEventListener("message", handleMessage);
            resolve();
          }
        };
        window.addEventListener("message", handleMessage);

        const timer = setInterval(() => {
          if (popup.closed) {
            clearInterval(timer);
            window.removeEventListener("message", handleMessage);
            resolve();
          }
        }, 500);
      });

      await get().initAccounts();
      toast.success("Googleアカウントを連携しました");
    } catch {
      toast.error("Google連携に失敗しました");
    }
  },

  disconnectAccount: async (accountId) => {
    try {
      await googleCalendarApi.deleteAccount(accountId);
      set((state) => ({
        accounts: state.accounts.filter((a) => a.id !== accountId),
        calendars: Object.fromEntries(
          Object.entries(state.calendars).filter(([k]) => k !== accountId)
        ),
        events: state.events.filter((e) => e.googleAccountId !== accountId),
      }));
      toast.success("Googleアカウントの連携を解除しました");
    } catch {
      toast.error("連携解除に失敗しました");
    }
  },

  loadCalendars: async (accountId) => {
    try {
      const calendars = await googleCalendarApi.listCalendars(accountId);
      set((state) => ({
        calendars: { ...state.calendars, [accountId]: calendars },
      }));
    } catch {
      toast.error("カレンダー一覧の取得に失敗しました");
    }
  },

  toggleCalendar: async (accountId, calendarId, enabled) => {
    // Optimistic update
    set((state) => ({
      calendars: {
        ...state.calendars,
        [accountId]: (state.calendars[accountId] ?? []).map((c) =>
          c.calendarId === calendarId ? { ...c, enabled } : c
        ),
      },
    }));
    try {
      const cals = get().calendars[accountId] ?? [];
      const cal = cals.find((c) => c.calendarId === calendarId);
      await googleCalendarApi.updateCalendar(accountId, calendarId, {
        enabled,
        name: cal?.name,
        color: cal?.color,
      });
      // カレンダーの有効/無効変更後にイベントを再読み込み
      await get().loadEvents(get().currentDateRange);
    } catch {
      // Revert
      set((state) => ({
        calendars: {
          ...state.calendars,
          [accountId]: (state.calendars[accountId] ?? []).map((c) =>
            c.calendarId === calendarId ? { ...c, enabled: !enabled } : c
          ),
        },
      }));
      toast.error("カレンダーの設定に失敗しました");
    }
  },

  loadEvents: async (params) => {
    set({ loadingEvents: true, currentDateRange: params ?? {} });
    try {
      const events = await googleCalendarApi.listEvents(params);
      set({ events, loadingEvents: false });
    } catch {
      set({ loadingEvents: false });
    }
  },
}));
