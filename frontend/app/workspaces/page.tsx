"use client";

import { useState, useEffect } from "react";
import { WorkspaceSidebar, ALL_WORKSPACES_ID } from "@/components/workspaces/workspace-sidebar";
import { ProjectSection } from "@/components/projects/project-section";
import { useWorkspaceStore } from "@/lib/store/workspace-store";
import { useProjectStore } from "@/lib/store/project-store";
import { useTaskStore } from "@/lib/store/task-store";
import { Skeleton } from "@/components/ui/skeleton";
import { Layers, Star } from "lucide-react";
import { cn } from "@/lib/utils";

function WorkspacesPageSkeleton() {
  return (
    <div className="-m-6 flex h-[calc(100vh-3.5rem)]">
      {/* Sidebar */}
      <div className="flex h-full w-56 flex-shrink-0 flex-col border-r bg-muted/30">
        <div className="flex items-center gap-2 px-4 py-3">
          <Skeleton className="h-3.5 w-3.5 rounded" />
          <Skeleton className="h-3 w-20" />
        </div>
        <div className="flex-1 space-y-1 overflow-y-auto px-2 py-1">
          <Skeleton className="h-8 w-full rounded-md" />
          <div className="my-1 border-t" />
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-8 w-full rounded-md" />
          ))}
        </div>
      </div>
      {/* Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="border-b px-6 py-3">
          <Skeleton className="h-5 w-16" />
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-8">
          {[1, 2].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="mb-2 h-3 w-24" />
              {[1, 2, 3].map((j) => (
                <Skeleton key={j} className="h-9 w-full rounded-md" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function WorkspacesPage() {
  const { workspaces, loading: wsLoading, init: wsInit } = useWorkspaceStore();
  const { loading: pjLoading, init: pjInit } = useProjectStore();
  const { loading: tkLoading, init: tkInit } = useTaskStore();
  const [selectedId, setSelectedId] = useState<string>(ALL_WORKSPACES_ID);
  const [showOnlyThisWeek, setShowOnlyThisWeek] = useState(false);

  useEffect(() => {
    wsInit();
    pjInit();
    tkInit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (wsLoading || pjLoading || tkLoading) return <WorkspacesPageSkeleton />;

  const selectedWorkspace = workspaces.find((w) => w.id === selectedId);
  const isAll = selectedId === ALL_WORKSPACES_ID;

  function ThisWeekFilterButton() {
    return (
      <button
        onClick={() => setShowOnlyThisWeek((v) => !v)}
        className={cn(
          "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
          showOnlyThisWeek
            ? "bg-amber-400/20 text-amber-500 hover:bg-amber-400/30"
            : "text-muted-foreground hover:bg-accent hover:text-foreground"
        )}
        title="今週のタスクのみ表示"
      >
        <Star className={cn("h-3.5 w-3.5", showOnlyThisWeek && "fill-current text-amber-400")} />
        今週
      </button>
    );
  }

  return (
    <div className="-m-6 flex h-[calc(100vh-3.5rem)]">
      {/* Left: Workspace list */}
      <WorkspaceSidebar selectedId={selectedId} onSelect={setSelectedId} />

      {/* Right: Projects & Tasks */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {isAll ? (
          <>
            <div className="border-b px-6 py-3 flex items-center justify-between">
              <h1 className="text-base font-semibold">すべて</h1>
              <ThisWeekFilterButton />
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-8">
              {workspaces.length === 0 ? (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <Layers className="h-8 w-8 opacity-30" />
                    <p className="text-sm">Workspace を作成してください</p>
                  </div>
                </div>
              ) : (
                workspaces.map((ws) => (
                  <div key={ws.id}>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      {ws.name}
                    </p>
                    <ProjectSection
                      workspaceId={ws.id}
                      workspaceName={ws.name}
                      showOnlyThisWeek={showOnlyThisWeek}
                    />
                  </div>
                ))
              )}
            </div>
          </>
        ) : selectedWorkspace ? (
          <>
            <div className="border-b px-6 py-3 flex items-center justify-between">
              <h1 className="text-base font-semibold">{selectedWorkspace.name}</h1>
              <ThisWeekFilterButton />
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <ProjectSection
                workspaceId={selectedWorkspace.id}
                workspaceName={selectedWorkspace.name}
                showOnlyThisWeek={showOnlyThisWeek}
              />
            </div>
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <div className="flex flex-col items-center gap-2">
              <Layers className="h-8 w-8 opacity-30" />
              <p className="text-sm">Workspace を選択してください</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
