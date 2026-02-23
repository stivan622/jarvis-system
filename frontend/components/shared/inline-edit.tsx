"use client";

import {
  useState,
  useRef,
  useEffect,
  useImperativeHandle,
  forwardRef,
  KeyboardEvent,
} from "react";
import { cn } from "@/lib/utils";

interface InlineEditProps {
  value: string;
  onSave: (value: string) => void;
  /** Enter 確定後に呼ばれる（空欄でも呼ばれる）。次のアイテム追加モードへ移行するために使う */
  onEnter?: () => void;
  /** 空欄 Backspace で呼ばれる。アイテム削除に使う */
  onDelete?: () => void;
  placeholder?: string;
  className?: string;
}

export interface InlineEditHandle {
  /** 外部からフォーカス（編集モードに入る）を呼び出す */
  focus: () => void;
}

export const InlineEdit = forwardRef<InlineEditHandle, InlineEditProps>(
  ({ value, onSave, onEnter, onDelete, placeholder = "クリックして編集...", className }, ref) => {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(value);
    const inputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => ({
      focus: () => setEditing(true),
    }));

    useEffect(() => {
      setDraft(value);
    }, [value]);

    useEffect(() => {
      if (editing) {
        inputRef.current?.focus();
        // カーソルを末尾へ（全選択ではなく）
        const len = inputRef.current?.value.length ?? 0;
        inputRef.current?.setSelectionRange(len, len);
      }
    }, [editing]);

    /** blur 時: 空欄なら元に戻す（誤削除防止）、変更があれば保存 */
    function commit() {
      const trimmed = draft.trim();
      if (trimmed && trimmed !== value) onSave(trimmed);
      else setDraft(value);
      setEditing(false);
    }

    function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
      if (e.nativeEvent.isComposing) return;

      if (e.key === "Enter") {
        e.preventDefault();
        const trimmed = draft.trim();
        // 値があれば保存、空欄なら元に戻す（削除はしない）
        if (trimmed && trimmed !== value) onSave(trimmed);
        if (!trimmed) setDraft(value);
        setEditing(false);
        // 空欄・非空欄に関わらず常に次のアイテム追加へ
        onEnter?.();
        return;
      }

      // 空欄 Backspace → 削除（Notion 同様）
      if (e.key === "Backspace" && draft === "") {
        e.preventDefault();
        setEditing(false);
        onDelete?.();
        return;
      }

      if (e.key === "Escape") {
        setDraft(value);
        setEditing(false);
      }
    }

    if (editing) {
      return (
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={cn(
            "bg-transparent outline-none border-none p-0 w-full focus:ring-0",
            className
          )}
        />
      );
    }

    return (
      <span
        onClick={() => setEditing(true)}
        className={cn("cursor-text break-all", className)}
      >
        {value || (
          <span className="text-muted-foreground italic text-sm">{placeholder}</span>
        )}
      </span>
    );
  }
);

InlineEdit.displayName = "InlineEdit";
