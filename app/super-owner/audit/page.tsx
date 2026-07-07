"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Clock3,
  Globe2,
  Laptop,
  Loader2,
  Search,
  ShieldCheck,
  User,
  X,
  XCircle,
} from "lucide-react";
import SuperOwnerShell from "@/components/SuperOwnerShell";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type StoredUser = {
  id?: string;
  fullName?: string;
  email?: string;
  role?: string;
};

type AuditMetadata = {
  durationMs?: number;
  sensitive?: boolean;
  approximateLocation?: {
    city?: string | null;
    region?: string | null;
    country?: string | null;
  };
};

type AuditLog = {
  id: string;
  action: string;
  resource?: string | null;
  resourceId?: string | null;
  path: string;
  method?: string | null;
  statusCode?: number | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: AuditMetadata | null;
  createdAt: string;
  actorEmail?: string | null;
  actorRole?: string | null;
  actor?: {
    fullName?: string | null;
    email?: string | null;
    role?: string | null;
    isActive?: boolean | null;
  } | null;
  organization?: { name: string; email?: string | null; companyName?: string | null } | null;
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

function statusLabel(statusCode?: number | null) {
  if (!statusCode) return "Unknown result";
  if (statusCode >= 200 && statusCode < 300) return "Successful action";
  if (statusCode >= 400 && statusCode < 500) return "Blocked or rejected";
  if (statusCode >= 500) return "Server error";
  return "Completed";
}

function plainAction(event: AuditLog) {
  const method = String(event.method || "").toUpperCase();
  const resource = event.resource || "system";

  if (method === "POST") return `Created or submitted ${resource}`;
  if (method === "PATCH" || method === "PUT") return `Updated ${resource}`;
  if (method === "DELETE") return `Deleted ${resource}`;
  return event.action || "System action";
}

function approximateLocation(event: AuditLog) {
  const location = event.metadata?.approximateLocation;
  const parts = [location?.city, location?.region, location?.country].filter(Boolean);
  if (parts.length > 0) return parts.join(", ");

  const ip = event.ipAddress || "";
  if (!ip || ip === "::1" || ip.startsWith("127.") || ip.startsWith("10.") || ip.startsWith("192.168.")) {
    return "Local or private network";
  }

  return "Approximation unavailable";
}

function parseDevice(userAgent?: string | null) {
  const raw = String(userAgent || "");
  const browser = raw.includes("Edg/")
    ? "Microsoft Edge"
    : raw.includes("Chrome/")
    ? "Chrome"
    : raw.includes("Safari/") && !raw.includes("Chrome/")
    ? "Safari"
    : raw.includes("Firefox/")
    ? "Firefox"
    : raw
    ? "Unknown browser"
    : "Unknown";

  const os = raw.includes("Mac OS X")
    ? "macOS"
    : raw.includes("Windows")
    ? "Windows"
    : raw.includes("Android")
    ? "Android"
    : raw.includes("iPhone") || raw.includes("iPad")
    ? "iOS"
    : raw.includes("Linux")
    ? "Linux"
    : "Unknown";

  return `${browser} on ${os}`;
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
  const [selectedEvent, setSelectedEvent] = useState<AuditLog | null>(null);

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
        event.actor?.fullName || "",
        event.actorEmail || "",
        event.actorRole || "",
        event.action,
        plainAction(event),
        event.path,
        event.method || "",
        event.organization?.name || "Platform",
        approximateLocation(event),
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
      subtitle="Voir clairement qui a fait quoi, quand, où approximativement, et avec quel résultat."
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

          <div className="mt-5 space-y-3">
            {!canReadAudit ? (
              <EmptyState title="No audit permission" text="Grant audit:read to inspect system activity." />
            ) : filteredAudit.length === 0 ? (
              <EmptyState title="No audit events" text="No event matches this search." />
            ) : (
              filteredAudit.map((event) => {
                const success = (event.statusCode || 0) >= 200 && (event.statusCode || 0) < 300;

                return (
                  <button
                    key={event.id}
                    onClick={() => setSelectedEvent(event)}
                    className="grid w-full gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-blue-300 hover:bg-blue-50 dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-blue-400/40 dark:hover:bg-blue-400/10 lg:grid-cols-[1.2fr_1.2fr_0.8fr_0.8fr]"
                  >
                    <div>
                      <p className="font-black text-slate-950 dark:text-white">
                        {event.actor?.fullName || event.actorEmail || "Unknown actor"}
                      </p>
                      <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                        {event.actorRole || event.actor?.role || "No role"}
                      </p>
                    </div>
                    <div>
                      <p className="font-bold text-slate-950 dark:text-white">{plainAction(event)}</p>
                      <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{event.path}</p>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-950 dark:text-white">
                        {event.organization?.name || "Platform"}
                      </p>
                      <p className="mt-1 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                        <Globe2 size={13} />
                        {approximateLocation(event)}
                      </p>
                    </div>
                    <div className="flex items-start justify-between gap-3 lg:block">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-bold ${
                          success
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-100"
                            : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-100"
                        }`}
                      >
                        {success ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                        {event.statusCode || "-"}
                      </span>
                      <p className="mt-2 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <Clock3 size={14} />
                        {formatDate(event.createdAt)}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </section>
      </div>

      {selectedEvent && (
        <AuditDetailDrawer event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      )}
    </SuperOwnerShell>
  );
}

function AuditDetailDrawer({ event, onClose }: { event: AuditLog; onClose: () => void }) {
  const success = (event.statusCode || 0) >= 200 && (event.statusCode || 0) < 300;

  return (
    <div className="fixed inset-0 z-[80] bg-slate-950/50 backdrop-blur-sm" onClick={onClose}>
      <aside
        className="ml-auto flex h-full w-full max-w-2xl flex-col overflow-y-auto border-l border-slate-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-slate-950"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-800 dark:border-blue-400/20 dark:bg-blue-400/10 dark:text-blue-100">
              <ShieldCheck size={14} />
              Audit Detail
            </p>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950 dark:text-white">
              {plainAction(event)}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
              This record explains the action in plain language so support and leadership can understand what happened without reading raw API logs.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-2xl border border-slate-200 bg-white p-3 text-slate-600 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-white"
            aria-label="Close audit detail"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-white/[0.03]">
          <p className="text-sm font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
            Human Summary
          </p>
          <p className="mt-3 text-lg font-bold leading-8 text-slate-950 dark:text-white">
            {event.actor?.fullName || event.actorEmail || "Someone"} from{" "}
            {event.organization?.name || "the platform"} {plainAction(event).toLowerCase()} on{" "}
            {formatDate(event.createdAt)}. The request was {statusLabel(event.statusCode).toLowerCase()}.
          </p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <DetailCard icon={<User size={18} />} label="Who" value={event.actor?.fullName || event.actorEmail || "Unknown actor"} detail={event.actorEmail || event.actor?.email || event.actorRole || "No email"} />
          <DetailCard icon={<ShieldCheck size={18} />} label="Result" value={statusLabel(event.statusCode)} detail={`HTTP status ${event.statusCode || "-"}`} success={success} />
          <DetailCard icon={<Globe2 size={18} />} label="Approximate Location" value={approximateLocation(event)} detail={event.ipAddress ? `IP: ${event.ipAddress}` : "No IP captured"} />
          <DetailCard icon={<Laptop size={18} />} label="Device" value={parseDevice(event.userAgent)} detail={event.userAgent || "No user agent captured"} />
        </div>

        <div className="mt-6 space-y-4">
          <InfoBlock label="Organization" value={event.organization?.name || "Platform"} />
          <InfoBlock label="Technical Action" value={event.action} />
          <InfoBlock label="Endpoint" value={event.path} mono />
          <InfoBlock label="Resource" value={`${event.resource || "unknown"}${event.resourceId ? ` / ${event.resourceId}` : ""}`} />
          <InfoBlock label="Processing Time" value={event.metadata?.durationMs ? `${event.metadata.durationMs} ms` : "Not available"} />
        </div>
      </aside>
    </div>
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

function DetailCard({
  icon,
  label,
  value,
  detail,
  success,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
  success?: boolean;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
      <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-2xl ${success === false ? "bg-rose-500/10 text-rose-600" : "bg-blue-500/10 text-blue-600 dark:text-blue-300"}`}>
        {icon}
      </div>
      <p className="text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">{label}</p>
      <p className="mt-2 font-black text-slate-950 dark:text-white">{value}</p>
      <p className="mt-1 break-words text-xs leading-5 text-slate-500 dark:text-slate-400">{detail}</p>
    </div>
  );
}

function InfoBlock({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">{label}</p>
      <p className={`mt-2 break-words text-sm text-slate-950 dark:text-white ${mono ? "font-mono" : "font-semibold"}`}>
        {value}
      </p>
    </div>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center dark:border-white/10 dark:bg-white/[0.02]">
      <p className="font-bold text-slate-950 dark:text-white">{title}</p>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{text}</p>
    </div>
  );
}
