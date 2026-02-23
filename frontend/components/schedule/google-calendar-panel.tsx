"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Loader2, LogOut, Plus, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useGoogleCalendarStore } from "@/lib/store/google-calendar-store";
import { GoogleCalendarAccount } from "@/lib/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

function AccountCalendars({ account }: { account: GoogleCalendarAccount }) {
  const { calendars, loadCalendars, toggleCalendar } = useGoogleCalendarStore();
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);

  const accountCalendars = calendars[account.id] ?? null;
  const hasNoEnabledCalendars =
    accountCalendars !== null && accountCalendars.every((c) => !c.enabled);

  // 初回マウント時にカレンダー一覧を自動取得
  useEffect(() => {
    if (accountCalendars === null) {
      setLoading(true);
      loadCalendars(account.id).finally(() => setLoading(false));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account.id]);

  async function handleExpand() {
    const next = !expanded;
    setExpanded(next);
    if (next && accountCalendars === null) {
      setLoading(true);
      await loadCalendars(account.id);
      setLoading(false);
    }
  }

  async function handleRefresh() {
    setLoading(true);
    await loadCalendars(account.id);
    setLoading(false);
  }

  async function handleEnableAll() {
    if (!accountCalendars) return;
    await Promise.all(
      accountCalendars
        .filter((c) => !c.enabled)
        .map((c) => toggleCalendar(account.id, c.calendarId, true))
    );
  }

  return (
    <div>
      <button
        onClick={handleExpand}
        className="flex w-full items-center gap-1.5 rounded px-1 py-0.5 text-left text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        {expanded ? (
          <ChevronDown className="h-3 w-3 flex-shrink-0" />
        ) : (
          <ChevronRight className="h-3 w-3 flex-shrink-0" />
        )}
        <span className="truncate">カレンダーを管理</span>
        {loading && <Loader2 className="ml-auto h-3 w-3 animate-spin" />}
      </button>

      {expanded && (
        <div className="mt-1 space-y-1 pl-4">
          {loading && !accountCalendars ? (
            <>
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-3/4" />
            </>
          ) : accountCalendars && accountCalendars.length > 0 ? (
            <>
              {/* 全カレンダーが無効な場合のガイド */}
              {hasNoEnabledCalendars && (
                <div className="mb-1.5 rounded bg-amber-50 dark:bg-amber-950/30 px-2 py-1.5">
                  <p className="text-[10px] text-amber-700 dark:text-amber-400 leading-tight mb-1">
                    カレンダーを有効化すると予定が表示されます
                  </p>
                  <button
                    onClick={handleEnableAll}
                    className="text-[10px] font-medium text-amber-700 dark:text-amber-400 underline hover:no-underline"
                  >
                    すべて有効化
                  </button>
                </div>
              )}
              {accountCalendars.map((cal) => (
                <div key={cal.calendarId} className="flex items-center gap-2">
                  <div
                    className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                    style={{ backgroundColor: cal.color }}
                  />
                  <span className="min-w-0 flex-1 truncate text-xs">{cal.name}</span>
                  <Switch
                    checked={cal.enabled}
                    onCheckedChange={(checked: boolean) =>
                      toggleCalendar(account.id, cal.calendarId, checked)
                    }
                    className="h-3.5 w-6 [&>span]:h-3 [&>span]:w-3"
                  />
                </div>
              ))}
              <button
                onClick={handleRefresh}
                className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground/60 hover:text-muted-foreground"
              >
                <RefreshCw className="h-2.5 w-2.5" />
                更新
              </button>
            </>
          ) : (
            <p className="text-[11px] text-muted-foreground/60">カレンダーなし</p>
          )}
        </div>
      )}
    </div>
  );
}

function AccountRow({ account }: { account: GoogleCalendarAccount }) {
  const { disconnectAccount } = useGoogleCalendarStore();

  return (
    <div className="rounded-md border bg-card p-2.5">
      <div className="flex items-center gap-2">
        {account.pictureUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={account.pictureUrl}
            alt={account.name ?? account.email}
            className="h-6 w-6 rounded-full"
          />
        ) : (
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[10px] font-semibold uppercase">
            {account.email[0]}
          </div>
        )}
        <div className="min-w-0 flex-1">
          {account.name && (
            <p className="truncate text-xs font-medium">{account.name}</p>
          )}
          <p className={cn("truncate text-muted-foreground", account.name ? "text-[10px]" : "text-xs")}>
            {account.email}
          </p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button className="flex-shrink-0 rounded p-0.5 text-muted-foreground/40 transition-colors hover:text-destructive">
              <LogOut className="h-3 w-3" />
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Google連携を解除しますか？</AlertDialogTitle>
              <AlertDialogDescription>
                {account.email} のGoogleカレンダー連携を解除します。
                カレンダーのイベントはスケジュールから非表示になります。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>キャンセル</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => disconnectAccount(account.id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                解除する
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      <div className="mt-2">
        <AccountCalendars account={account} />
      </div>
    </div>
  );
}

export function GoogleCalendarPanel() {
  const { accounts, loadingAccounts, initAccounts, connectAccount } = useGoogleCalendarStore();
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    initAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleConnect() {
    setConnecting(true);
    await connectAccount();
    setConnecting(false);
  }

  return (
    <div className="flex flex-shrink-0 flex-col border-t">
      {/* ヘッダー */}
      <div className="flex items-center gap-2 px-4 py-2.5">
        <GoogleIcon className="h-3.5 w-3.5 flex-shrink-0" />
        <span className="text-xs font-semibold">Googleカレンダー</span>
        <Button
          size="sm"
          variant="ghost"
          className="ml-auto h-6 w-6 p-0"
          onClick={handleConnect}
          disabled={connecting}
          title="アカウントを追加"
        >
          {connecting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Plus className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>

      {/* アカウント一覧 */}
      <div className="px-3 pb-3 space-y-2">
        {loadingAccounts ? (
          <>
            <Skeleton className="h-16 w-full rounded-md" />
          </>
        ) : accounts.length === 0 ? (
          <div className="rounded-md border border-dashed p-3 text-center">
            <GoogleIcon className="mx-auto mb-1.5 h-5 w-5" />
            <p className="text-xs text-muted-foreground">
              Googleアカウントを連携すると
              <br />
              カレンダーが表示されます
            </p>
            <Button
              size="sm"
              variant="outline"
              className="mt-2 h-7 text-xs"
              onClick={handleConnect}
              disabled={connecting}
            >
              {connecting ? (
                <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
              ) : (
                <GoogleIcon className="mr-1.5 h-3 w-3" />
              )}
              アカウントを連携
            </Button>
          </div>
        ) : (
          accounts.map((account) => (
            <AccountRow key={account.id} account={account} />
          ))
        )}
      </div>
    </div>
  );
}
