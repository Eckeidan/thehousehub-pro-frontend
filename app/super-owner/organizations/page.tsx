"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  Home,
  Loader2,
  Moon,
  Search,
  ShieldCheck,
  Sun,
  Users,
  Wallet,
  Wrench,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const THEME_KEY = "thehousehub.superOwnerTheme";

type ThemeMode = "light" | "dark";

type StoredUser = {
  fullName?: string;
  email?: string;
  role?: string;
};

type Counts = {
  users: number;
  properties: number;
  tenants: number;
  payments: number;
  maintenanceRequests: number;
};

type OrganizationSummary = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  companyName?: string | null;
  createdAt: string;
  counts?: Counts;
  _count?: Counts;
};

type PropertyRecord = {
  id: string;
  code: string;
  name?: string | null;
  addressLine1: string;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
  propertyType?: string | null;
  monthlyRent?: string | number | null;
  occupancyStatus?: string | null;
  isActive?: boolean;
  createdAt: string;
  tenants?: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email?: string | null;
    status?: string | null;
  }>;
};

type OrganizationDetail = OrganizationSummary & {
  users: Array<{
    id: string;
    fullName: string;
    email: string;
    role: string;
    isActive: boolean;
    createdAt: string;
  }>;
  properties: PropertyRecord[];
  tenants: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email?: string | null;
    status?: string | null;
    property?: { name?: string | null; code?: string | null } | null;
  }>;
  payments: Array<{
    id: string;
    amount: number;
    paymentDate: string;
    status: string;
    paymentMethod: string;
    lease?: {
      tenant?: { firstName?: string; lastName?: string } | null;
      property?: { name?: string | null; code?: string | null } | null;
    } | null;
  }>;
  maintenanceRequests: Array<{
    id: string;
    requestNumber: string;
    title: string;
    status: string;
    priority: string;
    createdAt: string;
    property?: { name?: string | null; code?: string | null } | null;
    tenant?: { firstName?: string; lastName?: string } | null;
  }>;
  paymentVolume?: number;
};

type PermissionsResponse = {
  accessAll: boolean;
  permissions: string[];
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
    button: "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
    active: "border-blue-200 bg-blue-50 text-blue-800",
    divider: "border-slate-200",
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
    button: "border-white/10 bg-white/5 text-slate-100 hover:bg-white/10",
    active: "border-blue-400/20 bg-blue-400/10 text-blue-100",
    divider: "border-white/10",
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
  }).format(new Date(value));
}

function getCounts(organization?: OrganizationSummary | OrganizationDetail | null): Counts {
  return (
    organization?.counts ||
    organization?._count || {
      users: 0,
      properties: 0,
      tenants: 0,
      payments: 0,
      maintenanceRequests: 0,
    }
  );
}

function propertyAddress(property: PropertyRecord) {
  return [
    property.addressLine1,
    property.addressLine2,
    property.city,
    property.state,
    property.postalCode,
    property.country,
  ]
    .filter(Boolean)
    .join(", ");
}

