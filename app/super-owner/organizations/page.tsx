"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Home,
  Loader2,
  Search,
  ShieldCheck,
  Users,
  Wallet,
  Wrench,
} from "lucide-react";
import SuperOwnerShell from "@/components/SuperOwnerShell";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

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
  const [user, setUser] = useState<StoredUser | null>(null);
  const [permissions, setPermissions] = useState<PermissionsResponse | null>(null);
  const [organizations, setOrganizations] = useState<OrganizationSummary[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [detail, setDetail] = useState<OrganizationDetail | null>(null);
  const [query, setQuery] = useState("");
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");

  const canReadOrganizations =
    permissions?.accessAll ||
    permissions?.permissions?.includes("organizations:read") ||
    permissions?.permissions?.includes("*");

  useEffect(() => {
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

  const loadOrganizations = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const permissionsData = await apiFetch<PermissionsResponse>("/api/super-owner/permissions");
      setPermissions(permissionsData);

      const rows = await apiFetch<OrganizationSummary[]>("/api/super-owner/organizations");
      setOrganizations(rows);

      setSelectedId((current) => current || rows[0]?.id || "");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load organizations.");
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    if (checkingAuth) return;
    loadOrganizations();
  }, [checkingAuth, loadOrganizations]);

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

  if (checkingAuth || loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
        <Loader2 className="mr-3 h-5 w-5 animate-spin" />
        Loading organizations...
      </main>
    );
  }

  const counts = getCounts(detail);

  return (
    <SuperOwnerShell
      user={user}
      activeItem="organizations"
      title="Organizations"
      subtitle="Inspecter chaque organisation landlord, ses propriétés, tenants, paiements et opérations."
      actions={
        <div className="relative w-full sm:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search organization..."
            className="w-full rounded-2xl border border-slate-200 bg-white px-10 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500"
          />
        </div>
      }
    >
      <div className="grid gap-6 xl:grid-cols-[0.34fr_0.66fr]">
        {error && (
          <div className="rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-100 xl:col-span-2">
            {error}
          </div>
        )}

        <aside className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04] dark:shadow-2xl dark:shadow-black/20">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-950 dark:text-white">Directory</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {organizations.length} organizations
              </p>
            </div>
            <ShieldCheck className="h-5 w-5 text-emerald-500" />
          </div>

          <div className="mt-5 space-y-3">
            {!canReadOrganizations ? (
              <EmptyState title="No access" text="Grant organizations:read to inspect organizations." />
            ) : filteredOrganizations.length === 0 ? (
              <EmptyState title="No organizations" text="No organization matches your search." />
            ) : (
              filteredOrganizations.map((organization) => {
                const active = organization.id === selectedId;
                const rowCounts = getCounts(organization);

                return (
                  <button
                    key={organization.id}
                    onClick={() => setSelectedId(organization.id)}
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      active
                        ? "border-blue-300 bg-blue-50 text-blue-900 dark:border-blue-400/30 dark:bg-blue-400/10 dark:text-blue-100"
                        : "border-slate-200 bg-slate-50 text-slate-700 hover:border-blue-200 hover:bg-blue-50/50 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300 dark:hover:border-blue-400/30 dark:hover:bg-blue-400/10"
                    }`}
                  >
                    <p className="font-black">{organization.name}</p>
                    <p className="mt-1 text-xs opacity-75">{organization.email}</p>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                      <MiniStat label="Properties" value={rowCounts.properties} />
                      <MiniStat label="Tenants" value={rowCounts.tenants} />
                      <MiniStat label="Users" value={rowCounts.users} />
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <section className="space-y-6">
          {detailLoading || !detail ? (
            <div className="flex min-h-[420px] items-center justify-center rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
              <Loader2 className="mr-3 h-5 w-5 animate-spin" />
              Loading organization detail...
            </div>
          ) : (
            <>
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.04] dark:shadow-2xl dark:shadow-black/20">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-800 dark:border-blue-400/20 dark:bg-blue-400/10 dark:text-blue-100">
                      <Building2 size={14} />
                      Organization
                    </p>
                    <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950 dark:text-white">
                      {detail.name}
                    </h2>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{detail.email}</p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      {detail.companyName || "No company name"} · {detail.phone || "No phone"}
                    </p>
                  </div>
                  <p className="text-sm text-slate-400 dark:text-slate-500">
                    Created {formatDate(detail.createdAt)}
                  </p>
                </div>

                <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                  <Metric icon={<Home size={16} />} label="Properties" value={counts.properties} />
                  <Metric icon={<Users size={16} />} label="Tenants" value={counts.tenants} />
                  <Metric icon={<ShieldCheck size={16} />} label="Users" value={counts.users} />
                  <Metric icon={<Wallet size={16} />} label="Payments" value={counts.payments} />
                  <Metric icon={<Wrench size={16} />} label="Maintenance" value={counts.maintenanceRequests} />
                </div>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.04] dark:shadow-2xl dark:shadow-black/20">
                <h3 className="text-xl font-black text-slate-950 dark:text-white">Properties</h3>
                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                  {detail.properties.length === 0 ? (
                    <EmptyState title="No properties" text="This organization has not added properties yet." />
                  ) : (
                    detail.properties.map((property) => (
                      <article key={property.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-black text-slate-950 dark:text-white">{property.name || property.code}</p>
                            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{property.code}</p>
                          </div>
                          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-100">
                            {property.occupancyStatus || "AVAILABLE"}
                          </span>
                        </div>
                        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{propertyAddress(property)}</p>
                        <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                          <MiniStat label="Type" value={property.propertyType || "N/A"} />
                          <MiniStat label="Rent" value={formatCurrency(property.monthlyRent)} />
                          <MiniStat label="Tenants" value={property.tenants?.length || 0} />
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </section>

              <section className="grid gap-6 xl:grid-cols-2">
                <Panel title="Users">
                  {detail.users.map((item) => (
                    <Row key={item.id} title={item.fullName} subtitle={`${item.email} · ${item.role}`} meta={item.isActive ? "Active" : "Inactive"} />
                  ))}
                </Panel>

                <Panel title="Tenants">
                  {detail.tenants.length === 0 ? (
                    <EmptyState title="No tenants" text="No tenant records yet." />
                  ) : (
                    detail.tenants.slice(0, 12).map((item) => (
                      <Row
                        key={item.id}
                        title={`${item.firstName} ${item.lastName}`}
                        subtitle={`${item.email || "No email"} · ${item.property?.name || item.property?.code || "No property"}`}
                        meta={item.status || "ACTIVE"}
                      />
                    ))
                  )}
                </Panel>

                <Panel title="Recent Payments">
                  {detail.payments.length === 0 ? (
                    <EmptyState title="No payments" text="No payment activity yet." />
                  ) : (
                    detail.payments.slice(0, 10).map((item) => (
                      <Row
                        key={item.id}
                        title={formatCurrency(item.amount)}
                        subtitle={`${item.lease?.tenant?.firstName || ""} ${item.lease?.tenant?.lastName || ""}`.trim() || "No tenant"}
                        meta={`${item.status} · ${formatDate(item.paymentDate)}`}
                      />
                    ))
                  )}
                </Panel>

                <Panel title="Maintenance">
                  {detail.maintenanceRequests.length === 0 ? (
                    <EmptyState title="No maintenance" text="No maintenance requests yet." />
                  ) : (
                    detail.maintenanceRequests.slice(0, 10).map((item) => (
                      <Row
                        key={item.id}
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
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
      <div className="mb-3 text-blue-600 dark:text-blue-300">{icon}</div>
      <p className="text-xs text-slate-400 dark:text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-black text-slate-950 dark:text-white">{value}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-slate-950/30">
      <p className="font-black text-slate-950 dark:text-white">{value}</p>
      <p className="mt-1 text-slate-400 dark:text-slate-500">{label}</p>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04] dark:shadow-2xl dark:shadow-black/20">
      <h3 className="text-lg font-black text-slate-950 dark:text-white">{title}</h3>
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  );
}

function Row({ title, subtitle, meta }: { title: string; subtitle: string; meta: string }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
      <div>
        <p className="font-bold text-slate-950 dark:text-white">{title}</p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
      </div>
      <p className="shrink-0 text-xs text-slate-400 dark:text-slate-500">{meta}</p>
    </div>
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
