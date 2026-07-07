"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  Building2,
  CircleDollarSign,
  Clock3,
  Loader2,
  LockKeyhole,
  LogOut,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type StoredUser = {
  id?: string;
  fullName?: string;
  email?: string;
  role?: string;
};

type PlatformStats = {
  organizations: number;
  users: number;
  properties: number;
  tenants: number;
  paymentCount: number;
  paymentVolume: number;
  openMaintenance: number;
  auditEvents: number;
};

type OrganizationSummary = {
  id: string;
  name: string;
  email: string;
  companyName?: string | null;
  createdAt: string;
  counts: {
    users: number;
    properties: number;
    tenants: number;
    payments: number;
    maintenanceRequests: number;
  };
  paymentVolume: number;
};

type OrganizationUser = {
  id: string;
  fullName: string;
  email: string;
  role: string;
  isActive: boolean;
};

type Organization = OrganizationSummary & {
  users: OrganizationUser[];
};

type PlatformTransaction = {
  id: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  status: string;
  reference?: string | null;
  organization?: {
    id: string;
    name: string;
    email: string;
    companyName?: string | null;
  } | null;
  lease?: {
    tenant?: { firstName?: string; lastName?: string } | null;
    property?: { name?: string | null; code?: string | null } | null;
  } | null;
};

type AuditLog = {
  id: string;
  action: string;
  resource?: string | null;
  method: string;
  path: string;
  statusCode?: number | null;
  createdAt: string;
  actorEmail?: string | null;
  actorRole?: string | null;
  organization?: { name: string } | null;
};

type OverviewResponse = {
  stats: PlatformStats;
  organizations: OrganizationSummary[];
};

type TransactionsResponse = {
  groupedByOrganization: Array<{
    organizationId: string | null;
    organizationName: string;
    count: number;
    volume: number;
  }>;
  transactions: PlatformTransaction[];
};

function formatCurrency(value: number | string | null | undefined) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

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

function getTenantName(transaction: PlatformTransaction) {
  const tenant = transaction.lease?.tenant;
  return `${tenant?.firstName || ""} ${tenant?.lastName || ""}`.trim() || "No tenant";
}

function getPropertyName(transaction: PlatformTransaction) {
  const property = transaction.lease?.property;
  return property?.name || property?.code || "No property";
}

