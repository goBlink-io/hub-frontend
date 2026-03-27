"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeftRight,
  PieChart,
  CreditCard,
  Store,
  BookOpen,
  Settings,
  Clock,
  Search,
  Command,
} from "lucide-react";
import type { ReactNode } from "react";

interface CommandItem {
  id: string;
  label: string;
  description: string;
  href: string;
  icon: ReactNode;
  keywords: string[];
}

const commands: CommandItem[] = [
  {
    id: "swap",
    label: "Swap",
    description: "Cross-chain token swap",
    href: "/swap",
    icon: <ArrowLeftRight size={18} />,
    keywords: ["swap", "exchange", "trade", "bridge"],
  },
  {
    id: "portfolio",
    label: "Portfolio",
    description: "View your holdings",
    href: "/portfolio",
    icon: <PieChart size={18} />,
    keywords: ["portfolio", "holdings", "balance", "tokens"],
  },
  {
    id: "pay",
    label: "Pay",
    description: "Send & payment links",
    href: "/pay",
    icon: <CreditCard size={18} />,
    keywords: ["pay", "send", "transfer", "payment"],
  },
  {
    id: "merchant",
    label: "Merchant",
    description: "Business payment tools",
    href: "/merchant",
    icon: <Store size={18} />,
    keywords: ["merchant", "business", "pos", "invoices"],
  },
  {
    id: "book",
    label: "Book",
    description: "Documentation sites",
    href: "/book",
    icon: <BookOpen size={18} />,
    keywords: ["book", "docs", "documentation", "pages"],
  },
  {
    id: "settings",
    label: "Settings",
    description: "Account & preferences",
    href: "/settings",
    icon: <Settings size={18} />,
    keywords: ["settings", "account", "preferences", "api"],
  },
  {
    id: "history",
    label: "History",
    description: "Transaction history",
    href: "/history",
    icon: <Clock size={18} />,
    keywords: ["history", "transactions", "activity", "log"],
  },
];

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const filtered = query.length === 0
    ? commands
    : commands.filter((cmd) => {
        const q = query.toLowerCase();
        return (
          cmd.label.toLowerCase().includes(q) ||
          cmd.description.toLowerCase().includes(q) ||
          cmd.keywords.some((kw) => kw.includes(q))
        );
      });

  const open = useCallback(() => {
    setIsOpen(true);
    setQuery("");
    setSelectedIndex(0);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setQuery("");
    setSelectedIndex(0);
  }, []);

  const navigate = useCallback(
    (href: string) => {
      close();
      router.push(href);
    },
    [close, router]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (isOpen) {
          close();
        } else {
          open();
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, open, close]);

  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => (i + 1) % filtered.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => (i - 1 + filtered.length) % filtered.length);
      } else if (e.key === "Enter" && filtered.length > 0) {
        e.preventDefault();
        navigate(filtered[selectedIndex].href);
      } else if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    },
    [filtered, selectedIndex, navigate, close]
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0"
            style={{
              backgroundColor: "rgba(0, 0, 0, 0.6)",
              backdropFilter: "blur(4px)",
              zIndex: "var(--z-command)",
            }}
            onClick={close}
          />

          {/* Palette */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="fixed left-1/2 top-[20%] w-[calc(100%-32px)] max-w-lg -translate-x-1/2 overflow-hidden"
            style={{
              backgroundColor: "var(--color-bg-secondary)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-xl)",
              boxShadow: "0 24px 64px rgba(0, 0, 0, 0.6)",
              zIndex: "var(--z-command)",
            }}
            role="dialog"
            aria-label="Command palette"
          >
            {/* Search input */}
            <div
              className="flex items-center gap-3 px-4 py-3"
              style={{ borderBottom: "1px solid var(--color-border)" }}
            >
              <Search size={18} style={{ color: "var(--color-text-muted)" }} />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a command or search..."
                className="flex-1 bg-transparent outline-none text-base md:text-sm"
                style={{ color: "var(--color-text-primary)" }}
                aria-label="Search commands"
              />
              <kbd
                className="hidden sm:flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-mono"
                style={{
                  color: "var(--color-text-muted)",
                  backgroundColor: "var(--color-bg-tertiary)",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--color-border)",
                }}
              >
                <Command size={10} /> K
              </kbd>
            </div>

            {/* Results */}
            <div className="max-h-72 overflow-y-auto py-2">
              {filtered.length === 0 ? (
                <div
                  className="px-4 py-8 text-center text-sm"
                  style={{ color: "var(--color-text-tertiary)" }}
                >
                  No results found
                </div>
              ) : (
                filtered.map((cmd, index) => (
                  <button
                    key={cmd.id}
                    onClick={() => navigate(cmd.href)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors"
                    style={{
                      backgroundColor:
                        index === selectedIndex
                          ? "var(--color-bg-hover)"
                          : "transparent",
                      color: "var(--color-text-primary)",
                    }}
                    role="option"
                    aria-selected={index === selectedIndex}
                  >
                    <span style={{ color: "var(--color-primary)" }}>
                      {cmd.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{cmd.label}</p>
                      <p
                        className="text-xs truncate"
                        style={{ color: "var(--color-text-tertiary)" }}
                      >
                        {cmd.description}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
