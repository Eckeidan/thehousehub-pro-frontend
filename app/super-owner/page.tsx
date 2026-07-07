"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  Building2,
  CircleDollarSign,
  Eye,
  Loader2,
  ShieldCheck,
  Users,
  Wrench,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import SuperOwnerShell from "@/components/SuperOwnerShell";

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

type Counts = {
  users: number;
  properties: number;
  tenants: number;
  payments: number;
  maintenanceRequests: number;
};

type Organization = {
  id: string;
  name: string;
  email: string;
  companyName?: string | null;
  createdAt: string;
  counts?: Counts;
  _count?: Counts;
  paymentVolume?: number;
};

type PlatformTransaction = {
  id: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  status: string;
  organization?: { name: string } | null;
  lease?: {
    tenant?: { firstName?: string; lastName?: string } | null;
    property?: { name?: string | null; code?: string | null } | null;
  } | null;
};

type OverviewResponse = {
  stats: PlatformStats;
  organizations: Organization[];
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

type PermissionsResponse = {
  accessAll: boolean;
  permissions: string[];
};

const chartColors = ["#2563eb", "#14b8a6", "#8b5cf6", "#f59e0b", "#ef4444"];

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

function getCounts(organization: Organization): Counts {
  return (
    organization.counts ||
    organization._count || {
      users: 0,
      properties: 0,
      tenants: 0,
      payments: 0,
      maintenanceRequests: 0,
    }
  );
}

function tenantName(transaction: PlatformTransaction) {
  const tenant = transaction.lease?.tenant;
  return `${tenant?.firstName || ""} ${tenant?.lastName || ""}`.trim() || "No tenant";
}

function propertyName(transaction: PlatformTransaction) {
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
  const [transactions, setTransactions] = useState<TransactionsResponse | null>(null);
  const [permissions, setPermissions] = useState<PermissionsResponse | null>(null);

  const can = useCallback(
    (permission: string) =>
      permissions?.accessAll === true ||
      permissions?.permissions?.includes(permission) ||
      permissions?.permissions?.includes("*"),
    [permissions]
  );

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

  const loadPlatform = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const permissionsData = await apiFetch<PermissionsResponse>("/api/super-owner/permissions");
      setPermissions(permissionsData);

      const [overviewData, transactionsData] = await Promise.all([
        apiFetch<OverviewResponse>("/api/super-owner/overview"),
        permissionsData.accessAll || permissionsData.permissions.includes("transactions:read")
          ? apiFetch<TransactionsResponse>("/api/super-owner/transactions?limit=100")
          : Promise.resolve(null),
      ]);

      setOverview(overviewData);
      setTransactions(transactionsData);
    } catch (loadError) {
      console.error("Super owner dashboard load error:", loadError);
      setError(loadError instanceof Error ? loadError.message : "Unable to load platform data.");
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    if (checkingAuth) return;
    loadPlatform();
  }, [checkingAuth, loadPlatform]);

  const stats = overview?.stats;

  const systemChartData = useMemo(
    () => [
      { name: "Organizations", value: stats?.organizations || 0 },
      { name: "Users", value: stats?.users || 0 },
      { name: "Properties", value: stats?.properties || 0 },
      { name: "Tenants", value: stats?.tenants || 0 },
      { name: "Open Maintenance", value: stats?.openMaintenance || 0 },
    ],
    [stats]
  );

  const organizationChartData = useMemo(() => {
    return (overview?.organizations || [])
      .slice(0, 8)
      .map((organization) => {
        const counts = getCounts(organization);
        return {
          name: organization.name,
          properties: counts.properties,
          tenants: counts.tenants,
          users: counts.users,
        };
      });
  }, [overview?.organizations]);

  if (checkingAuth || loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
        <Loader2 className="mr-3 h-5 w-5 animate-spin" />
        Loading platform dashboard...
      </main>
    );
  }

  return (
    <SuperOwnerShell
      user={user}
      activeItem="dashboard"
      title="Dashboard"
      subtitle="Vue graphique du système: organisations, utilisateurs, propriétés, transactions et activité opérationnelle."
      actions={
        <Link
          href="/super-owner/organizations"
          className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
        >
          <Eye size={16} />
          View Organizations
        </Link>
      }
    >
      <div className="space-y-6">
        {error && (
          <div className="rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-100">
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
          <Panel title="Platform Growth">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={organizationChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-200 dark:text-white/10" />
                  <XAxis dataKey="name" tick={{ fill: "currentColor", fontSize: 12 }} className="text-slate-500 dark:text-slate-400" />
                  <YAxis tick={{ fill: "currentColor", fontSize: 12 }} className="text-slate-500 dark:text-slate-400" />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 16,
                      border: "1px solid rgba(148, 163, 184, 0.25)",
                      background: "rgba(15, 23, 42, 0.92)",
                      color: "white",
                    }}
                  />
                  <Bar dataKey="properties" fill="#2563eb" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="tenants" fill="#14b8a6" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="users" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel title="System Distribution">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={systemChartData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={72}
                    outerRadius={112}
                    paddingAngle={3}
                  >
                    {systemChartData.map((entry, index) => (
                      <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: 16,
                      border: "1px solid rgba(148, 163, 184, 0.25)",
                      background: "rgba(15, 23, 42, 0.92)",
                      color: "white",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {systemChartData.map((item, index) => (
                <div key={item.name} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/[0.03]">
                  <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: chartColors[index % chartColors.length] }}
                    />
                    {item.name}
                  </span>
                  <span className="font-bold text-slate-950 dark:text-white">{item.value}</span>
                </div>
              ))}
            </div>
          </Panel>
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.42fr_0.58fr]">
          <Panel title="Transactions by Organization">
            <div className="space-y-3">
              {!can("transactions:read") ? (
                <EmptyState title="No transaction permission" text="Grant transactions:read to view platform payments." />
              ) : (transactions?.groupedByOrganization || []).length === 0 ? (
                <EmptyState title="No transactions" text="Payments will be grouped by organization here." />
              ) : (
                transactions?.groupedByOrganization.map((group) => (
                  <div key={group.organizationId || "unscoped"} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-bold text-slate-950 dark:text-white">{group.organizationName}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{group.count} transactions</p>
                      </div>
                      <p className="text-lg font-black text-emerald-600 dark:text-emerald-300">{formatCurrency(group.volume)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Panel>

          <Panel title="Recent Transactions">
            <div className="space-y-3">
              {(transactions?.transactions || []).length === 0 ? (
                <EmptyState title="No recent transactions" text="Recent payments will appear here when organizations start collecting rent." />
              ) : (
                (transactions?.transactions || []).slice(0, 8).map((transaction) => (
                  <div key={transaction.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-bold text-slate-950 dark:text-white">{tenantName(transaction)}</p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {transaction.organization?.name || "No organization"} · {propertyName(transaction)}
                        </p>
                        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                          {formatDate(transaction.paymentDate)} · {transaction.paymentMethod}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-emerald-600 dark:text-emerald-300">{formatCurrency(transaction.amount)}</p>
                        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{transaction.status}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Panel>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <QuickLink
            href="/super-owner/organizations"
            icon={<Building2 size={18} />}
            title="Organizations"
            text="Voir chaque landlord, ses propriétés, tenants et opérations."
          />
          <QuickLink
            href="/super-owner/create-admin"
            icon={<ShieldCheck size={18} />}
            title="Create Admin"
            text="Créer un autre Super Owner avec responsabilités ABAC."
          />
          <QuickLink
            href="/super-owner/audit"
            icon={<Wrench size={18} />}
            title="Audit"
            text="Contrôler qui a fait quoi, quand, et depuis quel contexte."
          />
        </section>
      </div>
    </SuperOwnerShell>
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
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04] dark:shadow-2xl dark:shadow-black/20">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-300">
        {icon}
      </div>
      <p className="mt-5 text-sm text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-black tracking-tight text-slate-950 dark:text-white">{value}</p>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04] dark:shadow-2xl dark:shadow-black/20">
      <h2 className="text-xl font-black text-slate-950 dark:text-white">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center dark:border-white/10 dark:bg-white/[0.02]">
      <p className="font-bold text-slate-950 dark:text-white">{title}</p>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{text}</p>
    </div>
  );
}

function QuickLink({
  href,
  icon,
  title,
  text,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-lg dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-blue-400/40"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-blue-600 transition group-hover:bg-blue-600 group-hover:text-white dark:bg-white/5 dark:text-blue-300">
        {icon}
      </div>
      <p className="mt-4 font-black text-slate-950 dark:text-white">{title}</p>
      <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">{text}</p>
    </Link>
  );
}
