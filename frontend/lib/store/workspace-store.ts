import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Workspace } from "@/lib/types";

function generateId(): string {
  return crypto.randomUUID();
}

function now(): string {
  return new Date().toISOString();
}

const INITIAL_WORKSPACES: Workspace[] = [
  {
    id: generateId(),
    name: "個人プロジェクト",
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: generateId(),
    name: "Jarvis 開発",
    createdAt: now(),
    updatedAt: now(),
  },
];

interface WorkspaceStore {
  workspaces: Workspace[];
  createWorkspace: (data: Pick<Workspace, "name">) => Workspace;
  updateWorkspace: (id: string, data: Pick<Workspace, "name">) => void;
  deleteWorkspace: (id: string) => void;
  getWorkspace: (id: string) => Workspace | undefined;
}

export const useWorkspaceStore = create<WorkspaceStore>()(
  persist(
    (set, get) => ({
      workspaces: INITIAL_WORKSPACES,

      createWorkspace: (data) => {
        const workspace: Workspace = {
          id: generateId(),
          ...data,
          createdAt: now(),
          updatedAt: now(),
        };
        set((state) => ({ workspaces: [...state.workspaces, workspace] }));
        return workspace;
      },

      updateWorkspace: (id, data) => {
        set((state) => ({
          workspaces: state.workspaces.map((w) =>
            w.id === id ? { ...w, ...data, updatedAt: now() } : w
          ),
        }));
      },

      deleteWorkspace: (id) => {
        set((state) => ({
          workspaces: state.workspaces.filter((w) => w.id !== id),
        }));
      },

      getWorkspace: (id) => {
        return get().workspaces.find((w) => w.id === id);
      },
    }),
    { name: "jarvis-workspaces" }
  )
);
