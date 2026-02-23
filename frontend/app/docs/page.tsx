import fs from "fs";
import path from "path";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";

const DOCS_DIR = path.join(process.cwd(), "..", "docs");

interface DocMeta {
  slug: string;
  title: string;
  description: string;
}

function extractMeta(content: string, slug: string): DocMeta {
  const lines = content.split("\n").filter((l) => l.trim());

  const titleLine = lines.find((l) => l.startsWith("# "));
  const title = titleLine ? titleLine.replace(/^#\s+/, "") : slug;

  const descLine = lines.find((l) => !l.startsWith("#") && l.trim().length > 10);
  const description = descLine
    ? descLine.replace(/^[-*>\s]+/, "").slice(0, 80) + (descLine.length > 80 ? "…" : "")
    : "";

  return { slug, title, description };
}

function getDocs(): DocMeta[] {
  if (!fs.existsSync(DOCS_DIR)) return [];

  return fs
    .readdirSync(DOCS_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((file) => {
      const slug = file.replace(/\.md$/, "");
      const content = fs.readFileSync(path.join(DOCS_DIR, file), "utf-8");
      return extractMeta(content, slug);
    });
}

export default function DocsPage() {
  const docs = getDocs();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">ドキュメント</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          プロジェクトのドキュメント一覧
        </p>
      </div>

      {docs.length === 0 ? (
        <p className="text-sm text-muted-foreground">ドキュメントが見つかりません。</p>
      ) : (
        <div className="grid gap-3">
          {docs.map(({ slug, title, description }) => (
            <Link key={slug} href={`/docs/${slug}`}>
              <Card className="cursor-pointer transition-colors hover:bg-accent">
                <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <CardTitle className="text-base font-semibold">{title}</CardTitle>
                </CardHeader>
                {description && (
                  <CardContent className="pl-10">
                    <p className="text-sm text-muted-foreground">{description}</p>
                  </CardContent>
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
