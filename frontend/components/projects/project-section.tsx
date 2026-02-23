"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { Plus, Trash2, FolderOpen } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { InlineEdit, InlineEditHandle } from "@/components/shared/inline-edit";
import { useProjectStore } from "@/lib/store/project-store";
import { useTaskStore } from "@/lib/store/task-store";
import { Project } from "@/lib/types";

interface ProjectSectionProps {
  workspaceId: string;
  workspaceName: string;
}

export function ProjectSection({ workspaceId, workspaceName }: ProjectSectionProps) {
  const { projects, createProject, updateProject, deleteProject } = useProjectStore();
  const { tasks, createTask, updateTask, deleteTask, deleteTasksByProject } = useTaskStore();

  const workspaceProjects = projects.filter((p) => p.workspaceId === workspaceId);

  const [addingProject, setAddingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [addingTaskFor, setAddingTaskFor] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");

  const newProjectRef = useRef<HTMLInputElement>(null);
  const newTaskRef = useRef<HTMLInputElement>(null);

  const projectRefs = useRef<Map<string, InlineEditHandle>>(new Map());
  const taskRefs = useRef<Map<string, InlineEditHandle>>(new Map());

  useEffect(() => {
    if (addingProject) newProjectRef.current?.focus();
  }, [addingProject]);

  useEffect(() => {
    if (addingTaskFor) newTaskRef.current?.focus();
  }, [addingTaskFor]);

  // ---- Project handlers ----

  function commitAddProject() {
    const trimmed = newProjectName.trim();
    if (trimmed) {
      createProject(workspaceId, trimmed);
      toast.success(`「${trimmed}」を作成しました`);
    }
    setNewProjectName("");
    setAddingProject(false);
  }

  function handleAddProjectKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.nativeEvent.isComposing) return;

    if (e.key === "Enter") {
      const trimmed = newProjectName.trim();
      if (trimmed) {
        createProject(workspaceId, trimmed);
        toast.success(`「${trimmed}」を作成しました`);
        setNewProjectName("");
        // 連続追加のため addingProject は true のまま
      }
      return;
    }

    // 空欄 Backspace → 上のプロジェクト名へ戻る
    if (e.key === "Backspace" && newProjectName === "") {
      e.preventDefault();
      setAddingProject(false);
      const lastProject = workspaceProjects[workspaceProjects.length - 1];
      if (lastProject) {
        setTimeout(() => projectRefs.current.get(lastProject.id)?.focus(), 0);
      }
      return;
    }

    if (e.key === "Escape") { setNewProjectName(""); setAddingProject(false); }

    // Tab → 最後のプロジェクト配下のタスク追加モードへ
    if (e.key === "Tab" && !e.shiftKey) {
      e.preventDefault();
      const lastProject = workspaceProjects[workspaceProjects.length - 1];
      if (lastProject) {
        setAddingProject(false);
        setNewTaskTitle(newProjectName);
        setNewProjectName("");
        setAddingTaskFor(lastProject.id);
      }
    }
  }

  function handleDeleteProject(project: Project) {
    const idx = workspaceProjects.findIndex((p) => p.id === project.id);
    const prevProject = workspaceProjects[idx - 1];

    deleteTasksByProject(project.id);
    deleteProject(project.id);
    toast.success(`「${project.name}」を削除しました`);

    if (prevProject) {
      setTimeout(() => projectRefs.current.get(prevProject.id)?.focus(), 0);
    }
  }

  // ---- Task handlers ----

  function commitAddTask(projectId: string) {
    const trimmed = newTaskTitle.trim();
    if (trimmed) createTask(projectId, trimmed);
    setNewTaskTitle("");
    setAddingTaskFor(null);
  }

  function handleAddTaskKeyDown(e: KeyboardEvent<HTMLInputElement>, projectId: string) {
    if (e.nativeEvent.isComposing) return;

    if (e.key === "Enter") {
      const trimmed = newTaskTitle.trim();
      if (trimmed) {
        createTask(projectId, trimmed);
        setNewTaskTitle("");
        // 連続追加のため addingTaskFor は projectId のまま
      }
      return;
    }

    // 空欄 Backspace → 上のタスク or プロジェクト名へ戻る
    if (e.key === "Backspace" && newTaskTitle === "") {
      e.preventDefault();
      setAddingTaskFor(null);
      setNewTaskTitle("");
      const projectTasks = tasks.filter((t) => t.projectId === projectId);
      const lastTask = projectTasks[projectTasks.length - 1];
      if (lastTask) {
        setTimeout(() => taskRefs.current.get(lastTask.id)?.focus(), 0);
      } else {
        setTimeout(() => projectRefs.current.get(projectId)?.focus(), 0);
      }
      return;
    }

    if (e.key === "Escape") { setNewTaskTitle(""); setAddingTaskFor(null); }

    // Shift+Tab → プロジェクト追加モードへ昇格
    if (e.key === "Tab" && e.shiftKey) {
      e.preventDefault();
      setAddingTaskFor(null);
      setNewProjectName(newTaskTitle);
      setNewTaskTitle("");
      setAddingProject(true);
    }
  }

  function handleDeleteTask(taskId: string, projectId: string) {
    const projectTasks = tasks.filter((t) => t.projectId === projectId);
    const idx = projectTasks.findIndex((t) => t.id === taskId);
    const prevTask = projectTasks[idx - 1];

    deleteTask(taskId);

    if (prevTask) {
      setTimeout(() => taskRefs.current.get(prevTask.id)?.focus(), 0);
    } else {
      setTimeout(() => projectRefs.current.get(projectId)?.focus(), 0);
    }
  }

  // ---- Empty state ----

  if (workspaceProjects.length === 0 && !addingProject) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
        <FolderOpen className="h-10 w-10 opacity-30" />
        <p className="text-sm">プロジェクトがありません</p>
        <button
          onClick={() => setAddingProject(true)}
          className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm hover:bg-accent hover:text-foreground transition-colors"
        >
          <Plus className="h-4 w-4" />
          プロジェクトを追加
        </button>
      </div>
    );
  }

  // ---- Main render ----

  return (
    <div className="space-y-0.5">
      {workspaceProjects.map((project) => {
        const projectTasks = tasks.filter((t) => t.projectId === project.id);
        const doneCount = projectTasks.filter((t) => t.done).length;

        return (
          <div key={project.id}>
            {/* Project row */}
            <div className="group flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent/50 transition-colors">
              <span className="flex-shrink-0 text-base leading-none">📁</span>

              <InlineEdit
                ref={(el) => {
                  if (el) projectRefs.current.set(project.id, el);
                  else projectRefs.current.delete(project.id);
                }}
                value={project.name}
                onSave={(name) => updateProject(project.id, name)}
                onEnter={() => setAddingProject(true)}
                onDelete={() => handleDeleteProject(project)}
                className="flex-1 font-medium text-sm"
                placeholder="プロジェクト名"
              />

              {projectTasks.length > 0 && (
                <span className="flex-shrink-0 text-xs text-muted-foreground">
                  {doneCount}/{projectTasks.length}
                </span>
              )}

              <button
                className="flex-shrink-0 opacity-0 group-hover:opacity-60 hover:!opacity-100 hover:text-destructive transition-all"
                onClick={() => handleDeleteProject(project)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Tasks — 常に表示 */}
            <div className="ml-7 space-y-0.5 pb-1">
              {projectTasks.map((task) => (
                <div
                  key={task.id}
                  className="group flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent/50 transition-colors"
                >
                  <Checkbox
                    checked={task.done}
                    onCheckedChange={(checked) =>
                      updateTask(task.id, { done: !!checked })
                    }
                    className="flex-shrink-0"
                  />
                  <InlineEdit
                    ref={(el) => {
                      if (el) taskRefs.current.set(task.id, el);
                      else taskRefs.current.delete(task.id);
                    }}
                    value={task.title}
                    onSave={(title) => updateTask(task.id, { title })}
                    onEnter={() => {
                      setNewTaskTitle("");
                      setAddingTaskFor(project.id);
                    }}
                    onDelete={() => handleDeleteTask(task.id, project.id)}
                    className={cn(
                      "flex-1 text-sm",
                      task.done && "line-through text-muted-foreground"
                    )}
                    placeholder="タスク名"
                  />
                  <button
                    className="flex-shrink-0 opacity-0 group-hover:opacity-60 hover:!opacity-100 hover:text-destructive transition-all"
                    onClick={() => handleDeleteTask(task.id, project.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}

              {/* Add task input */}
              {addingTaskFor === project.id ? (
                <div className="flex items-center gap-2 rounded-md px-2 py-1.5">
                  <div className="h-4 w-4 flex-shrink-0" />
                  <input
                    ref={newTaskRef}
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    onBlur={() => commitAddTask(project.id)}
                    onKeyDown={(e) => handleAddTaskKeyDown(e, project.id)}
                    placeholder="タスク名を入力して Enter… (Shift+Tab でプロジェクトに変換)"
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  />
                </div>
              ) : (
                <button
                  onClick={() => { setAddingTaskFor(project.id); setNewTaskTitle(""); }}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  タスクを追加
                </button>
              )}
            </div>
          </div>
        );
      })}

      {/* Add project input */}
      {addingProject ? (
        <div className="flex items-center gap-2 rounded-md px-2 py-1.5">
          <span className="flex-shrink-0 text-base leading-none">📁</span>
          <input
            ref={newProjectRef}
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            onBlur={commitAddProject}
            onKeyDown={handleAddProjectKeyDown}
            placeholder="プロジェクト名を入力して Enter… (Tab でタスクに変換)"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
      ) : (
        <button
          onClick={() => setAddingProject(true)}
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors"
        >
          <Plus className="h-4 w-4" />
          プロジェクトを追加
        </button>
      )}
    </div>
  );
}
