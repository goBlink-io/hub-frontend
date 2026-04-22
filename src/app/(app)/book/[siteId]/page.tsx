import { notFound } from "next/navigation";
import Link from "next/link";
import { getBookAdminClient } from "@/lib/book/book-client";
import { Plus, ExternalLink, Globe, FileText, Eye, EyeOff } from "lucide-react";
import type { BBSpace, BBPage } from "@/types/book";
import { Breadcrumbs } from "@/components/shared/Breadcrumbs";

export default async function SiteOverviewPage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;
  const bookDb = getBookAdminClient();

  const { data: space } = await bookDb
    .from("bb_spaces")
    .select("*")
    .eq("id", siteId)
    .maybeSingle();
  if (!space) notFound();
  const typedSpace = space as BBSpace;

  const { data: pages } = await bookDb
    .from("bb_pages")
    .select("id, title, slug, content, is_published, updated_at")
    .eq("space_id", siteId)
    .order("position", { ascending: true });

  const allPages = (pages ?? []) as BBPage[];
  const publishedCount = allPages.filter((p) => p.is_published).length;

  return (
    <div>
      <Breadcrumbs items={[
        { label: "Home", href: "/" },
        { label: "BlinkBook", href: "/book" },
        { label: typedSpace.name },
      ]} />
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>
            {typedSpace.name}
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--color-text-tertiary)" }}>
            {typedSpace.slug}.blinkbook.goblink.io
          </p>
        </div>
        <div className="flex items-center gap-3">
          {typedSpace.is_published && (
            <a
              href={`https://${typedSpace.slug}.blinkbook.goblink.io`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm transition"
              style={{
                color: "var(--color-text-secondary)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-lg)",
              }}
            >
              <ExternalLink size={16} />
              View Live
            </a>
          )}
          <button
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white transition"
            style={{ backgroundColor: "var(--color-primary)", borderRadius: "var(--radius-lg)" }}
          >
            <Globe size={16} />
            {typedSpace.is_published ? "Republish" : "Publish"}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-3 gap-4">
        {[
          { label: "Total pages", value: allPages.length, color: "var(--color-text-primary)" },
          { label: "Published", value: publishedCount, color: "var(--color-success)" },
          { label: "Drafts", value: allPages.length - publishedCount, color: "var(--color-text-tertiary)" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="p-4"
            style={{
              backgroundColor: "var(--color-bg-secondary)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-xl)",
            }}
          >
            <p className="mb-1 text-sm" style={{ color: "var(--color-text-tertiary)" }}>
              {stat.label}
            </p>
            <p className="text-2xl font-bold" style={{ color: stat.color }}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Pages */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold" style={{ color: "var(--color-text-primary)" }}>
          Pages
        </h2>
        <Link
          href={`/book/${siteId}/editor/new`}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-white transition"
          style={{ backgroundColor: "var(--color-primary)", borderRadius: "var(--radius-lg)" }}
        >
          <Plus size={14} />
          New Page
        </Link>
      </div>

      {allPages.length === 0 ? (
        <div
          className="p-12 text-center"
          style={{
            backgroundColor: "var(--color-bg-secondary)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-xl)",
          }}
        >
          <FileText size={40} style={{ color: "var(--color-text-tertiary)" }} className="mx-auto mb-3" />
          <p className="mb-4" style={{ color: "var(--color-text-secondary)" }}>
            No pages yet. Create your first page to get started.
          </p>
          <Link
            href={`/book/${siteId}/editor/new`}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm text-white transition"
            style={{ backgroundColor: "var(--color-primary)", borderRadius: "var(--radius-lg)" }}
          >
            <Plus size={16} />
            New Page
          </Link>
        </div>
      ) : (
        <div
          className="divide-y [&>*+*]:border-[var(--color-border)]"
          style={{
            backgroundColor: "var(--color-bg-secondary)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-xl)",
          }}
        >
          {allPages.map((page) => (
            <div key={page.id} className="flex items-center justify-between px-5 py-3.5 transition hover:opacity-80">
              <div className="flex min-w-0 items-center gap-3">
                <FileText size={16} style={{ color: "var(--color-text-tertiary)" }} className="shrink-0" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
                    {page.title}
                  </p>
                  <p className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
                    /{page.slug}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-4">
                <span className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
                  {new Date(page.updated_at).toLocaleDateString()}
                </span>
                {page.is_published ? (
                  <Eye size={16} style={{ color: "var(--color-success)" }} />
                ) : (
                  <EyeOff size={16} style={{ color: "var(--color-text-tertiary)" }} />
                )}
                <Link
                  href={`/book/${siteId}/editor/${page.id}`}
                  className="text-sm transition"
                  style={{ color: "var(--color-primary)" }}
                >
                  Edit
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
