"use client";

import { useState, useRef, useEffect, KeyboardEvent, DragEvent } from "react";
import { Plus, Trash2, FolderOpen, Star, GripVertical, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { InlineEdit, InlineEditHandle } from "@/components/shared/inline-edit";
import { useProjectStore } from "@/lib/store/project-store";
import { useTaskStore } from "@/lib/store/task-store";
import { Project, Task } from "@/lib/types";

interface ProjectSectionProps {
  workspaceId: string;
  workspaceName: string;
  showOnlyThisWeek?: boolean;
}

export function ProjectSection({ workspaceId, workspaceName, showOnlyThisWeek = false }: ProjectSectionProps) {
  const { projects, createProject, updateProject, deleteProject, reorderProjects } = useProjectStore();
  const { tasks, createTask, updateTask, deleteTask, deleteTasksByProject, reorderTasks } = useTaskStore();

  const workspaceProjects = projects
    .filter((p) => p.workspaceId === workspaceId)
    .sort((a, b) => a.position - b.position || a.createdAt.localeCompare(b.createdAt));

  const [addingProject, setAddingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [addingTaskFor, setAddingTaskFor] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  // SubTask: { parentTaskId: taskId }
  const [addingSubTaskFor, setAddingSubTaskFor] = useState<string | null>(null);
  const [newSubTaskTitle, setNewSubTaskTitle] = useState("");
  // Expanded state for tasks with subtasks
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

  // Drag state for projects
  const [dragProjectId, setDragProjectId] = useState<string | null>(null);
  const [dragOverProjectId, setDragOverProjectId] = useState<string | null>(null);
  // Drag state for tasks
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null);

  const newProjectRef = useRef<HTMLInputElement>(null);
  const newTaskRef = useRef<HTMLInputElement>(null);
  const newSubTaskRef = useRef<HTMLInputElement>(null);

  const projectRefs = useRef<Map<string, InlineEditHandle>>(new Map());
  const taskRefs = useRef<Map<string, InlineEditHandle>>(new Map());

  useEffect(() => {
    if (addingProject) newProjectRef.current?.focus();
  }, [addingProject]);

  useEffect(() => {
    if (addingTaskFor) newTaskRef.current?.focus();
  }, [addingTaskFor]);

  useEffect(() => {
    if (addingSubTaskFor) newSubTaskRef.current?.focus();
  }, [addingSubTaskFor]);

  // ---- Project drag handlers ----

  function handleProjectDragStart(e: DragEvent, projectId: string) {
    setDragProjectId(projectId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("application/jarvis-project", projectId);
  }

  function handleProjectDragOver(e: DragEvent, projectId: string) {
    if (!dragProjectId || dragProjectId === projectId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverProjectId(projectId);
  }

  function handleProjectDrop(e: DragEvent, targetProjectId: string) {
    e.preventDefault();
    if (!dragProjectId || dragProjectId === targetProjectId) return;

    const ids = workspaceProjects.map((p) => p.id);
    const fromIdx = ids.indexOf(dragProjectId);
    const toIdx = ids.indexOf(targetProjectId);
    if (fromIdx === -1 || toIdx === -1) return;

    const newIds = [...ids];
    newIds.splice(fromIdx, 1);
    newIds.splice(toIdx, 0, dragProjectId);
    reorderProjects(workspaceId, newIds);

    setDragProjectId(null);
    setDragOverProjectId(null);
  }

  function handleProjectDragEnd() {
    setDragProjectId(null);
    setDragOverProjectId(null);
  }

  // ---- Task drag handlers ----

  function handleTaskDragStart(e: DragEvent, taskId: string) {
    setDragTaskId(taskId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("application/jarvis-task-reorder", taskId);
  }

  function handleTaskDragOver(e: DragEvent, taskId: string) {
    if (!dragTaskId || dragTaskId === taskId) return;
    const dragTask = tasks.find((t) => t.id === dragTaskId);
    const overTask = tasks.find((t) => t.id === taskId);
    if (!dragTask || !overTask) return;
    // Only allow reorder within same project & same parent
    if (dragTask.projectId !== overTask.projectId) return;
    if ((dragTask.parentTaskId ?? null) !== (overTask.parentTaskId ?? null)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverTaskId(taskId);
  }

  function handleTaskDrop(e: DragEvent, targetTaskId: string, projectId: string, parentTaskId: string | null) {
    e.preventDefault();
    if (!dragTaskId || dragTaskId === targetTaskId) return;

    const projectTasks = tasks
      .filter((t) => t.projectId === projectId && (t.parentTaskId ?? null) === parentTaskId)
      .sort((a, b) => a.position - b.position || a.createdAt.localeCompare(b.createdAt));

    const ids = projectTasks.map((t) => t.id);
    const fromIdx = ids.indexOf(dragTaskId);
    const toIdx = ids.indexOf(targetTaskId);
    if (fromIdx === -1 || toIdx === -1) return;

    const newIds = [...ids];
    newIds.splice(fromIdx, 1);
    newIds.splice(toIdx, 0, dragTaskId);
    reorderTasks(projectId, parentTaskId, newIds);

    setDragTaskId(null);
    setDragOverTaskId(null);
  }

  function handleTaskDragEnd() {
    setDragTaskId(null);
    setDragOverTaskId(null);
  }

  // ---- Project handlers ----

  async function commitAddProject() {
    const trimmed = newProjectName.trim();
    setNewProjectName("");
    setAddingProject(false);
    if (trimmed) {
      try {
        const project = await createProject(workspaceId, trimmed);
        toast.success(`「${trimmed}」を作成しました`);
        // Project作成後はTaskの新規作成モードへ自動遷移
        setAddingTaskFor(project.id);
        setNewTaskTitle("");
      } catch {
        toast.error("プロジェクトの作成に失敗しました");
      }
    }
  }

  function handleAddProjectKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.nativeEvent.isComposing) return;

    if (e.key === "Enter") {
      const trimmed = newProjectName.trim();
      if (trimmed) {
        setNewProjectName("");
        void createProject(workspaceId, trimmed).then((project) => {
          toast.success(`「${trimmed}」を作成しました`);
          // Project作成後はTaskの新規作成モードへ自動遷移
          setAddingProject(false);
          setAddingTaskFor(project.id);
          setNewTaskTitle("");
        }).catch(() => {
          toast.error("プロジェクトの作成に失敗しました");
        });
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

  // ---- This week handlers ----

  function handleToggleTaskThisWeek(taskId: string, currentValue: boolean) {
    updateTask(taskId, { thisWeek: !currentValue });
  }

  function handleToggleProjectThisWeek(project: Project) {
    const projectTasks = tasks.filter((t) => t.projectId === project.id);
    const allThisWeek = projectTasks.length > 0 && projectTasks.every((t) => t.thisWeek);
    projectTasks.forEach((t) => updateTask(t.id, { thisWeek: !allThisWeek }));
  }

  // ---- Task handlers ----

  async function commitAddTask(projectId: string) {
    const trimmed = newTaskTitle.trim();
    setNewTaskTitle("");
    setAddingTaskFor(null);
    if (trimmed) {
      try {
        await createTask(projectId, trimmed);
      } catch {
        toast.error("タスクの作成に失敗しました");
      }
    }
  }

  function handleAddTaskKeyDown(e: KeyboardEvent<HTMLInputElement>, projectId: string) {
    if (e.nativeEvent.isComposing) return;

    if (e.key === "Enter") {
      const trimmed = newTaskTitle.trim();
      if (trimmed) {
        setNewTaskTitle("");
        void createTask(projectId, trimmed).catch(() => {
          toast.error("タスクの作成に失敗しました");
        });
        // 連続追加のため addingTaskFor は projectId のまま
      }
      return;
    }

    // 空欄 Backspace → 上のタスク or プロジェクト名へ戻る
    if (e.key === "Backspace" && newTaskTitle === "") {
      e.preventDefault();
      setAddingTaskFor(null);
      setNewTaskTitle("");
      const projectTasks = tasks
        .filter((t) => t.projectId === projectId && !t.parentTaskId)
        .sort((a, b) => a.position - b.position);
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
    const projectTasks = tasks
      .filter((t) => t.projectId === projectId && !t.parentTaskId)
      .sort((a, b) => a.position - b.position);
    const idx = projectTasks.findIndex((t) => t.id === taskId);
    const prevTask = projectTasks[idx - 1];

    deleteTask(taskId);

    if (prevTask) {
      setTimeout(() => taskRefs.current.get(prevTask.id)?.focus(), 0);
    } else {
      setTimeout(() => projectRefs.current.get(projectId)?.focus(), 0);
    }
  }

  // ---- SubTask handlers ----

  function handleAddSubTask(taskId: string) {
    setExpandedTasks((prev) => new Set([...prev, taskId]));
    setAddingSubTaskFor(taskId);
    setNewSubTaskTitle("");
  }

  async function commitAddSubTask(parentTaskId: string, projectId: string) {
    const trimmed = newSubTaskTitle.trim();
    setNewSubTaskTitle("");
    setAddingSubTaskFor(null);
    if (trimmed) {
      try {
        await createTask(projectId, trimmed, parentTaskId);
      } catch {
        toast.error("サブタスクの作成に失敗しました");
      }
    }
  }

  function handleAddSubTaskKeyDown(e: KeyboardEvent<HTMLInputElement>, parentTaskId: string, projectId: string) {
    if (e.nativeEvent.isComposing) return;

    if (e.key === "Enter") {
      const trimmed = newSubTaskTitle.trim();
      if (trimmed) {
        setNewSubTaskTitle("");
        void createTask(projectId, trimmed, parentTaskId).catch(() => {
          toast.error("サブタスクの作成に失敗しました");
        });
        // 連続追加のため addingSubTaskFor はそのまま
      }
      return;
    }

    if (e.key === "Backspace" && newSubTaskTitle === "") {
      e.preventDefault();
      setAddingSubTaskFor(null);
      setNewSubTaskTitle("");
      return;
    }

    if (e.key === "Escape") {
      setNewSubTaskTitle("");
      setAddingSubTaskFor(null);
    }
  }

  function toggleTaskExpand(taskId: string) {
    setExpandedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  }

  // ---- Task row renderer (shared for tasks and subtasks) ----

  function renderTask(task: Task, project: Project, depth = 0) {
    const subTasks = tasks
      .filter((t) => t.parentTaskId === task.id)
      .sort((a, b) => a.position - b.position || a.createdAt.localeCompare(b.createdAt));
    const hasSubTasks = subTasks.length > 0;
    const isExpanded = expandedTasks.has(task.id);

    const isDragging = dragTaskId === task.id;
    const isDragOver = dragOverTaskId === task.id;
    const parentTaskId = task.parentTaskId ?? null;

    return (
      <div key={task.id}>
        <div
          className={cn(
            "group flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent/50 transition-colors",
            isDragging && "opacity-40",
            isDragOver && "ring-1 ring-primary/50 bg-accent/70"
          )}
          draggable
          onDragStart={(e) => handleTaskDragStart(e, task.id)}
          onDragOver={(e) => handleTaskDragOver(e, task.id)}
          onDrop={(e) => handleTaskDrop(e, task.id, project.id, parentTaskId)}
          onDragEnd={handleTaskDragEnd}
        >
          <GripVertical className="h-3.5 w-3.5 flex-shrink-0 cursor-grab opacity-0 group-hover:opacity-40 active:cursor-grabbing" />

          {hasSubTasks || addingSubTaskFor === task.id ? (
            <button
              onClick={() => toggleTaskExpand(task.id)}
              className="flex-shrink-0 p-0 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronRight
                className={cn("h-3.5 w-3.5 transition-transform", isExpanded && "rotate-90")}
              />
            </button>
          ) : (
            <div className="h-3.5 w-3.5 flex-shrink-0" />
          )}

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
              if (depth === 0) {
                setNewTaskTitle("");
                setAddingTaskFor(project.id);
              } else {
                setNewSubTaskTitle("");
                setAddingSubTaskFor(task.parentTaskId!);
              }
            }}
            onDelete={() => {
              if (depth === 0) handleDeleteTask(task.id, project.id);
              else deleteTask(task.id);
            }}
            className={cn(
              "flex-1 text-sm",
              task.done && "line-through text-muted-foreground"
            )}
            placeholder="タスク名"
          />
          <button
            className="flex-shrink-0 opacity-0 group-hover:opacity-60 hover:!opacity-100 hover:text-primary transition-all"
            onClick={() => handleAddSubTask(task.id)}
            title="サブタスクを追加"
          >
            <Plus className="h-3 w-3" />
          </button>
          <button
            className={cn(
              "flex-shrink-0 transition-all",
              task.thisWeek
                ? "text-amber-400 opacity-100"
                : "opacity-0 group-hover:opacity-40 hover:!opacity-100 hover:text-amber-400"
            )}
            onClick={() => handleToggleTaskThisWeek(task.id, task.thisWeek)}
            title="今週のタスクに設定"
          >
            <Star className={cn("h-3.5 w-3.5", task.thisWeek && "fill-current")} />
          </button>
          <button
            className="flex-shrink-0 opacity-0 group-hover:opacity-60 hover:!opacity-100 hover:text-destructive transition-all"
            onClick={() => {
              if (depth === 0) handleDeleteTask(task.id, project.id);
              else deleteTask(task.id);
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* SubTasks */}
        {(isExpanded || addingSubTaskFor === task.id) && (
          <div className="ml-10 space-y-0.5">
            {subTasks.map((subTask) => renderTask(subTask, project, depth + 1))}

            {/* Add subtask input */}
            {!showOnlyThisWeek && addingSubTaskFor === task.id ? (
              <div className="flex items-center gap-2 rounded-md px-2 py-1.5">
                <div className="h-4 w-4 flex-shrink-0" />
                <input
                  ref={newSubTaskRef}
                  value={newSubTaskTitle}
                  onChange={(e) => setNewSubTaskTitle(e.target.value)}
                  onBlur={() => void commitAddSubTask(task.id, project.id)}
                  onKeyDown={(e) => handleAddSubTaskKeyDown(e, task.id, project.id)}
                  placeholder="サブタスク名を入力して Enter…"
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
              </div>
            ) : null}
          </div>
        )}
      </div>
    );
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
        const projectTasks = tasks
          .filter((t) => t.projectId === project.id && !t.parentTaskId)
          .sort((a, b) => a.position - b.position || a.createdAt.localeCompare(b.createdAt));
        const allProjectTasks = tasks.filter((t) => t.projectId === project.id);
        const visibleTasks = showOnlyThisWeek
          ? projectTasks.filter((t) => t.thisWeek)
          : projectTasks;
        const doneCount = allProjectTasks.filter((t) => t.done).length;
        const allThisWeek = allProjectTasks.length > 0 && allProjectTasks.every((t) => t.thisWeek);
        const someThisWeek = allProjectTasks.some((t) => t.thisWeek);

        if (showOnlyThisWeek && visibleTasks.length === 0) return null;

        const isProjectDragging = dragProjectId === project.id;
        const isProjectDragOver = dragOverProjectId === project.id;

        return (
          <div
            key={project.id}
            className={cn(
              isProjectDragging && "opacity-40",
              isProjectDragOver && "ring-1 ring-primary/50 rounded-md"
            )}
            onDragOver={(e) => handleProjectDragOver(e, project.id)}
            onDrop={(e) => handleProjectDrop(e, project.id)}
          >
            {/* Project row */}
            <div className="group flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent/50 transition-colors">
              <div
                className="flex-shrink-0 cursor-grab opacity-0 group-hover:opacity-40 active:cursor-grabbing"
                draggable
                onDragStart={(e) => handleProjectDragStart(e, project.id)}
                onDragEnd={handleProjectDragEnd}
              >
                <GripVertical className="h-3.5 w-3.5" />
              </div>

              <span className="flex-shrink-0 text-base leading-none">📁</span>

              <InlineEdit
                ref={(el) => {
                  if (el) projectRefs.current.set(project.id, el);
                  else projectRefs.current.delete(project.id);
                }}
                value={project.name}
                onSave={(name) => updateProject(project.id, { name })}
                onEnter={() => setAddingProject(true)}
                onDelete={() => handleDeleteProject(project)}
                className="flex-1 font-medium text-sm"
                placeholder="プロジェクト名"
              />

              {allProjectTasks.length > 0 && (
                <span className="flex-shrink-0 text-xs text-muted-foreground">
                  {doneCount}/{allProjectTasks.length}
                </span>
              )}

              <button
                className={cn(
                  "flex-shrink-0 transition-all",
                  allThisWeek
                    ? "text-amber-400 opacity-100"
                    : someThisWeek
                    ? "text-amber-400/60 opacity-100"
                    : "opacity-0 group-hover:opacity-40 hover:!opacity-100 hover:text-amber-400"
                )}
                onClick={() => handleToggleProjectThisWeek(project)}
                title="全タスクを今週に設定"
              >
                <Star className={cn("h-3.5 w-3.5", (allThisWeek || someThisWeek) && "fill-current")} />
              </button>

              <button
                className="flex-shrink-0 opacity-0 group-hover:opacity-60 hover:!opacity-100 hover:text-destructive transition-all"
                onClick={() => handleDeleteProject(project)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Tasks — 常に表示 */}
            <div className="ml-7 space-y-0.5 pb-1">
              {visibleTasks.map((task) => renderTask(task, project))}

              {/* Add task input */}
              {!showOnlyThisWeek && addingTaskFor === project.id ? (
                <div className="flex items-center gap-2 rounded-md px-2 py-1.5">
                  <div className="h-4 w-4 flex-shrink-0" />
                  <input
                    ref={newTaskRef}
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    onBlur={() => void commitAddTask(project.id)}
                    onKeyDown={(e) => handleAddTaskKeyDown(e, project.id)}
                    placeholder="タスク名を入力して Enter… (Shift+Tab でプロジェクトに変換)"
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  />
                </div>
              ) : !showOnlyThisWeek ? (
                <button
                  onClick={() => { setAddingTaskFor(project.id); setNewTaskTitle(""); }}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  タスクを追加
                </button>
              ) : null}
            </div>
          </div>
        );
      })}

      {/* Add project input */}
      {!showOnlyThisWeek && addingProject ? (
        <div className="flex items-center gap-2 rounded-md px-2 py-1.5">
          <span className="flex-shrink-0 text-base leading-none">📁</span>
          <input
            ref={newProjectRef}
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            onBlur={() => void commitAddProject()}
            onKeyDown={handleAddProjectKeyDown}
            placeholder="プロジェクト名を入力して Enter… (Tab でタスクに変換)"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
      ) : !showOnlyThisWeek ? (
        <button
          onClick={() => setAddingProject(true)}
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors"
        >
          <Plus className="h-4 w-4" />
          プロジェクトを追加
        </button>
      ) : null}
    </div>
  );
}
