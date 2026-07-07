"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  Building2,
  CircleDollarSign,
  Clock3,
  Eye,
  KeyRound,
  Loader2,
  LogOut,
  Moon,
  Search,
  ShieldCheck,
  Sun,
  UserPlus,
  Users,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const THEME_KEY = "thehousehub.superOwnerTheme";

type ThemeMode = "light" | "dark";

type StoredUser = {
  id?: string;
  fullName?: string;
  email?: string;
  role?: string;
  platformAccessAll?: boolean;
  platformPermissions?: string[];
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
  phone?: string | null;
  companyName?: string | null;
  createdAt: string;
  counts?: Counts;
  _count?: Counts;
  paymentVolume?: number;
  users?: OrganizationUser[];
};

type OrganizationUser = {
  id: string;
  fullName: string;
  email: string;
  role: string;
  isActive: boolean;
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

type AuditLog = {
  id: string;
  action: string;
  path: string;
  statusCode?: number | null;
  createdAt: string;
  actorEmail?: string | null;
  actorRole?: string | null;
  organization?: { name: string } | null;
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
  availablePermissions: string[];
};

const themeClass = {
  light: {
    page: "bg-slate-100 text-slate-950",
    header: "border-slate-200 bg-white/95",
    card: "border-slate-200 bg-white shadow-sm",
    softCard: "border-slate-200 bg-slate-50",
    subtle: "text-slate-500",
    muted: "text-slate-600",
    title: "text-slate-950",
    input: "border-slate-200 bg-white text-slate-950 placeholder:text-slate-400 focus:border-blue-500",
    divider: "border-slate-200",
    chip: "border-emerald-200 bg-emerald-50 text-emerald-700",
    empty: "border-slate-300 bg-slate-50 text-slate-500",
    dangerButton: "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100",
    themeButton: "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
  },
  dark: {
    page: "bg-slate-950 text-slate-100",
    header: "border-white/10 bg-slate-950/95",
    card: "border-white/10 bg-white/[0.04] shadow-2xl shadow-black/20",
    softCard: "border-white/10 bg-slate-900/80",
    subtle: "text-slate-500",
    muted: "text-slate-400",
    title: "text-white",
    input: "border-white/10 bg-slate-900 text-white placeholder:text-slate-500 focus:border-blue-400",
    divider: "border-white/10",
    chip: "border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
    empty: "border-white/10 bg-white/[0.02] text-slate-500",
    dangerButton: "border-red-400/20 bg-red-400/10 text-red-100 hover:bg-red-400/20",
    themeButton: "border-white/10 bg-white/5 text-slate-100 hover:bg-white/10",
  },
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
  const [theme, setTheme] = useState<ThemeMode>("dark");
  const [user, setUser] = useState<StoredUser | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [transactions, setTransactions] = useState<TransactionsResponse | null>(null);
  const [audit, setAudit] = useState<AuditLog[]>([]);
  const [permissions, setPermissions] = useState<PermissionsResponse | null>(null);
  const [search, setSearch] = useState("");
  const [supportBusyId, setSupportBusyId] = useState("");
  const [creatingSuperOwner, setCreatingSuperOwner] = useState(false);
  const [createSuperOwnerMessage, setCreateSuperOwnerMessage] = useState("");
  const [newSuperOwnerForm, setNewSuperOwnerForm] = useState({
    fullName: "",
    email: "",
    temporaryPassword: "",
    platformAccessAll: false,
    platformPermissions: [] as string[],
  });

  const t = themeClass[theme];
  const can = useCallback(
    (permission: string) =>
      permissions?.accessAll === true ||
      permissions?.permissions?.includes(permission) ||
      permissions?.permissions?.includes("*"),
    [permissions]
  );
  const canCreateSuperOwner = can("super_owner:create");

  useEffect(() => {
    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme === "light" || savedTheme === "dark") setTheme(savedTheme);

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

  function toggleTheme() {
    setTheme((current) => {
      const next = current === "dark" ? "light" : "dark";
      localStorage.setItem(THEME_KEY, next);
      return next;
    });
  }

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

      const requests: Array<Promise<unknown>> = [
        apiFetch<OverviewResponse>("/api/super-owner/overview"),
        apiFetch<Organization[]>("/api/super-owner/organizations"),
      ];

      if (permissionsData.accessAll || permissionsData.permissions.includes("transactions:read")) {
        requests.push(apiFetch<TransactionsResponse>("/api/super-owner/transactions?limit=100"));
      } else {
        requests.push(Promise.resolve(null));
      }

      if (permissionsData.accessAll || permissionsData.permissions.includes("audit:read")) {
        requests.push(apiFetch<AuditLog[]>("/api/super-owner/audit?limit=80"));
      } else {
        requests.push(Promise.resolve([]));
      }

      const [overviewData, organizationsData, transactionsData, auditData] =
        await Promise.all(requests);

      setOverview(overviewData as OverviewResponse);
      setOrganizations(organizationsData as Organization[]);
      setTransactions(transactionsData as TransactionsResponse | null);
      setAudit(auditData as AuditLog[]);
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

  async function updateUserStatus(
    organizationId: string,
    userId: string,
    action: "suspend" | "reactivate"
  ) {
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

  async function createSuperOwnerAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setCreateSuperOwnerMessage("");

    if (!canCreateSuperOwner) {
      setError("Missing permission: super_owner:create");
      return;
    }

    try {
      setCreatingSuperOwner(true);
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/super-owner/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token || ""}`,
        },
        body: JSON.stringify(newSuperOwnerForm),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Failed to create super owner.");

      setCreateSuperOwnerMessage(
        "Super Owner account created. They must change the temporary password at first login."
      );
      setNewSuperOwnerForm({
        fullName: "",
        email: "",
        temporaryPassword: "",
        platformAccessAll: false,
        platformPermissions: [],
      });
      await loadPlatform();
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Failed to create super owner."
      );
    } finally {
      setCreatingSuperOwner(false);
    }
  }

  function toggleNewSuperOwnerPermission(permission: string) {
    setNewSuperOwnerForm((current) => {
      const exists = current.platformPermissions.includes(permission);
      return {
        ...current,
        platformPermissions: exists
          ? current.platformPermissions.filter((item) => item !== permission)
          : [...current.platformPermissions, permission],
      };
    });
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/";
  }

  const filteredOrganizations = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return organizations;

    return organizations.filter((organization) =>
      [organization.name, organization.email, organization.companyName || ""]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [organizations, search]);

  if (checkingAuth || loading) {
    return (
      <main className={`flex min-h-screen items-center justify-center ${t.page}`}>
        <Loader2 className="mr-3 h-5 w-5 animate-spin" />
        Loading platform command center...
      </main>
    );
  }

  const stats = overview?.stats;

  return (
    <main className={`min-h-screen ${t.page}`}>
      <header className={`border-b px-5 py-5 backdrop-blur md:px-8 ${t.header}`}>
        <div className="mx-auto flex max-w-7xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${t.chip}`}>
              <ShieldCheck size={14} />
              SUPER_OWNER
            </p>
            <h1 className={`mt-3 text-3xl font-bold tracking-tight md:text-4xl ${t.title}`}>
              Platform Command Center
            </h1>
            <p className={`mt-2 max-w-2xl text-sm leading-6 ${t.muted}`}>
              Global oversight with ABAC permissions for organizations, properties, tenants, transactions, support, and audit.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/super-owner/organizations"
              className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition ${t.themeButton}`}
            >
              <Building2 size={16} />
              Organizations
            </Link>

            <button
              onClick={toggleTheme}
              className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl border transition ${t.themeButton}`}
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <div className={`rounded-2xl border px-4 py-3 text-sm ${t.card}`}>
              <p className={`font-semibold ${t.title}`}>{user?.fullName || "Super Owner"}</p>
              <p className={`text-xs ${t.muted}`}>{user?.email}</p>
            </div>

            <button
              onClick={logout}
              className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl border transition ${t.dangerButton}`}
              aria-label="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-6 px-5 py-6 md:px-8">
        {error && (
          <div className="rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Metric theme={theme} icon={<Building2 size={18} />} label="Organizations" value={stats?.organizations || 0} />
          <Metric theme={theme} icon={<Users size={18} />} label="Users" value={stats?.users || 0} />
          <Metric theme={theme} icon={<CircleDollarSign size={18} />} label="Transaction Volume" value={formatCurrency(stats?.paymentVolume || 0)} />
          <Metric theme={theme} icon={<Activity size={18} />} label="Audit Events" value={stats?.auditEvents || 0} />
        </section>

        <section className={`rounded-3xl border p-5 ${t.card}`}>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className={`text-xl font-bold ${t.title}`}>ABAC Permissions</h2>
              <p className={`mt-1 text-sm ${t.muted}`}>
                Access = role SUPER_OWNER plus explicit platform permissions.
              </p>
            </div>
            <p className={`rounded-full border px-3 py-1 text-xs font-semibold ${t.chip}`}>
              {permissions?.accessAll ? "Platform root access" : "Scoped support access"}
            </p>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {(permissions?.permissions || []).map((permission) => (
              <span key={permission} className={`rounded-full border px-3 py-1 text-xs font-medium ${t.softCard}`}>
                {permission}
              </span>
            ))}
          </div>
        </section>

        <section className={`rounded-3xl border p-5 ${t.card}`}>
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className={`flex items-center gap-2 text-xl font-bold ${t.title}`}>
                <UserPlus size={20} />
                Create Super Owner
              </h2>
              <p className={`mt-1 max-w-2xl text-sm ${t.muted}`}>
                Create another platform administrator and assign only the responsibilities they need.
              </p>
            </div>
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${t.chip}`}>
              Required: super_owner:create
            </span>
          </div>

          {!canCreateSuperOwner ? (
            <div className={`mt-5 rounded-2xl border p-4 text-sm ${t.softCard}`}>
              You can view this area, but your account cannot create another Super Owner.
            </div>
          ) : (
            <form onSubmit={createSuperOwnerAccount} className="mt-5 space-y-5">
              {createSuperOwnerMessage && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {createSuperOwnerMessage}
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-3">
                <InputField
                  label="Full Name"
                  value={newSuperOwnerForm.fullName}
                  onChange={(value) =>
                    setNewSuperOwnerForm((current) => ({ ...current, fullName: value }))
                  }
                  theme={theme}
                />
                <InputField
                  label="Email"
                  type="email"
                  value={newSuperOwnerForm.email}
                  onChange={(value) =>
                    setNewSuperOwnerForm((current) => ({ ...current, email: value }))
                  }
                  theme={theme}
                />
                <InputField
                  label="Temporary Password"
                  type="password"
                  value={newSuperOwnerForm.temporaryPassword}
                  onChange={(value) =>
                    setNewSuperOwnerForm((current) => ({
                      ...current,
                      temporaryPassword: value,
                    }))
                  }
                  theme={theme}
                  icon={<KeyRound size={15} />}
                />
              </div>

              <label className={`flex items-start gap-3 rounded-2xl border p-4 ${t.softCard}`}>
                <input
                  type="checkbox"
                  checked={newSuperOwnerForm.platformAccessAll}
                  disabled={!permissions?.accessAll}
                  onChange={(event) =>
                    setNewSuperOwnerForm((current) => ({
                      ...current,
                      platformAccessAll: event.target.checked,
                    }))
                  }
                  className="mt-1 h-4 w-4 rounded border-slate-300"
                />
                <span>
                  <span className={`block text-sm font-semibold ${t.title}`}>
                    Platform root access
                  </span>
                  <span className={`block text-sm ${t.muted}`}>
                    Grants all current and future platform permissions. Only a root Super Owner can grant this.
                  </span>
                </span>
              </label>

              {!newSuperOwnerForm.platformAccessAll && (
                <div>
                  <p className={`mb-3 text-sm font-semibold ${t.title}`}>
                    Responsibilities
                  </p>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {(permissions?.availablePermissions || [])
                      .filter((permission) => permission !== "super_owner:create" || permissions?.accessAll)
                      .map((permission) => (
                        <label
                          key={permission}
                          className={`flex items-start gap-3 rounded-2xl border p-3 ${t.softCard}`}
                        >
                          <input
                            type="checkbox"
                            checked={newSuperOwnerForm.platformPermissions.includes(permission)}
                            onChange={() => toggleNewSuperOwnerPermission(permission)}
                            className="mt-1 h-4 w-4 rounded border-slate-300"
                          />
                          <span>
                            <span className={`block text-sm font-semibold ${t.title}`}>
                              {permission}
                            </span>
                            <span className={`block text-xs ${t.subtle}`}>
                              ABAC responsibility
                            </span>
                          </span>
                        </label>
                      ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={creatingSuperOwner}
                  className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {creatingSuperOwner ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <UserPlus size={16} />
                  )}
                  {creatingSuperOwner ? "Creating..." : "Create Super Owner"}
                </button>
              </div>
            </form>
          )}
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.58fr_0.42fr]">
          <div className={`rounded-3xl border p-5 ${t.card}`}>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className={`text-xl font-bold ${t.title}`}>Organizations</h2>
                <p className={`mt-1 text-sm ${t.muted}`}>
                  Review landlord organizations and support their users.
                </p>
              </div>

              <div className="relative">
                <Search className={`pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${t.subtle}`} />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search organization..."
                  className={`w-full rounded-2xl border px-10 py-3 text-sm outline-none transition md:w-72 ${t.input}`}
                />
              </div>
            </div>

            <div className="mt-5 space-y-4">
              {filteredOrganizations.length === 0 ? (
                <EmptyState theme={theme} title="No organizations yet" text="New landlord accounts will appear here as soon as they onboard." />
              ) : (
                filteredOrganizations.slice(0, 8).map((organization) => {
                  const counts = getCounts(organization);
                  const canSuspend = can("support:suspend_user");
                  const canReactivate = can("support:reactivate_user");

                  return (
                    <article key={organization.id} className={`rounded-2xl border p-4 ${t.softCard}`}>
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <p className={`text-lg font-semibold ${t.title}`}>{organization.name}</p>
                          <p className={`text-sm ${t.muted}`}>{organization.email}</p>
                          <p className={`mt-2 text-xs ${t.subtle}`}>Created {formatDate(organization.createdAt)}</p>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-center text-xs">
                          <MiniStat theme={theme} label="Properties" value={counts.properties} />
                          <MiniStat theme={theme} label="Tenants" value={counts.tenants} />
                          <MiniStat theme={theme} label="Volume" value={formatCurrency(organization.paymentVolume)} />
                        </div>
                      </div>

                      <div className={`mt-4 border-t pt-4 ${t.divider}`}>
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <p className={`text-xs font-semibold uppercase tracking-wide ${t.subtle}`}>
                            Support Users
                          </p>
                          <Link
                            href={`/super-owner/organizations?organizationId=${organization.id}`}
                            className={`inline-flex items-center gap-2 text-xs font-semibold ${theme === "dark" ? "text-blue-300" : "text-blue-700"}`}
                          >
                            <Eye size={14} />
                            View details
                          </Link>
                        </div>

                        <div className="space-y-2">
                          {(organization.users || []).slice(0, 4).map((item) => {
                            const action = item.isActive ? "suspend" : "reactivate";
                            const allowed = item.isActive ? canSuspend : canReactivate;

                            return (
                              <div key={item.id} className={`flex flex-col gap-3 rounded-xl px-3 py-3 md:flex-row md:items-center md:justify-between ${t.card}`}>
                                <div>
                                  <p className={`text-sm font-semibold ${t.title}`}>{item.fullName}</p>
                                  <p className={`text-xs ${t.muted}`}>{item.email} · {item.role}</p>
                                </div>
                                <button
                                  onClick={() => updateUserStatus(organization.id, item.id, action)}
                                  disabled={!allowed || supportBusyId === item.id}
                                  className={`rounded-xl px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-45 ${
                                    item.isActive
                                      ? "border border-amber-300/30 bg-amber-300/10 text-amber-600 hover:bg-amber-300/20"
                                      : "border border-emerald-300/30 bg-emerald-300/10 text-emerald-600 hover:bg-emerald-300/20"
                                  }`}
                                >
                                  {supportBusyId === item.id
                                    ? "Working..."
                                    : item.isActive
                                    ? "Suspend"
                                    : "Reactivate"}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </div>

          <div className="space-y-6">
            <section className={`rounded-3xl border p-5 ${t.card}`}>
              <h2 className={`text-xl font-bold ${t.title}`}>Transactions by Organization</h2>
              <div className="mt-5 space-y-3">
                {!can("transactions:read") ? (
                  <EmptyState theme={theme} title="No transaction permission" text="Grant transactions:read to view platform payments." />
                ) : (transactions?.groupedByOrganization || []).length === 0 ? (
                  <EmptyState theme={theme} title="No transactions" text="Payments will be grouped by organization here." />
                ) : (
                  transactions?.groupedByOrganization.map((group) => (
                    <div key={group.organizationId || "unscoped"} className={`rounded-2xl border p-4 ${t.softCard}`}>
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className={`font-semibold ${t.title}`}>{group.organizationName}</p>
                          <p className={`text-xs ${t.subtle}`}>{group.count} transactions</p>
                        </div>
                        <p className="text-lg font-bold text-emerald-500">{formatCurrency(group.volume)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className={`rounded-3xl border p-5 ${t.card}`}>
              <h2 className={`text-xl font-bold ${t.title}`}>Recent Transactions</h2>
              <div className="mt-5 space-y-3">
                {(transactions?.transactions || []).slice(0, 8).map((transaction) => (
                  <div key={transaction.id} className={`rounded-2xl border p-4 ${t.softCard}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className={`font-semibold ${t.title}`}>{tenantName(transaction)}</p>
                        <p className={`mt-1 text-xs ${t.muted}`}>{transaction.organization?.name || "No organization"} · {propertyName(transaction)}</p>
                        <p className={`mt-1 text-xs ${t.subtle}`}>{formatDate(transaction.paymentDate)} · {transaction.paymentMethod}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-emerald-500">{formatCurrency(transaction.amount)}</p>
                        <p className={`mt-1 text-xs ${t.subtle}`}>{transaction.status}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </section>

        <section className={`rounded-3xl border p-5 ${t.card}`}>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-blue-500" />
            <h2 className={`text-xl font-bold ${t.title}`}>System Audit</h2>
          </div>
          <div className={`mt-5 overflow-hidden rounded-2xl border ${t.divider}`}>
            <div className={`hidden grid-cols-[1.1fr_1fr_0.9fr_0.7fr] border-b px-4 py-3 text-xs font-semibold uppercase tracking-wide md:grid ${t.divider} ${t.subtle}`}>
              <span>Actor</span>
              <span>Action</span>
              <span>Organization</span>
              <span>When</span>
            </div>
            {!can("audit:read") ? (
              <EmptyState theme={theme} title="No audit permission" text="Grant audit:read to inspect system activity." />
            ) : audit.length === 0 ? (
              <EmptyState theme={theme} title="No audit events yet" text="Authenticated mutations will appear after users take actions." />
            ) : (
              audit.slice(0, 20).map((event) => (
                <div key={event.id} className={`grid gap-3 border-t px-4 py-4 text-sm md:grid-cols-[1.1fr_1fr_0.9fr_0.7fr] ${t.divider}`}>
                  <div>
                    <p className={`font-semibold ${t.title}`}>{event.actorEmail || "Unknown actor"}</p>
                    <p className={`text-xs ${t.subtle}`}>{event.actorRole || "No role"}</p>
                  </div>
                  <div>
                    <p className={`font-medium ${t.title}`}>{event.action}</p>
                    <p className={`text-xs ${t.subtle}`}>{event.statusCode || "-"} · {event.path}</p>
                  </div>
                  <p className={t.muted}>{event.organization?.name || "Platform"}</p>
                  <p className={`flex items-center gap-2 ${t.muted}`}>
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
  theme,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  theme: ThemeMode;
}) {
  const t = themeClass[theme];

  return (
    <div className={`rounded-3xl border p-5 ${t.card}`}>
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-500">
        {icon}
      </div>
      <p className={`mt-5 text-sm ${t.muted}`}>{label}</p>
      <p className={`mt-2 text-3xl font-bold tracking-tight ${t.title}`}>{value}</p>
    </div>
  );
}

function MiniStat({
  label,
  value,
  theme,
}: {
  label: string;
  value: string | number;
  theme: ThemeMode;
}) {
  const t = themeClass[theme];

  return (
    <div className={`rounded-xl border px-3 py-2 ${t.card}`}>
      <p className={`font-bold ${t.title}`}>{value}</p>
      <p className={`mt-1 ${t.subtle}`}>{label}</p>
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
  theme,
  type = "text",
  icon,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  theme: ThemeMode;
  type?: string;
  icon?: React.ReactNode;
}) {
  const t = themeClass[theme];

  return (
    <label className="block">
      <span className={`mb-2 block text-sm font-semibold ${t.title}`}>
        {label}
      </span>
      <span className="relative block">
        {icon && (
          <span className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 ${t.subtle}`}>
            {icon}
          </span>
        )}
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={`w-full rounded-2xl border px-4 py-3 text-sm outline-none transition ${
            icon ? "pl-10" : ""
          } ${t.input}`}
        />
      </span>
    </label>
  );
}

function EmptyState({
  title,
  text,
  theme,
}: {
  title: string;
  text: string;
  theme: ThemeMode;
}) {
  const t = themeClass[theme];

  return (
    <div className={`rounded-2xl border border-dashed p-6 text-center ${t.empty}`}>
      <p className={`font-semibold ${t.title}`}>{title}</p>
      <p className={`mt-1 text-sm ${t.subtle}`}>{text}</p>
    </div>
  );
}
