"use client";

import { usePathname } from "next/navigation";
import { Separator } from "@/components/ui/separator";

const breadcrumbMap: Record<string, string> = {
  "/": "ダッシュボード",
  "/workspaces": "Workspace",
  "/projects": "プロジェクト",
  "/tasks": "タスク",
  "/agents": "エージェント",
  "/resources": "リソース",
  "/settings": "設定",
};

function getPageTitle(pathname: string): string {
  const exact = breadcrumbMap[pathname];
  if (exact) return exact;

  const segments = pathname.split("/").filter(Boolean);
  const base = breadcrumbMap[`/${segments[0]}`];
  if (!base) return "Jarvis";

  if (segments.length === 2) return `${base} 詳細`;
  return base;
}

export function Header() {
  const pathname = usePathname();
  const title = getPageTitle(pathname);

  return (
    <header className="fixed left-16 right-0 top-0 z-30 flex h-14 items-center border-b bg-background px-6">
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold tracking-tight">{title}</span>
        <Separator orientation="vertical" className="h-4" />
        <span className="text-xs text-muted-foreground">Jarvis System</span>
      </div>
    </header>
  );
}
