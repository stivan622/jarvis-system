import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Task } from "@/lib/types";

function generateId(): string {
  return crypto.randomUUID();
}

function now(): string {
  return new Date().toISOString();
}

interface TaskStore {
  tasks: Task[];
  createTask: (projectId: string, title: string) => Task;
  updateTask: (id: string, data: Partial<Pick<Task, "title" | "done">>) => void;
  deleteTask: (id: string) => void;
  deleteTasksByProject: (projectId: string) => void;
  deleteTasksByProjects: (projectIds: string[]) => void;
}

export const useTaskStore = create<TaskStore>()(
  persist(
    (set) => ({
      tasks: [],

      createTask: (projectId, title) => {
        const task: Task = {
          id: generateId(),
          projectId,
          title,
          done: false,
          createdAt: now(),
          updatedAt: now(),
        };
        set((state) => ({ tasks: [...state.tasks, task] }));
        return task;
      },

      updateTask: (id, data) => {
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === id ? { ...t, ...data, updatedAt: now() } : t
          ),
        }));
      },

      deleteTask: (id) => {
        set((state) => ({
          tasks: state.tasks.filter((t) => t.id !== id),
        }));
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
    }),
    { name: "jarvis-tasks" }
  )
);