export default function SuperOwnerOrganizationsPage() {
  const router = useRouter();
  const [theme, setTheme] = useState<ThemeMode>("dark");
  const [user, setUser] = useState<StoredUser | null>(null);
  const [permissions, setPermissions] = useState<PermissionsResponse | null>(null);
  const [organizations, setOrganizations] = useState<OrganizationSummary[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [detail, setDetail] = useState<OrganizationDetail | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");

  const t = themeClass[theme];
  const canReadOrganizations =
    permissions?.accessAll || permissions?.permissions?.includes("organizations:read");

  useEffect(() => {
    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme === "light" || savedTheme === "dark") setTheme(savedTheme);
    const organizationId = new URLSearchParams(window.location.search).get("organizationId");
    if (organizationId) setSelectedId(organizationId);

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
      router.replace("/");
      throw new Error("Unauthorized");
    }

    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error || "Request failed");
    return data as TData;
  }, [router]);

  const loadOrganizations = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const permissionsData = await apiFetch<PermissionsResponse>("/api/super-owner/permissions");
      setPermissions(permissionsData);

      const rows = await apiFetch<OrganizationSummary[]>("/api/super-owner/organizations");
      setOrganizations(rows);

      const nextId = selectedId || rows[0]?.id || "";
      setSelectedId(nextId);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load organizations.");
    } finally {
      setLoading(false);
    }
  }, [apiFetch, selectedId]);

  useEffect(() => {
    loadOrganizations();
  }, [loadOrganizations]);

  useEffect(() => {
    if (!selectedId) return;

    async function loadDetail() {
      try {
        setDetailLoading(true);
        const data = await apiFetch<OrganizationDetail>(
          `/api/super-owner/organizations/${selectedId}`
        );
        setDetail(data);
      } catch (detailError) {
        setError(
          detailError instanceof Error
            ? detailError.message
            : "Unable to load organization detail."
        );
      } finally {
        setDetailLoading(false);
      }
    }

    loadDetail();
  }, [apiFetch, selectedId]);

  function toggleTheme() {
    setTheme((current) => {
      const next = current === "dark" ? "light" : "dark";
      localStorage.setItem(THEME_KEY, next);
      return next;
    });
  }

  const filteredOrganizations = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return organizations;

    return organizations.filter((organization) =>
      [organization.name, organization.email, organization.companyName || ""]
        .join(" ")
        .toLowerCase()
        .includes(normalized)
    );
  }, [organizations, query]);

  if (loading) {
    return (
      <main className={`flex min-h-screen items-center justify-center ${t.page}`}>
        <Loader2 className="mr-3 h-5 w-5 animate-spin" />
        Loading organizations...
      </main>
    );
  }

  const counts = getCounts(detail);

  return (
    <main className={`min-h-screen ${t.page}`}>
      <header className={`border-b px-5 py-5 backdrop-blur md:px-8 ${t.header}`}>
        <div className="mx-auto flex max-w-7xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Link
              href="/super-owner"
              className={`inline-flex items-center gap-2 text-sm font-semibold ${t.muted}`}
            >
              <ArrowLeft size={16} />
              Back to Command Center
            </Link>
            <h1 className={`mt-3 text-3xl font-bold tracking-tight ${t.title}`}>
              Organizations
            </h1>
            <p className={`mt-2 max-w-2xl text-sm leading-6 ${t.muted}`}>
              Inspect every landlord organization, its users, properties, tenants, payments, and operational status.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className={`rounded-2xl border px-4 py-3 text-sm ${t.card}`}>
              <p className={`font-semibold ${t.title}`}>{user?.fullName || "Super Owner"}</p>
              <p className={`text-xs ${t.muted}`}>{user?.email}</p>
            </div>
            <button
              onClick={toggleTheme}
              className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl border transition ${t.button}`}
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-5 py-6 md:px-8 xl:grid-cols-[0.34fr_0.66fr]">
        {error && (
          <div className="rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700 xl:col-span-2">
            {error}
          </div>
        )}

        <aside className={`rounded-3xl border p-5 ${t.card}`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className={`text-lg font-bold ${t.title}`}>Directory</h2>
              <p className={`mt-1 text-sm ${t.muted}`}>{organizations.length} organizations</p>
            </div>
            <ShieldCheck className="h-5 w-5 text-emerald-500" />
          </div>

          <div className="relative mt-5">
            <Search className={`pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${t.subtle}`} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search organization..."
              className={`w-full rounded-2xl border px-10 py-3 text-sm outline-none transition ${t.input}`}
            />
          </div>

          <div className="mt-5 space-y-3">
            {!canReadOrganizations ? (
              <EmptyState theme={theme} title="No access" text="Grant organizations:read to inspect organizations." />
            ) : filteredOrganizations.length === 0 ? (
              <EmptyState theme={theme} title="No organizations" text="No organization matches your search." />
            ) : (
              filteredOrganizations.map((organization) => {
                const active = organization.id === selectedId;
                const rowCounts = getCounts(organization);

                return (
                  <button
                    key={organization.id}
                    onClick={() => setSelectedId(organization.id)}
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      active ? t.active : t.softCard
                    }`}
                  >
                    <p className={`font-semibold ${active ? "" : t.title}`}>{organization.name}</p>
                    <p className={`mt-1 text-xs ${active ? "" : t.muted}`}>{organization.email}</p>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                      <MiniStat theme={theme} label="Properties" value={rowCounts.properties} />
                      <MiniStat theme={theme} label="Tenants" value={rowCounts.tenants} />
                      <MiniStat theme={theme} label="Users" value={rowCounts.users} />
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <section className="space-y-6">
          {detailLoading || !detail ? (
            <div className={`flex min-h-[420px] items-center justify-center rounded-3xl border ${t.card}`}>
              <Loader2 className="mr-3 h-5 w-5 animate-spin" />
              Loading organization detail...
            </div>
          ) : (
            <>
              <section className={`rounded-3xl border p-6 ${t.card}`}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${t.active}`}>
                      <Building2 size={14} />
                      Organization
                    </p>
                    <h2 className={`mt-4 text-3xl font-bold tracking-tight ${t.title}`}>
                      {detail.name}
                    </h2>
                    <p className={`mt-2 text-sm ${t.muted}`}>{detail.email}</p>
                    <p className={`mt-1 text-sm ${t.muted}`}>
                      {detail.companyName || "No company name"} · {detail.phone || "No phone"}
                    </p>
                  </div>
                  <p className={`text-sm ${t.subtle}`}>
                    Created {formatDate(detail.createdAt)}
                  </p>
                </div>

                <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                  <Metric theme={theme} icon={<Home size={16} />} label="Properties" value={counts.properties} />
                  <Metric theme={theme} icon={<Users size={16} />} label="Tenants" value={counts.tenants} />
                  <Metric theme={theme} icon={<ShieldCheck size={16} />} label="Users" value={counts.users} />
                  <Metric theme={theme} icon={<Wallet size={16} />} label="Payments" value={counts.payments} />
                  <Metric theme={theme} icon={<Wrench size={16} />} label="Maintenance" value={counts.maintenanceRequests} />
                </div>
              </section>

              <section className={`rounded-3xl border p-6 ${t.card}`}>
                <h3 className={`text-xl font-bold ${t.title}`}>Properties</h3>
                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                  {detail.properties.length === 0 ? (
                    <EmptyState theme={theme} title="No properties" text="This organization has not added properties yet." />
                  ) : (
                    detail.properties.map((property) => (
                      <article key={property.id} className={`rounded-2xl border p-4 ${t.softCard}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className={`font-semibold ${t.title}`}>{property.name || property.code}</p>
                            <p className={`mt-1 text-xs ${t.subtle}`}>{property.code}</p>
                          </div>
                          <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${t.active}`}>
                            {property.occupancyStatus || "AVAILABLE"}
                          </span>
                        </div>
                        <p className={`mt-3 text-sm ${t.muted}`}>{propertyAddress(property)}</p>
                        <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                          <MiniStat theme={theme} label="Type" value={property.propertyType || "N/A"} />
                          <MiniStat theme={theme} label="Rent" value={formatCurrency(property.monthlyRent)} />
                          <MiniStat theme={theme} label="Tenants" value={property.tenants?.length || 0} />
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </section>

              <section className="grid gap-6 xl:grid-cols-2">
                <Panel theme={theme} title="Users">
                  {detail.users.map((item) => (
                    <Row key={item.id} theme={theme} title={item.fullName} subtitle={`${item.email} · ${item.role}`} meta={item.isActive ? "Active" : "Inactive"} />
                  ))}
                </Panel>

                <Panel theme={theme} title="Tenants">
                  {detail.tenants.length === 0 ? (
                    <EmptyState theme={theme} title="No tenants" text="No tenant records yet." />
                  ) : (
                    detail.tenants.slice(0, 12).map((item) => (
                      <Row
                        key={item.id}
                        theme={theme}
                        title={`${item.firstName} ${item.lastName}`}
                        subtitle={`${item.email || "No email"} · ${item.property?.name || item.property?.code || "No property"}`}
                        meta={item.status || "ACTIVE"}
                      />
                    ))
                  )}
                </Panel>

                <Panel theme={theme} title="Recent Payments">
                  {detail.payments.length === 0 ? (
                    <EmptyState theme={theme} title="No payments" text="No payment activity yet." />
                  ) : (
                    detail.payments.slice(0, 10).map((item) => (
                      <Row
                        key={item.id}
                        theme={theme}
                        title={formatCurrency(item.amount)}
                        subtitle={`${item.lease?.tenant?.firstName || ""} ${item.lease?.tenant?.lastName || ""}`.trim() || "No tenant"}
                        meta={`${item.status} · ${formatDate(item.paymentDate)}`}
                      />
                    ))
                  )}
                </Panel>

                <Panel theme={theme} title="Maintenance">
                  {detail.maintenanceRequests.length === 0 ? (
                    <EmptyState theme={theme} title="No maintenance" text="No maintenance requests yet." />
                  ) : (
                    detail.maintenanceRequests.slice(0, 10).map((item) => (
                      <Row
                        key={item.id}
                        theme={theme}
                        title={item.title}
                        subtitle={`${item.requestNumber} · ${item.property?.name || item.property?.code || "No property"}`}
                        meta={`${item.priority} · ${item.status}`}
                      />
                    ))
                  )}
                </Panel>
              </section>
            </>
          )}
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
    <div className={`rounded-2xl border p-4 ${t.softCard}`}>
      <div className="mb-3 text-blue-500">{icon}</div>
      <p className={`text-xs ${t.subtle}`}>{label}</p>
      <p className={`mt-1 text-lg font-bold ${t.title}`}>{value}</p>
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

function Panel({
  title,
  children,
  theme,
}: {
  title: string;
  children: React.ReactNode;
  theme: ThemeMode;
}) {
  const t = themeClass[theme];

  return (
    <section className={`rounded-3xl border p-5 ${t.card}`}>
      <h3 className={`text-lg font-bold ${t.title}`}>{title}</h3>
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  );
}

function Row({
  title,
  subtitle,
  meta,
  theme,
}: {
  title: string;
  subtitle: string;
  meta: string;
  theme: ThemeMode;
}) {
  const t = themeClass[theme];

  return (
    <div className={`flex items-start justify-between gap-3 rounded-2xl border p-4 ${t.softCard}`}>
      <div>
        <p className={`font-semibold ${t.title}`}>{title}</p>
        <p className={`mt-1 text-sm ${t.muted}`}>{subtitle}</p>
      </div>
      <p className={`shrink-0 text-xs ${t.subtle}`}>{meta}</p>
    </div>
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
    <div className={`rounded-2xl border border-dashed p-6 text-center ${t.softCard}`}>
      <p className={`font-semibold ${t.title}`}>{title}</p>
      <p className={`mt-1 text-sm ${t.subtle}`}>{text}</p>
    </div>
  );
}
