"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Props {
  content: string;
}

export function MarkdownRenderer({ content }: Props) {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none
      prose-headings:font-semibold prose-headings:tracking-tight
      prose-h1:text-2xl prose-h2:text-xl prose-h2:border-b prose-h2:pb-2
      prose-h3:text-base
      prose-code:rounded prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:text-sm prose-code:font-mono prose-code:before:content-none prose-code:after:content-none
      prose-pre:bg-muted prose-pre:rounded-lg prose-pre:border
      prose-a:text-primary prose-a:no-underline hover:prose-a:underline
      prose-blockquote:border-l-primary prose-blockquote:text-muted-foreground
      prose-table:text-sm
      prose-th:border prose-th:border-border prose-th:p-2 prose-th:text-left
      prose-td:border prose-td:border-border prose-td:p-2
      prose-img:rounded-lg">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
