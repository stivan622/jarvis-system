import { create } from "zustand";
import { toast } from "sonner";
import { Task } from "@/lib/types";
import { tasksApi } from "@/lib/api";

interface TaskStore {
  tasks: Task[];
  loading: boolean;
  init: () => Promise<void>;
  createTask: (projectId: string, title: string) => Promise<Task>;
  updateTask: (id: string, data: Partial<Pick<Task, "title" | "done" | "thisWeek">>) => void;
  deleteTask: (id: string) => void;
  /** Backend cascades, so these are local-state cleanup only. */
  deleteTasksByProject: (projectId: string) => void;
  deleteTasksByProjects: (projectIds: string[]) => void;
  reorderTasks: (ids: string[]) => void;
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: [],
  loading: true,

  init: async () => {
    set({ loading: true });
    try {
      const tasks = await tasksApi.list();
      set({ tasks, loading: false });
    } catch {
      set({ loading: false });
      toast.error("タスクの読み込みに失敗しました");
    }
  },

  createTask: async (projectId, title) => {
    const task = await tasksApi.create({ projectId, title });
    set((state) => ({ tasks: [...state.tasks, task] }));
    return task;
  },

  updateTask: (id, data) => {
    const old = get().tasks.find((t) => t.id === id);
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...data } : t)),
    }));
    tasksApi.update(id, data).then((updated) => {
      set((state) => ({
        tasks: state.tasks.map((t) => (t.id === id ? updated : t)),
      }));
    }).catch(() => {
      if (old) {
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === id ? old : t)),
        }));
      }
      toast.error("タスクの更新に失敗しました");
    });
  },

  deleteTask: (id) => {
    const old = get().tasks.find((t) => t.id === id);
    set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) }));
    tasksApi.delete(id).catch(() => {
      if (old) {
        set((state) => ({ tasks: [...state.tasks, old] }));
      }
      toast.error("タスクの削除に失敗しました");
    });
  },

  deleteTasksByProject: (projectId) => {
    set((state) => ({
      tasks: state.tasks.filter((t) => t.projectId !== projectId),
    }));
  },

  deleteTasksByProjects: (projectIds) => {
    const ids = new Set(projectIds);
    set((state) => ({
      tasks: state.tasks.filter((t) => !ids.has(t.projectId)),
    }));
  },

  reorderTasks: (ids) => {
    const prev = get().tasks;
    const map = new Map(prev.map((t) => [t.id, t]));
    const reordered = ids.map((id, i) => ({ ...map.get(id)!, position: i }));
    const others = prev.filter((t) => !ids.includes(t.id));
    set({ tasks: [...others, ...reordered] });
    tasksApi.reorder(ids).catch(() => {
      set({ tasks: prev });
      toast.error("並び替えに失敗しました");
    });
  },
}));
