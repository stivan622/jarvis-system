"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Workspace } from "@/lib/types";

export const workspaceSchema = z.object({
  name: z
    .string()
    .min(1, "名前は必須です")
    .max(50, "50文字以内で入力してください"),
});

export type WorkspaceFormValues = z.infer<typeof workspaceSchema>;

interface WorkspaceFormProps {
  defaultValues?: Partial<WorkspaceFormValues>;
  onSubmit: (values: WorkspaceFormValues) => void;
  onCancel: () => void;
  submitLabel?: string;
  isSubmitting?: boolean;
}

export function WorkspaceForm({
  defaultValues,
  onSubmit,
  onCancel,
  submitLabel = "作成",
  isSubmitting = false,
}: WorkspaceFormProps) {
  const form = useForm<WorkspaceFormValues>({
    resolver: zodResolver(workspaceSchema),
    defaultValues: { name: "", ...defaultValues },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                名前 <span className="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <Input placeholder="例: 個人プロジェクト" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            キャンセル
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  );
}

export function workspaceToFormValues(workspace: Workspace): WorkspaceFormValues {
  return { name: workspace.name };
}
