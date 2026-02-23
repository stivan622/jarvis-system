import fs from "fs";
import path from "path";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarkdownRenderer } from "@/components/docs/markdown-renderer";

const DOCS_DIR = path.join(process.cwd(), "..", "docs");

export async function generateStaticParams() {
  if (!fs.existsSync(DOCS_DIR)) return [];

  return fs
    .readdirSync(DOCS_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((f) => ({ slug: f.replace(/\.md$/, "") }));
}

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function DocPage({ params }: Props) {
  const { slug } = await params;
  const filePath = path.join(DOCS_DIR, `${slug}.md`);

  if (!fs.existsSync(filePath)) {
    notFound();
  }

  const content = fs.readFileSync(filePath, "utf-8");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/docs">
          <ChevronLeft className="mr-1 h-4 w-4" />
          ドキュメント一覧
        </Link>
      </Button>

      <MarkdownRenderer content={content} />
    </div>
  );
}
