"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { Plus, Trash2, Layers, LayoutGrid, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/lib/store/workspace-store";
import { useProjectStore } from "@/lib/store/project-store";
import { useTaskStore } from "@/lib/store/task-store";
import { WorkspaceDeleteDialog } from "./workspace-delete-dialog";
import { InlineEdit } from "@/components/shared/inline-edit";
import { Workspace } from "@/lib/types";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export const ALL_WORKSPACES_ID = "__all__";

interface WorkspaceSidebarProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
}

interface SortableWorkspaceItemProps {
  ws: Workspace;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDelete: (ws: Workspace) => void;
  onSave: (id: string, name: string) => void;
}

function SortableWorkspaceItem({ ws, selectedId, onSelect, onDelete, onSave }: SortableWorkspaceItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: ws.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
        selectedId === ws.id
          ? "bg-accent text-accent-foreground"
          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="flex-shrink-0 cursor-grab opacity-0 group-hover:opacity-40 hover:!opacity-70 active:cursor-grabbing"
        tabIndex={-1}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>

      <button
        className="min-w-0 flex-1 text-left"
        onClick={() => onSelect(ws.id)}
      >
        <InlineEdit
          value={ws.name}
          onSave={(name) => onSave(ws.id, name)}
          placeholder="名前なし"
          className="text-sm font-medium"
        />
      </button>
      <button
        className="flex-shrink-0 opacity-0 transition-opacity group-hover:opacity-60 hover:!opacity-100 hover:text-destructive"
        onClick={(e) => { e.stopPropagation(); onDelete(ws); }}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function WorkspaceSidebar({ selectedId, onSelect }: WorkspaceSidebarProps) {
  const { workspaces, createWorkspace, updateWorkspace, deleteWorkspace, reorderWorkspaces } = useWorkspaceStore();
  const { projects, deleteProjectsByWorkspace } = useProjectStore();
  const { deleteTasksByProjects } = useTaskStore();

  const [deleteTarget, setDeleteTarget] = useState<Workspace | null>(null);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const newInputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

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

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = workspaces.findIndex((w) => w.id === active.id);
    const newIndex = workspaces.findIndex((w) => w.id === over.id);
    const reordered = arrayMove(workspaces, oldIndex, newIndex);
    reorderWorkspaces(reordered.map((w) => w.id));
  }

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
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={workspaces.map((w) => w.id)}
            strategy={verticalListSortingStrategy}
          >
            {workspaces.map((ws) => (
              <SortableWorkspaceItem
                key={ws.id}
                ws={ws}
                selectedId={selectedId}
                onSelect={onSelect}
                onDelete={(ws) => setDeleteTarget(ws)}
                onSave={(id, name) => updateWorkspace(id, { name })}
              />
            ))}
          </SortableContext>
        </DndContext>

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
