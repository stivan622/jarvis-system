"use client";

import { useState, useEffect } from "react";
import { WorkspaceSidebar, ALL_WORKSPACES_ID } from "@/components/workspaces/workspace-sidebar";
import { ProjectSection } from "@/components/projects/project-section";
import { useWorkspaceStore } from "@/lib/store/workspace-store";
import { Layers } from "lucide-react";

export default function WorkspacesPage() {
  const { workspaces } = useWorkspaceStore();
  const [selectedId, setSelectedId] = useState<string>(ALL_WORKSPACES_ID);

  // ワークスペースが追加されたとき、まだ何も選択されていなければ先頭を選択
  useEffect(() => {
    if (selectedId === ALL_WORKSPACES_ID && workspaces.length === 0) return;
  }, [workspaces, selectedId]);

  const selectedWorkspace = workspaces.find((w) => w.id === selectedId);
  const isAll = selectedId === ALL_WORKSPACES_ID;

  return (
    <div className="-m-6 flex h-[calc(100vh-3.5rem)]">
      {/* Left: Workspace list */}
      <WorkspaceSidebar selectedId={selectedId} onSelect={setSelectedId} />

      {/* Right: Projects & Tasks */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {isAll ? (
          <>
            <div className="border-b px-6 py-3">
              <h1 className="text-base font-semibold">すべて</h1>
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
                    <ProjectSection workspaceId={ws.id} workspaceName={ws.name} />
                  </div>
                ))
              )}
            </div>
          </>
        ) : selectedWorkspace ? (
          <>
            <div className="border-b px-6 py-3">
              <h1 className="text-base font-semibold">{selectedWorkspace.name}</h1>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <ProjectSection
                workspaceId={selectedWorkspace.id}
                workspaceName={selectedWorkspace.name}
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