export default function SuperOwnerPage() {
  const router = useRouter();
  const [user, setUser] = useState<StoredUser | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [transactions, setTransactions] = useState<TransactionsResponse | null>(null);
  const [audit, setAudit] = useState<AuditLog[]>([]);
  const [search, setSearch] = useState("");
  const [supportBusyId, setSupportBusyId] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userRaw = localStorage.getItem("user");

    if (!token || !userRaw) {
      router.replace("/");
      return;
    }

    try {
      const parsedUser: StoredUser = JSON.parse(userRaw);
      const role = String(parsedUser.role || "").toUpperCase();

      if (role !== "SUPER_OWNER") {
        router.replace(role === "TENANT" ? "/tenant" : "/dashboard");
        return;
      }

      setUser(parsedUser);
      setCheckingAuth(false);
    } catch (parseError) {
      console.error("Super owner auth parse error:", parseError);
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      router.replace("/");
    }
  }, [router]);

  const apiFetch = useCallback(async <T,>(path: string): Promise<T> => {
    const token = localStorage.getItem("token");
    const res = await fetch(`${API_BASE}${path}`, {
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${token || ""}`,
      },
    });

    if (res.status === 401 || res.status === 403) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      router.replace("/");
      throw new Error("Unauthorized");
    }

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      throw new Error(data?.error || "Request failed");
    }

    return data as T;
  }, [router]);

  const loadPlatform = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [overviewData, organizationsData, transactionsData, auditData] =
        await Promise.all([
          apiFetch<OverviewResponse>("/api/super-owner/overview"),
          apiFetch<Organization[]>("/api/super-owner/organizations"),
          apiFetch<TransactionsResponse>("/api/super-owner/transactions?limit=100"),
          apiFetch<AuditLog[]>("/api/super-owner/audit?limit=80"),
        ]);

      setOverview(overviewData);
      setOrganizations(organizationsData);
      setTransactions(transactionsData);
      setAudit(auditData);
    } catch (loadError) {
      console.error("Super owner load error:", loadError);
      setError(loadError instanceof Error ? loadError.message : "Unable to load platform data.");
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    if (checkingAuth) return;
    loadPlatform();
  }, [checkingAuth, loadPlatform]);

  async function updateUserStatus(organizationId: string, userId: string, action: "suspend" | "reactivate") {
    try {
      setSupportBusyId(userId);
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${API_BASE}/api/super-owner/organizations/${organizationId}/users/${userId}/${action}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token || ""}`,
          },
        }
      );

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Support action failed");

      await loadPlatform();
    } catch (supportError) {
      setError(
        supportError instanceof Error
          ? supportError.message
          : "Support action failed."
      );
    } finally {
      setSupportBusyId("");
    }
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/";
  }

  const filteredOrganizations = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return organizations;

    return organizations.filter((organization) => {
      const haystack = [
        organization.name,
        organization.email,
        organization.companyName || "",
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [organizations, search]);

  if (checkingAuth || loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <Loader2 className="mr-3 h-5 w-5 animate-spin" />
        Loading platform command center...
      </main>
    );
  }

  const stats = overview?.stats;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-white/10 bg-slate-950/95 px-5 py-5 backdrop-blur md:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-200">
              <ShieldCheck size={14} />
              SUPER_OWNER
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">
              Platform Command Center
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Global oversight for organizations, properties, tenants, transactions, support actions, and audit events.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm">
              <p className="font-semibold text-white">{user?.fullName || "Super Owner"}</p>
              <p className="text-xs text-slate-400">{user?.email}</p>
            </div>
            <button
              onClick={logout}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-red-400/20 bg-red-400/10 text-red-100 transition hover:bg-red-400/20"
              aria-label="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-6 px-5 py-6 md:px-8">
        {error && (
          <div className="rounded-2xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        )}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Metric icon={<Building2 size={18} />} label="Organizations" value={stats?.organizations || 0} />
          <Metric icon={<Users size={18} />} label="Users" value={stats?.users || 0} />
          <Metric icon={<CircleDollarSign size={18} />} label="Transaction Volume" value={formatCurrency(stats?.paymentVolume || 0)} />
          <Metric icon={<Activity size={18} />} label="Audit Events" value={stats?.auditEvents || 0} />
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.58fr_0.42fr]">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">Organizations</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Review every landlord organization and support its users.
                </p>
              </div>

              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search organization..."
                  className="w-full rounded-2xl border border-white/10 bg-slate-900 px-10 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-blue-400 md:w-72"
                />
              </div>
            </div>

            <div className="mt-5 space-y-4">
              {filteredOrganizations.length === 0 ? (
                <EmptyState title="No organizations yet" text="New landlord accounts will appear here as soon as they onboard." />
              ) : (
                filteredOrganizations.map((organization) => (
                  <article key={organization.id} className="rounded-2xl border border-white/10 bg-slate-900/80 p-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <p className="text-lg font-semibold text-white">{organization.name}</p>
                        <p className="text-sm text-slate-400">{organization.email}</p>
                        <p className="mt-2 text-xs text-slate-500">Created {formatDate(organization.createdAt)}</p>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <MiniStat label="Properties" value={organization.counts.properties} />
                        <MiniStat label="Tenants" value={organization.counts.tenants} />
                        <MiniStat label="Volume" value={formatCurrency(organization.paymentVolume)} />
                      </div>
                    </div>

                    <div className="mt-4 border-t border-white/10 pt-4">
                      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Support Users</p>
                      <div className="space-y-2">
                        {(organization.users || []).slice(0, 4).map((item) => (
                          <div key={item.id} className="flex flex-col gap-3 rounded-xl bg-white/[0.03] px-3 py-3 md:flex-row md:items-center md:justify-between">
                            <div>
                              <p className="text-sm font-semibold text-white">{item.fullName}</p>
                              <p className="text-xs text-slate-400">{item.email} · {item.role}</p>
                            </div>
                            <button
                              onClick={() =>
                                updateUserStatus(
                                  organization.id,
                                  item.id,
                                  item.isActive ? "suspend" : "reactivate"
                                )
                              }
                              disabled={supportBusyId === item.id}
                              className={`rounded-xl px-3 py-2 text-xs font-semibold transition disabled:opacity-60 ${
                                item.isActive
                                  ? "border border-amber-300/20 bg-amber-300/10 text-amber-100 hover:bg-amber-300/20"
                                  : "border border-emerald-300/20 bg-emerald-300/10 text-emerald-100 hover:bg-emerald-300/20"
                              }`}
                            >
                              {supportBusyId === item.id
                                ? "Working..."
                                : item.isActive
                                ? "Suspend"
                                : "Reactivate"}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>

          <div className="space-y-6">
            <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
              <h2 className="text-xl font-bold text-white">Transactions by Organization</h2>
              <div className="mt-5 space-y-3">
                {(transactions?.groupedByOrganization || []).length === 0 ? (
                  <EmptyState title="No transactions" text="Payments will be grouped by organization here." />
                ) : (
                  transactions?.groupedByOrganization.map((group) => (
                    <div key={group.organizationId || "unscoped"} className="rounded-2xl bg-slate-900/80 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-white">{group.organizationName}</p>
                          <p className="text-xs text-slate-500">{group.count} transactions</p>
                        </div>
                        <p className="text-lg font-bold text-emerald-300">{formatCurrency(group.volume)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
              <h2 className="text-xl font-bold text-white">Recent Transactions</h2>
              <div className="mt-5 space-y-3">
                {(transactions?.transactions || []).slice(0, 8).map((transaction) => (
                  <div key={transaction.id} className="rounded-2xl bg-slate-900/80 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-white">{getTenantName(transaction)}</p>
                        <p className="mt-1 text-xs text-slate-400">{transaction.organization?.name || "No organization"} · {getPropertyName(transaction)}</p>
                        <p className="mt-1 text-xs text-slate-500">{formatDate(transaction.paymentDate)} · {transaction.paymentMethod}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-emerald-300">{formatCurrency(transaction.amount)}</p>
                        <p className="mt-1 text-xs text-slate-500">{transaction.status}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
          <div className="flex items-center gap-2">
            <LockKeyhole className="h-5 w-5 text-blue-300" />
            <h2 className="text-xl font-bold text-white">System Audit</h2>
          </div>
          <div className="mt-5 overflow-hidden rounded-2xl border border-white/10">
            <div className="hidden grid-cols-[1.1fr_1fr_0.9fr_0.7fr] bg-white/[0.04] px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 md:grid">
              <span>Actor</span>
              <span>Action</span>
              <span>Organization</span>
              <span>When</span>
            </div>
            {audit.length === 0 ? (
              <EmptyState title="No audit events yet" text="Authenticated mutations will appear after users take actions." />
            ) : (
              audit.slice(0, 20).map((event) => (
                <div key={event.id} className="grid gap-3 border-t border-white/10 px-4 py-4 text-sm md:grid-cols-[1.1fr_1fr_0.9fr_0.7fr]">
                  <div>
                    <p className="font-semibold text-white">{event.actorEmail || "Unknown actor"}</p>
                    <p className="text-xs text-slate-500">{event.actorRole || "No role"}</p>
                  </div>
                  <div>
                    <p className="font-medium text-slate-200">{event.action}</p>
                    <p className="text-xs text-slate-500">{event.statusCode || "-"} · {event.path}</p>
                  </div>
                  <p className="text-slate-300">{event.organization?.name || "Platform"}</p>
                  <p className="flex items-center gap-2 text-slate-400">
                    <Clock3 size={14} />
                    {formatDate(event.createdAt)}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-400/10 text-blue-200">
        {icon}
      </div>
      <p className="mt-5 text-sm text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-bold tracking-tight text-white">{value}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
      <p className="font-bold text-white">{value}</p>
      <p className="mt-1 text-slate-500">{label}</p>
    </div>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-center">
      <p className="font-semibold text-white">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{text}</p>
    </div>
  );
}
