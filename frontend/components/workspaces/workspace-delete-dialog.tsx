"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Workspace } from "@/lib/types";

interface WorkspaceDeleteDialogProps {
  workspace: Workspace | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (id: string) => void;
}

export function WorkspaceDeleteDialog({
  workspace,
  open,
  onOpenChange,
  onConfirm,
}: WorkspaceDeleteDialogProps) {
  if (!workspace) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>ワークスペースを削除</AlertDialogTitle>
          <AlertDialogDescription>
            <span className="font-semibold">{workspace.name}</span>{" "}
            を削除します。この操作は取り消せません。
            <br />
            関連するプロジェクト・タスクもすべて削除されます。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>キャンセル</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => onConfirm(workspace.id)}
          >
            削除する
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
