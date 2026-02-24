"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { Plus, Trash2, FolderOpen, Star, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { InlineEdit, InlineEditHandle } from "@/components/shared/inline-edit";
import { useProjectStore } from "@/lib/store/project-store";
import { useTaskStore } from "@/lib/store/task-store";
import { Project, Task } from "@/lib/types";
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

interface ProjectSectionProps {
  workspaceId: string;
  workspaceName: string;
  showOnlyThisWeek?: boolean;
}

// ---- Sortable Task Item ----

interface SortableTaskItemProps {
  task: Task;
  onUpdate: (id: string, data: Partial<Pick<Task, "title" | "done" | "thisWeek">>) => void;
  onDelete: (id: string, projectId: string) => void;
  taskRef: (el: InlineEditHandle | null) => void;
  onEnter: () => void;
  projectId: string;
}

function SortableTaskItem({ task, onUpdate, onDelete, taskRef, onEnter, projectId }: SortableTaskItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent/50 transition-colors"
    >
      <button
        {...attributes}
        {...listeners}
        className="flex-shrink-0 cursor-grab opacity-0 group-hover:opacity-40 hover:!opacity-70 active:cursor-grabbing"
        tabIndex={-1}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <Checkbox
        checked={task.done}
        onCheckedChange={(checked) => onUpdate(task.id, { done: !!checked })}
        className="flex-shrink-0"
      />
      <InlineEdit
        ref={taskRef}
        value={task.title}
        onSave={(title) => onUpdate(task.id, { title })}
        onEnter={onEnter}
        onDelete={() => onDelete(task.id, projectId)}
        className={cn(
          "flex-1 text-sm",
          task.done && "line-through text-muted-foreground"
        )}
        placeholder="タスク名"
      />
      <button
        className={cn(
          "flex-shrink-0 transition-all",
          task.thisWeek
            ? "text-amber-400 opacity-100"
            : "opacity-0 group-hover:opacity-40 hover:!opacity-100 hover:text-amber-400"
        )}
        onClick={() => onUpdate(task.id, { thisWeek: !task.thisWeek })}
        title="今週のタスクに設定"
      >
        <Star className={cn("h-3.5 w-3.5", task.thisWeek && "fill-current")} />
      </button>
      <button
        className="flex-shrink-0 opacity-0 group-hover:opacity-60 hover:!opacity-100 hover:text-destructive transition-all"
        onClick={() => onDelete(task.id, projectId)}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ---- Sortable Project Item ----

interface SortableProjectItemProps {
  project: Project;
  tasks: Task[];
  allTasks: Task[];
  showOnlyThisWeek: boolean;
  addingTaskFor: string | null;
  newTaskTitle: string;
  newTaskRef: React.RefObject<HTMLInputElement | null>;
  projectRef: (el: InlineEditHandle | null) => void;
  taskRefs: React.RefObject<Map<string, InlineEditHandle>>;
  onUpdateProject: (id: string, name: string) => void;
  onDeleteProject: (project: Project) => void;
  onToggleProjectThisWeek: (project: Project) => void;
  onUpdateTask: (id: string, data: Partial<Pick<Task, "title" | "done" | "thisWeek">>) => void;
  onDeleteTask: (id: string, projectId: string) => void;
  onSetAddingTaskFor: (projectId: string | null) => void;
  onSetAddingProject: (val: boolean) => void;
  onNewTaskTitleChange: (val: string) => void;
  onCommitAddTask: (projectId: string) => void;
  onAddTaskKeyDown: (e: KeyboardEvent<HTMLInputElement>, projectId: string) => void;
  onReorderTasks: (ids: string[]) => void;
}

function SortableProjectItem({
  project,
  tasks,
  allTasks,
  showOnlyThisWeek,
  addingTaskFor,
  newTaskTitle,
  newTaskRef,
  projectRef,
  taskRefs,
  onUpdateProject,
  onDeleteProject,
  onToggleProjectThisWeek,
  onUpdateTask,
  onDeleteTask,
  onSetAddingTaskFor,
  onSetAddingProject,
  onNewTaskTitleChange,
  onCommitAddTask,
  onAddTaskKeyDown,
  onReorderTasks,
}: SortableProjectItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: project.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const projectTasks = allTasks.filter((t) => t.projectId === project.id);
  const visibleTasks = showOnlyThisWeek ? tasks.filter((t) => t.thisWeek) : tasks;
  const doneCount = projectTasks.filter((t) => t.done).length;
  const allThisWeek = projectTasks.length > 0 && projectTasks.every((t) => t.thisWeek);
  const someThisWeek = projectTasks.some((t) => t.thisWeek);

  const taskSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  function handleTaskDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = tasks.findIndex((t) => t.id === active.id);
    const newIndex = tasks.findIndex((t) => t.id === over.id);
    const reordered = arrayMove(tasks, oldIndex, newIndex);
    onReorderTasks(reordered.map((t) => t.id));
  }

  if (showOnlyThisWeek && visibleTasks.length === 0) return null;

  return (
    <div ref={setNodeRef} style={style}>
      {/* Project row */}
      <div className="group flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent/50 transition-colors">
        <button
          {...attributes}
          {...listeners}
          className="flex-shrink-0 cursor-grab opacity-0 group-hover:opacity-40 hover:!opacity-70 active:cursor-grabbing"
          tabIndex={-1}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>

        <span className="flex-shrink-0 text-base leading-none">📁</span>

        <InlineEdit
          ref={projectRef}
          value={project.name}
          onSave={(name) => onUpdateProject(project.id, name)}
          onEnter={() => onSetAddingProject(true)}
          onDelete={() => onDeleteProject(project)}
          className="flex-1 font-medium text-sm"
          placeholder="プロジェクト名"
        />

        {projectTasks.length > 0 && (
          <span className="flex-shrink-0 text-xs text-muted-foreground">
            {doneCount}/{projectTasks.length}
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
          onClick={() => onToggleProjectThisWeek(project)}
          title="全タスクを今週に設定"
        >
          <Star className={cn("h-3.5 w-3.5", (allThisWeek || someThisWeek) && "fill-current")} />
        </button>

        <button
          className="flex-shrink-0 opacity-0 group-hover:opacity-60 hover:!opacity-100 hover:text-destructive transition-all"
          onClick={() => onDeleteProject(project)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Tasks */}
      <div className="ml-7 space-y-0.5 pb-1">
        <DndContext
          sensors={taskSensors}
          collisionDetection={closestCenter}
          onDragEnd={handleTaskDragEnd}
        >
          <SortableContext
            items={tasks.map((t) => t.id)}
            strategy={verticalListSortingStrategy}
          >
            {visibleTasks.map((task) => (
              <SortableTaskItem
                key={task.id}
                task={task}
                projectId={project.id}
                onUpdate={onUpdateTask}
                onDelete={onDeleteTask}
                taskRef={(el) => {
                  if (el) taskRefs.current.set(task.id, el);
                  else taskRefs.current.delete(task.id);
                }}
                onEnter={() => {
                  onNewTaskTitleChange("");
                  onSetAddingTaskFor(project.id);
                }}
              />
            ))}
          </SortableContext>
        </DndContext>

        {/* Add task input */}
        {!showOnlyThisWeek && addingTaskFor === project.id && (
          <div className="flex items-center gap-2 rounded-md px-2 py-1.5">
            <div className="h-4 w-4 flex-shrink-0" />
            <input
              ref={newTaskRef}
              value={newTaskTitle}
              onChange={(e) => onNewTaskTitleChange(e.target.value)}
              onBlur={() => onCommitAddTask(project.id)}
              onKeyDown={(e) => onAddTaskKeyDown(e, project.id)}
              placeholder="タスク名を入力して Enter… (Shift+Tab でプロジェクトに変換)"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Main ProjectSection ----

export function ProjectSection({ workspaceId, workspaceName, showOnlyThisWeek = false }: ProjectSectionProps) {
  const { projects, createProject, updateProject, deleteProject, reorderProjects } = useProjectStore();
  const { tasks, createTask, updateTask, deleteTask, deleteTasksByProject, reorderTasks } = useTaskStore();

  const workspaceProjects = projects.filter((p) => p.workspaceId === workspaceId);

  const [addingProject, setAddingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [addingTaskFor, setAddingTaskFor] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");

  const newProjectRef = useRef<HTMLInputElement>(null);
  const newTaskRef = useRef<HTMLInputElement>(null);

  const projectRefs = useRef<Map<string, InlineEditHandle>>(new Map());
  const taskRefs = useRef<Map<string, InlineEditHandle>>(new Map());

  const projectSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  useEffect(() => {
    if (addingProject) newProjectRef.current?.focus();
  }, [addingProject]);

  useEffect(() => {
    if (addingTaskFor) newTaskRef.current?.focus();
  }, [addingTaskFor]);

  // ---- Project handlers ----

  async function commitAddProject() {
    const trimmed = newProjectName.trim();
    setNewProjectName("");
    setAddingProject(false);
    if (trimmed) {
      try {
        await createProject(workspaceId, trimmed);
        toast.success(`「${trimmed}」を作成しました`);
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
        void createProject(workspaceId, trimmed).then(() => {
          toast.success(`「${trimmed}」を作成しました`);
        }).catch(() => {
          toast.error("プロジェクトの作成に失敗しました");
        });
      }
      return;
    }

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
      }
      return;
    }

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

  function handleProjectDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = workspaceProjects.findIndex((p) => p.id === active.id);
    const newIndex = workspaceProjects.findIndex((p) => p.id === over.id);
    const reordered = arrayMove(workspaceProjects, oldIndex, newIndex);
    reorderProjects(reordered.map((p) => p.id));
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
      <DndContext
        sensors={projectSensors}
        collisionDetection={closestCenter}
        onDragEnd={handleProjectDragEnd}
      >
        <SortableContext
          items={workspaceProjects.map((p) => p.id)}
          strategy={verticalListSortingStrategy}
        >
          {workspaceProjects.map((project) => {
            const projectTasks = tasks.filter((t) => t.projectId === project.id);

            return (
              <SortableProjectItem
                key={project.id}
                project={project}
                tasks={projectTasks}
                allTasks={tasks}
                showOnlyThisWeek={showOnlyThisWeek}
                addingTaskFor={addingTaskFor}
                newTaskTitle={newTaskTitle}
                newTaskRef={newTaskRef}
                projectRef={(el) => {
                  if (el) projectRefs.current.set(project.id, el);
                  else projectRefs.current.delete(project.id);
                }}
                taskRefs={taskRefs}
                onUpdateProject={updateProject}
                onDeleteProject={handleDeleteProject}
                onToggleProjectThisWeek={handleToggleProjectThisWeek}
                onUpdateTask={(id, data) => updateTask(id, data)}
                onDeleteTask={handleDeleteTask}
                onSetAddingTaskFor={setAddingTaskFor}
                onSetAddingProject={setAddingProject}
                onNewTaskTitleChange={setNewTaskTitle}
                onCommitAddTask={commitAddTask}
                onAddTaskKeyDown={handleAddTaskKeyDown}
                onReorderTasks={reorderTasks}
              />
            );
          })}
        </SortableContext>
      </DndContext>

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
