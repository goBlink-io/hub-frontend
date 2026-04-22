"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Search,
  Shield,
  User,
} from "lucide-react";
import { useToast } from "@/contexts/ToastContext";

interface Row {
  id: string;
  role: "user" | "admin";
  email: string | null;
  display_name: string | null;
  signup_method: string;
  created_at: string;
  updated_at: string;
}

interface Response {
  users: Row[];
  total: number;
  limit: number;
  offset: number;
}

const PAGE_SIZE = 50;

export function AdminUsersTable() {
  const { toast } = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [qDebounced, setQDebounced] = useState("");
  const [roleFilter, setRoleFilter] = useState<"" | "user" | "admin">("");
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const id = setTimeout(() => setQDebounced(q.trim()), 300);
    return () => clearTimeout(id);
  }, [q]);

  const setQAndReset = (v: string) => {
    setOffset(0);
    setQ(v);
  };
  const setRoleAndReset = (v: "" | "user" | "admin") => {
    setOffset(0);
    setRoleFilter(v);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("limit", String(PAGE_SIZE));
      params.set("offset", String(offset));
      if (qDebounced) params.set("q", qDebounced);
      if (roleFilter) params.set("role", roleFilter);

      const res = await fetch(`/api/admin/users?${params.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error || `Failed (${res.status})`);
        return;
      }
      const json = (await res.json()) as Response;
      setRows(json.users);
      setTotal(json.total);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, [qDebounced, roleFilter, offset]);

  useEffect(() => {
    void load();
  }, [load]);

  const changeRole = async (row: Row, next: "user" | "admin") => {
    const optimistic = rows.map((r) =>
      r.id === row.id ? { ...r, role: next } : r,
    );
    setRows(optimistic);
    const res = await fetch(`/api/admin/users/${encodeURIComponent(row.id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: next }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      toast(body.error ?? "Failed to change role", "error");
      void load();
      return;
    }
    toast(
      next === "admin"
        ? "Promoted to admin"
        : "Demoted to user",
      "success",
    );
  };

  const pageInfo = useMemo(
    () => ({
      from: total === 0 ? 0 : offset + 1,
      to: Math.min(offset + PAGE_SIZE, total),
    }),
    [offset, total],
  );

  return (
    <section className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-3">
        <div className="relative sm:col-span-2">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: "var(--color-text-muted)" }}
          />
          <input
            type="search"
            value={q}
            onChange={(e) => setQAndReset(e.target.value)}
            placeholder="Search by email"
            className="w-full h-10 pl-9 pr-3 text-sm"
            style={{
              backgroundColor: "var(--color-bg-secondary)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
              color: "var(--color-text-primary)",
            }}
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) =>
            setRoleAndReset(e.target.value as "" | "user" | "admin")
          }
          className="h-10 px-3 text-sm"
          style={{
            backgroundColor: "var(--color-bg-secondary)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            color: "var(--color-text-primary)",
          }}
        >
          <option value="">All roles</option>
          <option value="user">Users</option>
          <option value="admin">Admins</option>
        </select>
      </div>

      {error && (
        <div
          className="text-sm px-4 py-3"
          style={{
            color: "var(--color-danger)",
            backgroundColor: "rgba(239, 68, 68, 0.08)",
            border: "1px solid rgba(239, 68, 68, 0.25)",
            borderRadius: "var(--radius-md)",
          }}
        >
          {error}
        </div>
      )}

      <div
        className="overflow-hidden"
        style={{
          backgroundColor: "var(--color-bg-secondary)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-lg)",
        }}
      >
        <table className="w-full text-sm">
          <thead>
            <tr
              className="text-left"
              style={{
                color: "var(--color-text-muted)",
                borderBottom: "1px solid var(--color-border)",
              }}
            >
              <Th>Email</Th>
              <Th>User ID</Th>
              <Th>Signup</Th>
              <Th>Joined</Th>
              <Th>Role</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {loading &&
              Array(6)
                .fill(null)
                .map((_, i) => (
                  <tr
                    key={i}
                    style={{ borderTop: "1px solid var(--color-border)" }}
                  >
                    <td colSpan={6}>
                      <div
                        className="h-11 mx-4 my-2 animate-pulse"
                        style={{
                          backgroundColor: "var(--color-bg-tertiary)",
                          borderRadius: "var(--radius-sm)",
                        }}
                      />
                    </td>
                  </tr>
                ))}
            {!loading && rows.length === 0 && !error && (
              <tr>
                <td
                  colSpan={6}
                  className="text-center text-sm py-10"
                  style={{ color: "var(--color-text-tertiary)" }}
                >
                  No users match these filters.
                </td>
              </tr>
            )}
            {!loading &&
              rows.map((row) => (
                <tr
                  key={row.id}
                  style={{ borderTop: "1px solid var(--color-border)" }}
                >
                  <td
                    className="px-3 py-2 text-sm"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    {row.email ?? (
                      <span
                        className="italic"
                        style={{ color: "var(--color-text-tertiary)" }}
                      >
                        (wallet-only)
                      </span>
                    )}
                  </td>
                  <td
                    className="px-3 py-2 font-mono text-xs"
                    style={{ color: "var(--color-text-tertiary)" }}
                    title={row.id}
                  >
                    {row.id.slice(0, 8)}…
                  </td>
                  <td
                    className="px-3 py-2 text-xs"
                    style={{ color: "var(--color-text-tertiary)" }}
                  >
                    {row.signup_method}
                  </td>
                  <td
                    className="px-3 py-2 text-xs whitespace-nowrap"
                    style={{ color: "var(--color-text-tertiary)" }}
                  >
                    {new Date(row.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-2">
                    <RolePill role={row.role} />
                  </td>
                  <td className="px-3 py-2 text-right">
                    {row.role === "admin" ? (
                      <button
                        type="button"
                        onClick={() => changeRole(row, "user")}
                        className="text-xs"
                        style={{ color: "var(--color-warning)" }}
                      >
                        Demote
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => changeRole(row, "admin")}
                        className="text-xs"
                        style={{ color: "var(--color-primary)" }}
                      >
                        Promote
                      </button>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-xs">
        <span style={{ color: "var(--color-text-tertiary)" }}>
          {total === 0
            ? "No users"
            : `Showing ${pageInfo.from}–${pageInfo.to} of ${total.toLocaleString()}`}
        </span>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
            disabled={offset === 0 || loading}
            className="h-8 w-8 inline-flex items-center justify-center disabled:opacity-40"
            style={{
              backgroundColor: "var(--color-bg-secondary)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-sm)",
              color: "var(--color-text-primary)",
            }}
            aria-label="Previous page"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            type="button"
            onClick={() =>
              setOffset((o) => (o + PAGE_SIZE >= total ? o : o + PAGE_SIZE))
            }
            disabled={offset + PAGE_SIZE >= total || loading}
            className="h-8 w-8 inline-flex items-center justify-center disabled:opacity-40"
            style={{
              backgroundColor: "var(--color-bg-secondary)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-sm)",
              color: "var(--color-text-primary)",
            }}
            aria-label="Next page"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
      {loading && (
        <div
          className="flex items-center justify-center text-xs gap-1.5"
          style={{ color: "var(--color-text-tertiary)" }}
        >
          <Loader2 size={12} className="animate-spin" /> Refreshing…
        </div>
      )}
    </section>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return (
    <th className="text-[10px] uppercase tracking-wider font-semibold px-3 py-2">
      {children}
    </th>
  );
}

function RolePill({ role }: { role: "user" | "admin" }) {
  const isAdmin = role === "admin";
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-1"
      style={{
        color: isAdmin ? "var(--color-primary)" : "var(--color-text-muted)",
        backgroundColor: "var(--color-bg-tertiary)",
        borderRadius: "var(--radius-sm)",
      }}
    >
      {isAdmin ? <Shield size={11} /> : <User size={11} />}
      {role}
    </span>
  );
}
