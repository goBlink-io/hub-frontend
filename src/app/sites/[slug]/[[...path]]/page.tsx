import { cache } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getBookAdminClient } from "@/lib/book/book-client";
import { renderTiptapDoc, extractHeadings } from "@/components/book/published/tiptap-renderer";
import { TiptapContent } from "@/components/book/published/tiptap-content";
import { PageviewTracker } from "@/components/book/published/pageview-tracker";
import { BookOpen } from "lucide-react";
import type { BBSpace, BBPage, TiptapDoc } from "@/types/book";

export const revalidate = 300;

const getSpaceAndPages = cache(async function getSpaceAndPages(slug: string) {
  const bookDb = getBookAdminClient();

  let { data: space } = await bookDb
    .from("bb_spaces")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (!space) {
    const { data: domainSpace } = await bookDb
      .from("bb_spaces")
      .select("*")
      .eq("custom_domain", slug)
      .eq("is_published", true)
      .maybeSingle();
    space = domainSpace;
  }

  if (!space) return null;

  const typedSpace = space as BBSpace;

  const { data: pages } = await bookDb
    .from("bb_pages")
    .select("*")
    .eq("space_id", typedSpace.id)
    .eq("is_published", true)
    .order("position", { ascending: true });

  return { space: typedSpace, pages: (pages ?? []) as BBPage[] };
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; path?: string[] }>;
}): Promise<Metadata> {
  const { slug, path } = await params;
  const result = await getSpaceAndPages(slug);
  if (!result || result.pages.length === 0) return {};

  const { space } = result;
  const pageSlug = path?.[0] ?? result.pages[0].slug;
  const currentPage = result.pages.find((p) => p.slug === pageSlug);
  if (!currentPage) return {};

  const title = currentPage.meta_title ?? `${currentPage.title} — ${space.name}`;
  const description =
    currentPage.meta_description ?? space.meta_description ?? space.description ?? `Documentation for ${space.name}`;

  return {
    title,
    description,
    openGraph: { title, description, siteName: space.name, type: "article" },
    twitter: { card: "summary_large_image", title, description },
  };
}

/* ─── Navigation tree ─── */

interface NavItem {
  id: string;
  title: string;
  slug: string;
  parent_id: string | null;
  children: NavItem[];
}

function buildNavTree(pages: BBPage[], parentId: string | null = null): NavItem[] {
  return pages
    .filter((p) => p.parent_id === parentId)
    .sort((a, b) => a.position - b.position)
    .map((page) => ({
      id: page.id,
      title: page.title,
      slug: page.slug,
      parent_id: page.parent_id,
      children: buildNavTree(pages, page.id),
    }));
}

function NavLink({
  item,
  spaceSlug,
  currentSlug,
  primaryColor,
  depth = 0,
}: {
  item: NavItem;
  spaceSlug: string;
  currentSlug: string;
  primaryColor: string;
  depth?: number;
}) {
  const isActive = item.slug === currentSlug;
  return (
    <div>
      <Link
        href={`/sites/${spaceSlug}/${item.slug}`}
        className="block border-l-2 py-1.5 text-sm transition"
        style={{
          paddingLeft: `${depth * 12 + 16}px`,
          color: isActive ? "var(--color-text-primary)" : "var(--color-text-secondary)",
          fontWeight: isActive ? 500 : 400,
          borderColor: isActive ? primaryColor : "transparent",
        }}
      >
        {item.title}
      </Link>
      {item.children.map((child) => (
        <NavLink
          key={child.id}
          item={child}
          spaceSlug={spaceSlug}
          currentSlug={currentSlug}
          primaryColor={primaryColor}
          depth={depth + 1}
        />
      ))}
    </div>
  );
}

/* ─── Page ─── */

export default async function PublishedSitePage({
  params,
}: {
  params: Promise<{ slug: string; path?: string[] }>;
}) {
  const { slug, path } = await params;
  const result = await getSpaceAndPages(slug);

  if (!result || result.pages.length === 0) notFound();

  const { space, pages: allPages } = result;
  const pageSlug = path?.[0] ?? allPages[0].slug;
  const currentPage = allPages.find((p) => p.slug === pageSlug);

  if (!currentPage) notFound();

  const html = renderTiptapDoc(currentPage.content as TiptapDoc);
  const headings = extractHeadings(currentPage.content as TiptapDoc);
  const navTree = buildNavTree(allPages);
  const primaryColor = space.brand_primary_color ?? "#3B82F6";
  const logoUrl = space.brand_logo_url ?? space.logo_url;

  return (
    <div className="min-h-dvh" style={{ backgroundColor: "var(--color-bg-primary)", color: "var(--color-text-primary)" }}>
      {/* Header */}
      <header
        className="sticky top-0 z-30 backdrop-blur-lg"
        style={{
          borderBottom: "1px solid var(--color-border)",
          backgroundColor: "rgba(var(--color-bg-primary-rgb, 9,9,11), 0.8)",
        }}
      >
        <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between px-4 lg:px-8">
          <Link href={`/sites/${space.slug}`} className="flex items-center gap-2.5">
            {logoUrl ? (
              <img src={logoUrl} alt="" className="h-7 w-7 rounded object-contain" />
            ) : (
              <div
                className="flex h-7 w-7 items-center justify-center rounded"
                style={{ background: `linear-gradient(135deg, ${primaryColor}, var(--color-primary))` }}
              >
                <BookOpen size={14} className="text-white" />
              </div>
            )}
            <span className="text-sm font-bold" style={{ color: "var(--color-text-primary)" }}>
              {space.name}
            </span>
          </Link>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1400px]">
        {/* Left sidebar */}
        <aside
          className="hidden w-64 shrink-0 lg:block"
          style={{ borderRight: "1px solid var(--color-border)" }}
        >
          <nav className="sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto px-2 py-6">
            {navTree.map((item) => (
              <NavLink
                key={item.id}
                item={item}
                spaceSlug={space.slug}
                currentSlug={currentPage.slug}
                primaryColor={primaryColor}
              />
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main className="min-w-0 flex-1 px-6 py-8 lg:px-12 lg:py-12">
          <div className="max-w-3xl">
            <h1
              className="mb-8 text-3xl font-bold tracking-tight"
              style={{ color: "var(--color-text-primary)" }}
            >
              {currentPage.title}
            </h1>
            <TiptapContent html={html} />
            <PageviewTracker spaceSlug={slug} pageId={currentPage.id} />
          </div>
        </main>

        {/* Right sidebar: TOC */}
        {headings.length > 0 && (
          <aside className="hidden w-56 shrink-0 xl:block">
            <div className="sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto px-4 py-6">
              <p
                className="mb-3 text-xs font-semibold uppercase tracking-wider"
                style={{ color: "var(--color-text-tertiary)" }}
              >
                On this page
              </p>
              <nav className="space-y-1">
                {headings.map((h) => (
                  <a
                    key={h.id}
                    href={`#${h.id}`}
                    className="block text-sm transition"
                    style={{
                      paddingLeft: `${(h.level - 2) * 12}px`,
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    {h.text}
                  </a>
                ))}
              </nav>
            </div>
          </aside>
        )}
      </div>

      {/* Footer */}
      {!space.brand_hide_powered_by && (
        <footer
          className="py-6 text-center"
          style={{ borderTop: "1px solid var(--color-border)" }}
        >
          <p className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
            Built with{" "}
            <a href="/" className="transition" style={{ color: "var(--color-text-secondary)" }}>
              BlinkBook
            </a>
          </p>
        </footer>
      )}
    </div>
  );
}
