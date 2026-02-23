"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

export default function GoogleCallbackPage() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const connected = searchParams.get("google_connected");
    const error = searchParams.get("google_error");

    if (window.opener) {
      window.opener.postMessage(
        {
          type: "google_calendar_connected",
          success: !!connected,
          error: error ?? null,
        },
        window.location.origin
      );
      window.close();
    } else {
      // ポップアップではなく直接アクセスされた場合はスケジュールページへ
      window.location.href = `/schedule${connected ? "?google_connected=true" : ""}`;
    }
  }, [searchParams]);

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
        <p className="text-sm text-muted-foreground">Googleアカウントを連携中...</p>
      </div>
    </div>
  );
}
