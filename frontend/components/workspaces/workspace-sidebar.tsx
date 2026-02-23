"use client";

import { useState, useRef, useEffect, KeyboardEvent, DragEvent } from "react";
import { Plus, Trash2, Layers, LayoutGrid, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/lib/store/workspace-store";
import { useProjectStore } from "@/lib/store/project-store";
import { useTaskStore } from "@/lib/store/task-store";
import { WorkspaceDeleteDialog } from "./workspace-delete-dialog";
import { InlineEdit } from "@/components/shared/inline-edit";
import { Workspace } from "@/lib/types";

export const ALL_WORKSPACES_ID = "__all__";

interface WorkspaceSidebarProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function WorkspaceSidebar({ selectedId, onSelect }: WorkspaceSidebarProps) {
  const { workspaces, createWorkspace, updateWorkspace, deleteWorkspace, reorderWorkspaces } = useWorkspaceStore();
  const { projects, deleteProjectsByWorkspace, moveProject } = useProjectStore();
  const { deleteTasksByProjects } = useTaskStore();

  const [deleteTarget, setDeleteTarget] = useState<Workspace | null>(null);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const newInputRef = useRef<HTMLInputElement>(null);

  // Drag state
  const [dragWsId, setDragWsId] = useState<string | null>(null);
  const [dragOverWsId, setDragOverWsId] = useState<string | null>(null);

  useEffect(() => {
    if (adding) newInputRef.current?.focus();
  }, [adding]);

  async function commitAdd() {
    const trimmed = newName.trim();
    setNewName("");
    setAdding(false);
    if (trimmed) {
      try {
        const ws = await createWorkspace({ name: trimmed });
        onSelect(ws.id);
        toast.success(`「${trimmed}」を作成しました`);
      } catch {
        toast.error("ワークスペースの作成に失敗しました");
      }
    }
  }

  function handleAddKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.nativeEvent.isComposing) { void commitAdd(); }
    if (e.key === "Escape") { setNewName(""); setAdding(false); }
  }

  function handleDeleteConfirm(id: string) {
    const projectIds = deleteProjectsByWorkspace(id);
    deleteTasksByProjects(projectIds);
    deleteWorkspace(id);
    if (selectedId === id) {
      const remaining = workspaces.filter((w) => w.id !== id);
      onSelect(remaining[0]?.id ?? ALL_WORKSPACES_ID);
    }
    toast.success("ワークスペースを削除しました");
    setDeleteTarget(null);
  }

  // ---- Workspace drag handlers ----

  function handleDragStart(e: DragEvent, wsId: string) {
    setDragWsId(wsId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("application/jarvis-workspace", wsId);
  }

  function handleDragOver(e: DragEvent, wsId: string) {
    if (!dragWsId) return;

    // Allow dropping a project onto a workspace
    const projectId = e.dataTransfer.types.includes("application/jarvis-project")
      ? e.dataTransfer.getData("application/jarvis-project")
      : null;
    if (projectId) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setDragOverWsId(wsId);
      return;
    }

    if (dragWsId === wsId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverWsId(wsId);
  }

  function handleDrop(e: DragEvent, targetWsId: string) {
    e.preventDefault();

    // Project dropped onto workspace → move project
    const projectId = e.dataTransfer.getData("application/jarvis-project");
    if (projectId) {
      moveProject(projectId, targetWsId);
      toast.success("プロジェクトを移動しました");
      setDragOverWsId(null);
      return;
    }

    // Workspace reorder
    if (!dragWsId || dragWsId === targetWsId) return;

    const sortedWorkspaces = [...workspaces].sort((a, b) => a.position - b.position);
    const ids = sortedWorkspaces.map((w) => w.id);
    const fromIdx = ids.indexOf(dragWsId);
    const toIdx = ids.indexOf(targetWsId);
    if (fromIdx === -1 || toIdx === -1) return;

    const newIds = [...ids];
    newIds.splice(fromIdx, 1);
    newIds.splice(toIdx, 0, dragWsId);
    reorderWorkspaces(newIds);

    setDragWsId(null);
    setDragOverWsId(null);
  }

  function handleDragEnd() {
    setDragWsId(null);
    setDragOverWsId(null);
  }

  const sortedWorkspaces = [...workspaces].sort((a, b) => a.position - b.position);

  return (
    <aside className="flex h-full w-56 flex-shrink-0 flex-col border-r bg-muted/30">
      <div className="flex items-center gap-2 px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        <Layers className="h-3.5 w-3.5" />
        Workspaces
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-1">
        {/* すべて */}
        <button
          onClick={() => onSelect(ALL_WORKSPACES_ID)}
          className={cn(
            "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
            selectedId === ALL_WORKSPACES_ID
              ? "bg-accent text-accent-foreground font-medium"
              : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
          )}
        >
          <LayoutGrid className="h-3.5 w-3.5 flex-shrink-0" />
          すべて
        </button>

        <div className="my-1 border-t" />

        {/* 個別 Workspace */}
        {sortedWorkspaces.map((ws) => (
          <div
            key={ws.id}
            className={cn(
              "group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
              selectedId === ws.id
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
              dragWsId === ws.id && "opacity-40",
              dragOverWsId === ws.id && "ring-1 ring-primary/50 bg-accent/70"
            )}
            onDragOver={(e) => handleDragOver(e, ws.id)}
            onDrop={(e) => handleDrop(e, ws.id)}
          >
            <div
              className="flex-shrink-0 cursor-grab opacity-0 group-hover:opacity-40 active:cursor-grabbing"
              draggable
              onDragStart={(e) => handleDragStart(e, ws.id)}
              onDragEnd={handleDragEnd}
            >
              <GripVertical className="h-3.5 w-3.5" />
            </div>

            <button
              className="min-w-0 flex-1 text-left"
              onClick={() => onSelect(ws.id)}
            >
              <InlineEdit
                value={ws.name}
                onSave={(name) => updateWorkspace(ws.id, { name })}
                onDelete={() => setDeleteTarget(ws)}
                placeholder="名前なし"
                className="text-sm font-medium"
              />
            </button>
            <button
              className="flex-shrink-0 opacity-0 transition-opacity group-hover:opacity-60 hover:!opacity-100 hover:text-destructive"
              onClick={(e) => { e.stopPropagation(); setDeleteTarget(ws); }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}

        {/* 新規追加 */}
        {adding ? (
          <div className="flex items-center gap-2 rounded-md px-2 py-1.5">
            <input
              ref={newInputRef}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onBlur={() => void commitAdd()}
              onKeyDown={handleAddKeyDown}
              placeholder="Workspace 名..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
          >
            <Plus className="h-3.5 w-3.5" />
            追加
          </button>
        )}
      </div>

      <WorkspaceDeleteDialog
        workspace={deleteTarget}
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
      />
    </aside>
  );
}
