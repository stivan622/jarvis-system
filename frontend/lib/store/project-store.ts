import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Project } from "@/lib/types";

function generateId(): string {
  return crypto.randomUUID();
}

function now(): string {
  return new Date().toISOString();
}

interface ProjectStore {
  projects: Project[];
  createProject: (workspaceId: string, name: string) => Project;
  updateProject: (id: string, name: string) => void;
  deleteProject: (id: string) => void;
  deleteProjectsByWorkspace: (workspaceId: string) => string[];
}

export const useProjectStore = create<ProjectStore>()(
  persist(
    (set, get) => ({
      projects: [],

      createProject: (workspaceId, name) => {
        const project: Project = {
          id: generateId(),
          workspaceId,
          name,
          createdAt: now(),
          updatedAt: now(),
        };
        set((state) => ({ projects: [...state.projects, project] }));
        return project;
      },

      updateProject: (id, name) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, name, updatedAt: now() } : p
          ),
        }));
      },

      deleteProject: (id) => {
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
        }));
      },

      deleteProjectsByWorkspace: (workspaceId) => {
        const ids = get().projects
          .filter((p) => p.workspaceId === workspaceId)
          .map((p) => p.id);
        set((state) => ({
          projects: state.projects.filter((p) => p.workspaceId !== workspaceId),
        }));
        return ids;
      },
    }),
    { name: "jarvis-projects" }
  )
);
