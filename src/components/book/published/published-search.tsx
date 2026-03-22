"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, X } from "lucide-react";

interface SearchEntry {
  id: string;
  title: string;
  slug: string;
  content: string;
}

export function PublishedSearch({ spaceSlug }: { spaceSlug: string }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [entries, setEntries] = useState<SearchEntry[]>([]);
  const [results, setResults] = useState<SearchEntry[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!open || fetchedRef.current) return;
    fetchedRef.current = true;
    fetch(`/api/sites/${spaceSlug}/search`)
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setEntries(data); })
      .catch(() => {});
  }, [open, spaceSlug]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setOpen((v) => !v); }
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
    else { setQuery(""); setResults([]); setActiveIdx(0); }
  }, [open]);

  const search = useCallback(
    (q: string) => {
      setQuery(q);
      setActiveIdx(0);
      if (!q.trim()) { setResults([]); return; }
      const lower = q.toLowerCase();
      setResults(
        entries
          .filter((e) => e.title.toLowerCase().includes(lower) || e.content.toLowerCase().includes(lower))
          .slice(0, 10),
      );
    },
    [entries],
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition"
        style={{
          color: "var(--color-text-secondary)",
          backgroundColor: "var(--color-bg-secondary)",
          border: "1px solid var(--color-border)",
        }}
      >
        <Search size={14} />
        <span className="hidden sm:inline">Search...</span>
        <kbd className="ml-2 hidden text-xs sm:inline" style={{ color: "var(--color-text-tertiary)" }}>
          <span className="text-[10px]">&#8984;</span>K
        </kbd>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
          <div
            className="fixed inset-0 backdrop-blur-sm"
            style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
            onClick={() => setOpen(false)}
          />
          <div
            className="relative mx-4 w-full max-w-lg overflow-hidden shadow-2xl"
            style={{
              backgroundColor: "var(--color-bg-secondary)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-xl)",
            }}
          >
            <div className="flex items-center gap-3 px-4" style={{ borderBottom: "1px solid var(--color-border)" }}>
              <Search size={16} style={{ color: "var(--color-text-tertiary)" }} className="shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => search(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, results.length - 1)); }
                  else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)); }
                  else if (e.key === "Enter" && results[activeIdx]) {
                    window.location.href = `/sites/${spaceSlug}/${results[activeIdx].slug}`;
                  }
                }}
                placeholder="Search documentation..."
                className="flex-1 bg-transparent py-3 text-sm outline-none"
                style={{ color: "var(--color-text-primary)" }}
              />
              <button
                type="button"
                onClick={() => setOpen(false)}
                style={{ color: "var(--color-text-tertiary)" }}
              >
                <X size={16} />
              </button>
            </div>

            {results.length > 0 && (
              <div className="max-h-80 overflow-y-auto py-2">
                {results.map((r, i) => (
                  <a
                    key={r.id}
                    href={`/sites/${spaceSlug}/${r.slug}`}
                    className="block px-4 py-3 transition"
                    style={{
                      backgroundColor: i === activeIdx ? "var(--color-bg-tertiary)" : "transparent",
                    }}
                    onMouseEnter={() => setActiveIdx(i)}
                  >
                    <p className="mb-0.5 text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
                      {r.title}
                    </p>
                  </a>
                ))}
              </div>
            )}

            {query && results.length === 0 && (
              <div className="py-8 text-center text-sm" style={{ color: "var(--color-text-tertiary)" }}>
                No results found
              </div>
            )}

            {!query && (
              <div className="py-6 text-center text-sm" style={{ color: "var(--color-text-tertiary)" }}>
                Type to search documentation
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
