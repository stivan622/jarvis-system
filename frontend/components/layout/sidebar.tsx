"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Layers,
  CalendarDays,
  Bot,
  Users,
  Settings,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const navItems = [
  { href: "/", label: "ダッシュボード", icon: LayoutDashboard },
  { href: "/workspaces", label: "Workspace", icon: Layers },
  { href: "/schedule", label: "スケジュール", icon: CalendarDays },
  { href: "/agents", label: "エージェント", icon: Bot, disabled: true },
  { href: "/resources", label: "リソース", icon: Users, disabled: true },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-16 flex-col border-r bg-background">
      {/* ロゴ */}
      <div className="flex h-14 items-center justify-center border-b">
        <Zap className="h-6 w-6 text-primary" />
      </div>

      {/* ナビゲーション */}
      <nav className="flex flex-1 flex-col items-center gap-1 py-4">
        {navItems.map(({ href, label, icon: Icon, disabled }) => {
          const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Tooltip key={href} delayDuration={0}>
              <TooltipTrigger asChild>
                <Link
                  href={disabled ? "#" : href}
                  aria-disabled={disabled}
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                    disabled && "pointer-events-none opacity-40"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span className="sr-only">{label}</span>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">
                {label}
                {disabled && <span className="ml-1 text-xs text-muted-foreground">(近日公開)</span>}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </nav>

      {/* 設定 */}
      <div className="flex flex-col items-center gap-1 border-t py-4">
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <Link
              href="/settings"
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
                pathname === "/settings"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Settings className="h-5 w-5" />
              <span className="sr-only">設定</span>
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right">設定</TooltipContent>
        </Tooltip>
      </div>
    </aside>
  );
}
