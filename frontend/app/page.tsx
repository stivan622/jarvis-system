import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Layers, FolderOpen, CheckSquare, Bot } from "lucide-react";
import Link from "next/link";

const features = [
  {
    href: "/workspaces",
    icon: Layers,
    title: "Workspace",
    description: "作業空間を管理・切り替えます",
    status: "利用可能",
  },
  {
    href: "/projects",
    icon: FolderOpen,
    title: "プロジェクト",
    description: "Workspace 内のプロジェクトを管理します",
    status: "利用可能",
  },
  {
    href: "/tasks",
    icon: CheckSquare,
    title: "タスク",
    description: "カンバンボードでタスクを管理します",
    status: "利用可能",
  },
  {
    href: "/agents",
    icon: Bot,
    title: "エージェント",
    description: "Claude Code / Codex を並列実行します",
    status: "近日公開",
  },
];

export default function HomePage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Jarvis System</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          個人専用エージェント管理プラットフォーム
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {features.map(({ href, icon: Icon, title, description, status }) => {
          const available = status === "利用可能";
          return (
            <Link key={href} href={available ? href : "#"}>
              <Card
                className={`transition-colors ${
                  available
                    ? "hover:bg-accent cursor-pointer"
                    : "opacity-60 cursor-not-allowed"
                }`}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-base font-semibold">{title}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant={available ? "default" : "secondary"}>
                      {status}
                    </Badge>
                    <Icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription>{description}</CardDescription>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
