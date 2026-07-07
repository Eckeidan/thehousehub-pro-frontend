"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock3, Loader2, Search, ShieldCheck } from "lucide-react";
import SuperOwnerShell from "@/components/SuperOwnerShell";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type StoredUser = {
  id?: string;
  fullName?: string;
  email?: string;
  role?: string;
};

type AuditLog = {
  id: string;
  action: string;
  path: string;
  method?: string | null;
  statusCode?: number | null;
  ipAddress?: string | null;
  createdAt: string;
  actorEmail?: string | null;
  actorRole?: string | null;
  organization?: { name: string } | null;
};

type PermissionsResponse = {
  accessAll: boolean;
  permissions: string[];
};

function formatDate(value?: string | null) {
  if (!value) return "N/A";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function SuperOwnerAuditPage() {
  const router = useRouter();
  const [user, setUser] = useState<StoredUser | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [permissions, setPermissions] = useState<PermissionsResponse | null>(null);
  const [audit, setAudit] = useState<AuditLog[]>([]);

  const canReadAudit =
    permissions?.accessAll ||
    permissions?.permissions?.includes("audit:read") ||
    permissions?.permissions?.includes("*");

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userRaw = localStorage.getItem("user");

    if (!token || !userRaw) {
      router.replace("/");
      return;
    }

    try {
      const parsedUser: StoredUser = JSON.parse(userRaw);
      if (String(parsedUser.role || "").toUpperCase() !== "SUPER_OWNER") {
        router.replace("/");
        return;
      }
      setUser(parsedUser);
      setCheckingAuth(false);
    } catch {
      router.replace("/");
    }
  }, [router]);

  const apiFetch = useCallback(async <TData,>(path: string): Promise<TData> => {
    const token = localStorage.getItem("token");
    const res = await fetch(`${API_BASE}${path}`, {
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${token || ""}`,
      },
    });

    if (res.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      router.replace("/");
      throw new Error("Unauthorized");
    }

    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error || "Request failed");
    return data as TData;
  }, [router]);

  const loadAudit = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const permissionsData = await apiFetch<PermissionsResponse>("/api/super-owner/permissions");
      setPermissions(permissionsData);

      if (
        permissionsData.accessAll ||
        permissionsData.permissions.includes("audit:read") ||
        permissionsData.permissions.includes("*")
      ) {
        const data = await apiFetch<AuditLog[]>("/api/super-owner/audit?limit=150");
        setAudit(data);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load audit.");
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    if (checkingAuth) return;
    loadAudit();
  }, [checkingAuth, loadAudit]);

  const filteredAudit = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return audit;

    return audit.filter((event) =>
      [
        event.actorEmail || "",
        event.actorRole || "",
        event.action,
        event.path,
        event.method || "",
        event.organization?.name || "Platform",
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalized)
    );
  }, [audit, query]);

  if (checkingAuth || loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
        <Loader2 className="mr-3 h-5 w-5 animate-spin" />
        Loading audit...
      </main>
    );
  }

  return (
    <SuperOwnerShell
      user={user}
      activeItem="audit"
      title="Audit"
      subtitle="Voir qui fait quoi, quand, et dans quelle organisation."
      actions={
        <div className="relative w-full sm:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search audit..."
            className="w-full rounded-2xl border border-slate-200 bg-white px-10 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500"
          />
        </div>
      }
    >
      <div className="space-y-6">
        {error && (
          <div className="rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-100">
            {error}
          </div>
        )}

        <section className="grid gap-4 md:grid-cols-3">
          <Metric label="Audit Events" value={audit.length} />
          <Metric label="Visible Results" value={filteredAudit.length} />
          <Metric label="Access" value={canReadAudit ? "Granted" : "Blocked"} />
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04] dark:shadow-2xl dark:shadow-black/20">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-blue-600 dark:text-blue-300" />
            <h2 className="text-xl font-black text-slate-950 dark:text-white">
              System Audit Trail
            </h2>
          </div>

          <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10">
            <div className="hidden grid-cols-[1.1fr_1fr_0.9fr_0.8fr_0.7fr] border-b border-slate-200 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-400 dark:border-white/10 dark:text-slate-500 md:grid">
              <span>Actor</span>
              <span>Action</span>
              <span>Organization</span>
              <span>Endpoint</span>
              <span>When</span>
            </div>

            {!canReadAudit ? (
              <EmptyState title="No audit permission" text="Grant audit:read to inspect system activity." />
            ) : filteredAudit.length === 0 ? (
              <EmptyState title="No audit events" text="No event matches this search." />
            ) : (
              filteredAudit.map((event) => (
                <div
                  key={event.id}
                  className="grid gap-3 border-t border-slate-200 px-4 py-4 text-sm first:border-t-0 dark:border-white/10 md:grid-cols-[1.1fr_1fr_0.9fr_0.8fr_0.7fr]"
                >
                  <div>
                    <p className="font-bold text-slate-950 dark:text-white">{event.actorEmail || "Unknown actor"}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">{event.actorRole || "No role"}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-950 dark:text-white">{event.action}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">Status {event.statusCode || "-"}</p>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300">{event.organization?.name || "Platform"}</p>
                  <div>
                    <p className="font-semibold text-slate-950 dark:text-white">{event.method || "API"}</p>
                    <p className="break-all text-xs text-slate-400 dark:text-slate-500">{event.path}</p>
                  </div>
                  <p className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                    <Clock3 size={14} />
                    {formatDate(event.createdAt)}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </SuperOwnerShell>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04] dark:shadow-2xl dark:shadow-black/20">
      <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-black tracking-tight text-slate-950 dark:text-white">{value}</p>
    </div>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="p-8 text-center">
      <p className="font-bold text-slate-950 dark:text-white">{title}</p>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{text}</p>
    </div>
  );
}
