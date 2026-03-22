import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Plus, ExternalLink, Settings, FileText } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "BlinkBook — My Sites" };

export default async function BookPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let spaces: Array<{
    id: string;
    name: string;
    slug: string;
    description: string | null;
    is_published: boolean;
    updated_at: string;
    page_count: number;
  }> = [];

  if (user) {
    const { data } = await supabase
      .from("bb_spaces")
      .select("id, name, slug, description, is_published, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (data) {
      const spacesWithCounts = await Promise.all(
        data.map(async (space) => {
          const { count } = await supabase
            .from("bb_pages")
            .select("*", { count: "exact", head: true })
            .eq("space_id", space.id);
          return { ...space, page_count: count ?? 0 };
        }),
      );
      spaces = spacesWithCounts;
    }
  }

  if (spaces.length === 0) {
    return (
      <div>
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>
            My Sites
          </h1>
        </div>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div
            className="mb-6 flex h-16 w-16 items-center justify-center"
            style={{
              backgroundColor: "var(--color-bg-secondary)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-xl)",
            }}
          >
            <FileText size={32} style={{ color: "var(--color-text-tertiary)" }} />
          </div>
          <h2
            className="mb-2 text-xl font-semibold"
            style={{ color: "var(--color-text-primary)" }}
          >
            No sites yet
          </h2>
          <p className="mb-8 max-w-md text-sm" style={{ color: "var(--color-text-secondary)" }}>
            Create your first docs site to get started. It only takes a minute.
          </p>
          <Link
            href="/book/new"
            className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-white transition"
            style={{
              backgroundColor: "var(--color-primary)",
              borderRadius: "var(--radius-lg)",
            }}
          >
            <Plus size={16} />
            Create your first docs site
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>
          My Sites
        </h1>
        <Link
          href="/book/new"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white transition"
          style={{
            backgroundColor: "var(--color-primary)",
            borderRadius: "var(--radius-lg)",
          }}
        >
          <Plus size={16} />
          New Site
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {spaces.map((space) => (
          <div
            key={space.id}
            className="group p-5 transition"
            style={{
              backgroundColor: "var(--color-bg-secondary)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-xl)",
            }}
          >
            <div className="mb-3 flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-semibold" style={{ color: "var(--color-text-primary)" }}>
                  {space.name}
                </h3>
                <p className="truncate text-sm" style={{ color: "var(--color-text-tertiary)" }}>
                  {space.slug}.blinkbook.goblink.io
                </p>
              </div>
              <span
                className="ml-2 shrink-0 px-2 py-0.5 text-xs font-medium"
                style={{
                  borderRadius: "var(--radius-full)",
                  color: space.is_published
                    ? "var(--color-success)"
                    : "var(--color-text-tertiary)",
                  backgroundColor: space.is_published
                    ? "rgba(34,197,94,0.1)"
                    : "var(--color-bg-tertiary)",
                  border: `1px solid ${space.is_published ? "rgba(34,197,94,0.2)" : "var(--color-border)"}`,
                }}
              >
                {space.is_published ? "Published" : "Draft"}
              </span>
            </div>

            {space.description && (
              <p
                className="mb-3 line-clamp-2 text-sm"
                style={{ color: "var(--color-text-secondary)" }}
              >
                {space.description}
              </p>
            )}

            <div className="mb-4 flex items-center gap-4 text-xs" style={{ color: "var(--color-text-tertiary)" }}>
              <span>
                {space.page_count} {space.page_count === 1 ? "page" : "pages"}
              </span>
              <span>Updated {new Date(space.updated_at).toLocaleDateString()}</span>
            </div>

            <div
              className="flex items-center gap-2 border-t pt-3"
              style={{ borderColor: "var(--color-border)" }}
            >
              <Link
                href={`/book/${space.id}`}
                className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition"
                style={{ color: "var(--color-text-secondary)" }}
              >
                <FileText size={14} />
                Open
              </Link>
              <Link
                href={`/book/${space.id}/settings`}
                className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition"
                style={{ color: "var(--color-text-secondary)" }}
              >
                <Settings size={14} />
                Settings
              </Link>
              {space.is_published && (
                <a
                  href={`https://${space.slug}.blinkbook.goblink.io`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  <ExternalLink size={14} />
                  View Live
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
