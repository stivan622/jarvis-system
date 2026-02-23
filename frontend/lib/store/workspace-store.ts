import { create } from "zustand";
import { toast } from "sonner";
import { Workspace } from "@/lib/types";
import { workspacesApi } from "@/lib/api";

interface WorkspaceStore {
  workspaces: Workspace[];
  loading: boolean;
  init: () => Promise<void>;
  createWorkspace: (data: Pick<Workspace, "name">) => Promise<Workspace>;
  updateWorkspace: (id: string, data: Partial<Pick<Workspace, "name">>) => Promise<void>;
  deleteWorkspace: (id: string) => void;
  reorderWorkspaces: (orderedIds: string[]) => void;
  getWorkspace: (id: string) => Workspace | undefined;
}

export const useWorkspaceStore = create<WorkspaceStore>((set, get) => ({
  workspaces: [],
  loading: true,

  init: async () => {
    set({ loading: true });
    try {
      const workspaces = await workspacesApi.list();
      set({ workspaces, loading: false });
    } catch {
      set({ loading: false });
      toast.error("ワークスペースの読み込みに失敗しました");
    }
  },

  createWorkspace: async (data) => {
    const workspace = await workspacesApi.create(data);
    set((state) => ({ workspaces: [...state.workspaces, workspace] }));
    return workspace;
  },

  updateWorkspace: async (id, data) => {
    const old = get().workspaces.find((w) => w.id === id);
    set((state) => ({
      workspaces: state.workspaces.map((w) =>
        w.id === id ? { ...w, ...data } : w
      ),
    }));
    try {
      const updated = await workspacesApi.update(id, data as Pick<Workspace, "name">);
      set((state) => ({
        workspaces: state.workspaces.map((w) => (w.id === id ? updated : w)),
      }));
    } catch {
      if (old) {
        set((state) => ({
          workspaces: state.workspaces.map((w) => (w.id === id ? old : w)),
        }));
      }
      toast.error("ワークスペースの更新に失敗しました");
    }
  },

  reorderWorkspaces: (orderedIds) => {
    const updated = orderedIds.map((id, index) => ({ id, position: index }));
    set((state) => {
      const posMap = new Map(updated.map((u) => [u.id, u.position]));
      return {
        workspaces: [...state.workspaces].sort((a, b) => {
          const pa = posMap.get(a.id) ?? a.position;
          const pb = posMap.get(b.id) ?? b.position;
          return pa - pb;
        }).map((w) => {
          const pos = posMap.get(w.id);
          return pos !== undefined ? { ...w, position: pos } : w;
        }),
      };
    });
    updated.forEach(({ id, position }) => {
      workspacesApi.updatePosition(id, position).catch(() => {
        toast.error("ワークスペースの並び替えに失敗しました");
      });
    });
  },

  deleteWorkspace: (id) => {
    const old = get().workspaces.find((w) => w.id === id);
    set((state) => ({
      workspaces: state.workspaces.filter((w) => w.id !== id),
    }));
    workspacesApi.delete(id).catch(() => {
      if (old) {
        set((state) => ({ workspaces: [...state.workspaces, old] }));
      }
      toast.error("ワークスペースの削除に失敗しました");
    });
  },

  getWorkspace: (id) => get().workspaces.find((w) => w.id === id),
}));
