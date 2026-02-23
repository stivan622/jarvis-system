import { create } from "zustand";
import { toast } from "sonner";
import { Project } from "@/lib/types";
import { projectsApi } from "@/lib/api";

interface ProjectStore {
  projects: Project[];
  loading: boolean;
  init: () => Promise<void>;
  createProject: (workspaceId: string, name: string) => Promise<Project>;
  updateProject: (id: string, data: Partial<Pick<Project, "name" | "workspaceId">>) => Promise<void>;
  deleteProject: (id: string) => void;
  reorderProjects: (workspaceId: string, orderedIds: string[]) => void;
  moveProject: (id: string, toWorkspaceId: string) => void;
  /** Backend cascades, so this is local-state cleanup only. Returns removed project IDs. */
  deleteProjectsByWorkspace: (workspaceId: string) => string[];
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  projects: [],
  loading: true,

  init: async () => {
    set({ loading: true });
    try {
      const projects = await projectsApi.list();
      set({ projects, loading: false });
    } catch {
      set({ loading: false });
      toast.error("プロジェクトの読み込みに失敗しました");
    }
  },

  createProject: async (workspaceId, name) => {
    const project = await projectsApi.create({ workspaceId, name });
    set((state) => ({ projects: [...state.projects, project] }));
    return project;
  },

  updateProject: async (id, data) => {
    const old = get().projects.find((p) => p.id === id);
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === id ? { ...p, ...data } : p
      ),
    }));
    try {
      const updated = await projectsApi.update(id, data);
      set((state) => ({
        projects: state.projects.map((p) => (p.id === id ? updated : p)),
      }));
    } catch {
      if (old) {
        set((state) => ({
          projects: state.projects.map((p) => (p.id === id ? old : p)),
        }));
      }
      toast.error("プロジェクトの更新に失敗しました");
    }
  },

  reorderProjects: (workspaceId, orderedIds) => {
    const updated = orderedIds.map((id, index) => ({ id, position: index }));
    set((state) => {
      const posMap = new Map(updated.map((u) => [u.id, u.position]));
      return {
        projects: state.projects.map((p) => {
          const pos = posMap.get(p.id);
          return pos !== undefined ? { ...p, position: pos } : p;
        }),
      };
    });
    updated.forEach(({ id, position }) => {
      projectsApi.update(id, { position }).catch(() => {
        toast.error("プロジェクトの並び替えに失敗しました");
      });
    });
    void workspaceId;
  },

  moveProject: (id, toWorkspaceId) => {
    const old = get().projects.find((p) => p.id === id);
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === id ? { ...p, workspaceId: toWorkspaceId } : p
      ),
    }));
    projectsApi.update(id, { workspaceId: toWorkspaceId }).catch(() => {
      if (old) {
        set((state) => ({
          projects: state.projects.map((p) => (p.id === id ? old : p)),
        }));
      }
      toast.error("プロジェクトの移動に失敗しました");
    });
  },

  deleteProject: (id) => {
    const old = get().projects.find((p) => p.id === id);
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== id),
    }));
    projectsApi.delete(id).catch(() => {
      if (old) {
        set((state) => ({ projects: [...state.projects, old] }));
      }
      toast.error("プロジェクトの削除に失敗しました");
    });
  },

  deleteProjectsByWorkspace: (workspaceId) => {
    const ids = get()
      .projects.filter((p) => p.workspaceId === workspaceId)
      .map((p) => p.id);
    set((state) => ({
      projects: state.projects.filter((p) => p.workspaceId !== workspaceId),
    }));
    return ids;
  },
}));
