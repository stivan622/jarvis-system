import { create } from "zustand";
import { toast } from "sonner";
import { Task } from "@/lib/types";
import { tasksApi } from "@/lib/api";

interface TaskStore {
  tasks: Task[];
  loading: boolean;
  init: () => Promise<void>;
  createTask: (projectId: string, title: string, parentTaskId?: string) => Promise<Task>;
  updateTask: (id: string, data: Partial<Pick<Task, "title" | "done" | "thisWeek" | "projectId" | "position">>) => void;
  deleteTask: (id: string) => void;
  reorderTasks: (projectId: string, parentTaskId: string | null, orderedIds: string[]) => void;
  /** Backend cascades, so these are local-state cleanup only. */
  deleteTasksByProject: (projectId: string) => void;
  deleteTasksByProjects: (projectIds: string[]) => void;
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

  createTask: async (projectId, title, parentTaskId) => {
    const task = await tasksApi.create({ projectId, title, parentTaskId });
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
    // Also remove sub-tasks from local state (backend cascades)
    const subIds = get().tasks.filter((t) => t.parentTaskId === id).map((t) => t.id);
    set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id && t.parentTaskId !== id) }));
    tasksApi.delete(id).catch(() => {
      if (old) {
        set((state) => ({ tasks: [...state.tasks, old] }));
      }
      toast.error("タスクの削除に失敗しました");
    });
    void subIds; // suppress unused warning
  },

  reorderTasks: (projectId, parentTaskId, orderedIds) => {
    const updated = orderedIds.map((id, index) => ({ id, position: index }));
    set((state) => ({
      tasks: state.tasks.map((t) => {
        const found = updated.find((u) => u.id === t.id);
        return found ? { ...t, position: found.position } : t;
      }),
    }));
    updated.forEach(({ id, position }) => {
      tasksApi.update(id, { position }).catch(() => {
        toast.error("タスクの並び替えに失敗しました");
      });
    });
    void projectId;
    void parentTaskId;
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
}));
