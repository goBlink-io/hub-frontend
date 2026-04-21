"use client";

import { useMemo, useState } from "react";
import { ChevronRight, Search } from "lucide-react";
import type {
  AuditFunction,
  AuditModule,
  PropertyStatus,
} from "@/types/audit";

interface ModuleTableProps {
  modules: AuditModule[];
}

const statusTint: Record<PropertyStatus, string> = {
  verified: "var(--color-success)",
  violated: "var(--color-danger)",
  unknown: "var(--color-warning)",
  "no-spec": "var(--color-text-muted)",
};

export function ModuleTable({ modules }: ModuleTableProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return modules;
    return modules
      .map((mod) => ({
        ...mod,
        functions: mod.functions.filter(
          (fn) =>
            fn.name.toLowerCase().includes(q) ||
            mod.name.toLowerCase().includes(q),
        ),
      }))
      .filter((mod) => mod.functions.length > 0);
  }, [modules, query]);

  if (modules.length === 0) {
    return (
      <div
        className="text-sm p-5 text-center"
        style={{
          color: "var(--color-text-tertiary)",
          backgroundColor: "var(--color-bg-secondary)",
          border: "1px dashed var(--color-border)",
          borderRadius: "var(--radius-lg)",
        }}
      >
        No module data.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: "var(--color-text-muted)" }}
        />
        <input
          type="search"
          placeholder="Filter modules or functions…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full h-10 pl-9 pr-3 text-sm"
          style={{
            backgroundColor: "var(--color-bg-secondary)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            color: "var(--color-text-primary)",
          }}
        />
      </div>

      <div className="space-y-2">
        {filtered.map((mod) => (
          <ModuleCard key={mod.name} module={mod} forceOpen={Boolean(query)} />
        ))}
        {filtered.length === 0 && (
          <div
            className="text-xs text-center py-4"
            style={{ color: "var(--color-text-tertiary)" }}
          >
            No matches.
          </div>
        )}
      </div>
    </div>
  );
}

function ModuleCard({
  module,
  forceOpen,
}: {
  module: AuditModule;
  forceOpen: boolean;
}) {
  const [open, setOpen] = useState(false);
  const isOpen = forceOpen || open;
  const counts = module.functions.reduce<Record<PropertyStatus, number>>(
    (acc, fn) => {
      acc[fn.status] = (acc[fn.status] ?? 0) + 1;
      return acc;
    },
    { verified: 0, violated: 0, unknown: 0, "no-spec": 0 },
  );

  return (
    <div
      style={{
        backgroundColor: "var(--color-bg-secondary)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-md)",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-3 w-full px-4 py-3 text-left"
        aria-expanded={isOpen}
      >
        <ChevronRight
          size={14}
          style={{
            color: "var(--color-text-tertiary)",
            transform: isOpen ? "rotate(90deg)" : "none",
            transition: "transform 150ms",
          }}
        />
        <span
          className="flex-1 text-sm font-medium font-mono truncate"
          style={{ color: "var(--color-text-primary)" }}
        >
          {module.name}
        </span>
        <span className="flex items-center gap-1.5 text-[10px] font-mono">
          {counts.verified > 0 && (
            <Pill color={statusTint.verified} label={`${counts.verified}`} abbrev="V" />
          )}
          {counts.violated > 0 && (
            <Pill color={statusTint.violated} label={`${counts.violated}`} abbrev="X" />
          )}
          {counts.unknown > 0 && (
            <Pill color={statusTint.unknown} label={`${counts.unknown}`} abbrev="?" />
          )}
          {counts["no-spec"] > 0 && (
            <Pill color={statusTint["no-spec"]} label={`${counts["no-spec"]}`} abbrev="—" />
          )}
        </span>
      </button>
      {isOpen && (
        <div style={{ borderTop: "1px solid var(--color-border)" }}>
          {module.functions.map((fn) => (
            <FunctionRow key={fn.name} fn={fn} />
          ))}
        </div>
      )}
    </div>
  );
}

function Pill({
  color,
  label,
  abbrev,
}: {
  color: string;
  label: string;
  abbrev: string;
}) {
  return (
    <span
      title={`${abbrev} ${label}`}
      className="inline-flex items-center gap-1 px-1.5 py-0.5"
      style={{
        color,
        backgroundColor: "var(--color-bg-tertiary)",
        borderRadius: "var(--radius-sm)",
      }}
    >
      <span aria-hidden>{abbrev}</span>
      <span>{label}</span>
    </span>
  );
}

function FunctionRow({ fn }: { fn: AuditFunction }) {
  const [open, setOpen] = useState(false);
  const hasSpec =
    (fn.spec?.requires?.length ?? 0) + (fn.spec?.ensures?.length ?? 0) > 0;

  return (
    <div style={{ borderTop: "1px solid var(--color-border)" }}>
      <button
        type="button"
        onClick={() => hasSpec && setOpen((v) => !v)}
        className="flex items-center gap-3 w-full px-4 py-2 text-left"
        style={{ cursor: hasSpec ? "pointer" : "default" }}
        aria-expanded={open}
      >
        <ChevronRight
          size={12}
          style={{
            color: hasSpec ? "var(--color-text-tertiary)" : "transparent",
            transform: open ? "rotate(90deg)" : "none",
            transition: "transform 150ms",
          }}
        />
        <span
          className="flex-1 text-sm font-mono truncate"
          style={{ color: "var(--color-text-primary)" }}
        >
          {fn.name}
          {fn.params?.length > 0 && (
            <span style={{ color: "var(--color-text-muted)" }}>
              ({fn.params.length})
            </span>
          )}
        </span>
        <span
          className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5"
          style={{
            color: statusTint[fn.status] ?? statusTint["no-spec"],
            backgroundColor: "var(--color-bg-tertiary)",
            borderRadius: "var(--radius-sm)",
          }}
        >
          {fn.status}
        </span>
      </button>
      {open && hasSpec && <SpecDetail fn={fn} />}
    </div>
  );
}

function SpecDetail({ fn }: { fn: AuditFunction }) {
  return (
    <div
      className="px-4 py-3 space-y-3 text-xs"
      style={{
        backgroundColor: "var(--color-bg-primary)",
        borderTop: "1px dashed var(--color-border)",
      }}
    >
      {fn.params?.length > 0 && (
        <div>
          <div
            className="text-[10px] uppercase tracking-wider mb-1"
            style={{ color: "var(--color-text-muted)" }}
          >
            Parameters
          </div>
          <ul className="space-y-0.5 font-mono">
            {fn.params.map((p, i) => (
              <li key={i} style={{ color: "var(--color-text-secondary)" }}>
                {p}
              </li>
            ))}
          </ul>
        </div>
      )}
      {fn.spec?.requires?.length > 0 && (
        <SpecBlock
          label="Requires"
          color="var(--color-warning)"
          items={fn.spec.requires}
        />
      )}
      {fn.spec?.ensures?.length > 0 && (
        <SpecBlock
          label="Ensures"
          color="var(--color-success)"
          items={fn.spec.ensures}
        />
      )}
    </div>
  );
}

function SpecBlock({
  label,
  color,
  items,
}: {
  label: string;
  color: string;
  items: string[];
}) {
  return (
    <div>
      <div
        className="text-[10px] uppercase tracking-wider mb-1"
        style={{ color }}
      >
        {label}
      </div>
      <ul className="space-y-0.5 font-mono">
        {items.map((it, i) => (
          <li key={i} style={{ color: "var(--color-text-secondary)" }}>
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
}
