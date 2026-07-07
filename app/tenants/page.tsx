"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Users,
  Search,
  Plus,
  Eye,
  Pencil,
  Trash2,
  Phone,
  Mail,
  Building2,
  Home,
  Loader2,
  UserCircle2,
  AlertCircle,
  ShieldCheck,
  CalendarDays,
  MapPin,
  KeyRound,
} from "lucide-react";
import AdminShell from "@/components/AdminShell";

type TenantStatus = "ACTIVE" | "INACTIVE" | "PENDING";
type LeaseStatus = "ACTIVE" | "EXPIRED" | "TERMINATED" | "PENDING";

type StoredUser = {
  id?: string;
  fullName?: string;
  name?: string;
  email?: string;
  role?: string;
  organizationId?: string;
};

interface Property {
  id: string;
  name?: string | null;
  code?: string | null;
}

interface Tenant {
  id: string;
  organizationId?: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  email?: string | null;
  status?: TenantStatus | null;
  isActive?: boolean | null;
  leaseStatus?: LeaseStatus | null;
  leaseStartDate?: string | null;
  leaseEndDate?: string | null;
  property?: Property | null;
  createdAt?: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

function formatDate(date?: string | null) {
  if (!date) return null;
  return new Date(date).toLocaleDateString();
}

function getOccupancyPeriod(tenant: Tenant) {
  const start = formatDate(tenant.leaseStartDate);
  const end = formatDate(tenant.leaseEndDate);

  if (!start && !end) return "Not set";
  if (start && !end) return `${start} → Present`;
  if (!start && end) return `Until ${end}`;

  return `${start} → ${end}`;
}

function getOccupancyDays(tenant: Tenant) {
  if (!tenant.leaseStartDate || !tenant.leaseEndDate) return null;

  const start = new Date(tenant.leaseStartDate).getTime();
  const end = new Date(tenant.leaseEndDate).getTime();

  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
    return null;
  }

  return Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
}

function statusBadge(status: TenantStatus) {
  switch (status) {
    case "ACTIVE":
      return "bg-emerald-100 text-emerald-700 border border-emerald-200";
    case "INACTIVE":
      return "bg-slate-100 text-slate-700 border border-slate-200";
    case "PENDING":
      return "bg-amber-100 text-amber-700 border border-amber-200";
    default:
      return "bg-slate-100 text-slate-700 border border-slate-200";
  }
}

function leaseBadge(status?: LeaseStatus | null) {
  switch (status) {
    case "ACTIVE":
      return "bg-blue-100 text-blue-700 border border-blue-200";
    case "EXPIRED":
      return "bg-rose-100 text-rose-700 border border-rose-200";
    case "TERMINATED":
      return "bg-slate-100 text-slate-700 border border-slate-200";
    case "PENDING":
      return "bg-amber-100 text-amber-700 border border-amber-200";
    default:
      return "bg-gray-100 text-gray-600 border border-gray-200";
  }
}

function getInitials(firstName?: string, lastName?: string) {
  return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
}

function getTenantStatus(tenant: Tenant): TenantStatus {
  if (tenant.status) return tenant.status;
  if (tenant.isActive === false) return "INACTIVE";
  return "ACTIVE";
}

function getTenantName(tenant: Tenant) {
  return `${tenant.firstName || ""} ${tenant.lastName || ""}`.trim() || "Unnamed Tenant";
}

export default function TenantsPage() {
  const router = useRouter();

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | TenantStatus>("ALL");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [error, setError] = useState("");
  const [user, setUser] = useState<StoredUser | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userRaw = localStorage.getItem("user");

    if (!token || !userRaw) {
      router.replace("/");
      return;
    }

    try {
      const parsedUser: StoredUser = JSON.parse(userRaw);
      const role = String(parsedUser?.role || "").trim().toLowerCase();

      if (role === "tenant") {
        router.replace("/tenant");
        return;
      }

      setUser(parsedUser);
      setCheckingAuth(false);
    } catch (authError) {
      console.error("Tenants auth error:", authError);
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      router.replace("/");
    }
  }, [router]);

  useEffect(() => {
    if (!checkingAuth) {
      fetchTenants();
    }
  }, [checkingAuth]);

  async function fetchTenants() {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("token");

      const res = await fetch(`${API_URL}/api/tenants`, {
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${token || ""}`,
        },
      });

      if (res.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        router.replace("/");
        return;
      }

      const contentType = res.headers.get("content-type") || "";

      if (!res.ok) {
        let errorMessage = "Failed to load tenants.";

        if (contentType.includes("application/json")) {
          const errData = await res.json();
          errorMessage =
            errData?.error ||
            errData?.message ||
            `Failed to load tenants. Server responded with ${res.status}.`;
        } else {
          const errText = await res.text();
          errorMessage =
            errText ||
            `Failed to load tenants. Server responded with ${res.status}.`;
        }

        throw new Error(errorMessage);
      }

      if (!contentType.includes("application/json")) {
        throw new Error("Invalid response from tenants API.");
      }

      const data = await res.json();
      setTenants(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching tenants:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load tenants. Please check the backend connection."
      );
      setTenants([]);
    } finally {
      setLoading(false);
    }
  }

  function openDeleteModal(tenant: Tenant) {
    setSelectedTenant(tenant);
    setDeleteModalOpen(true);
  }

  function closeDeleteModal() {
    setSelectedTenant(null);
    setDeleteModalOpen(false);
  }

  async function handleDeleteTenant() {
    if (!selectedTenant) return;

    try {
      setDeleting(true);
      setError("");

      const token = localStorage.getItem("token");

      const res = await fetch(`${API_URL}/api/tenants/${selectedTenant.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token || ""}`,
        },
      });

      if (res.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        router.replace("/");
        return;
      }

      const contentType = res.headers.get("content-type") || "";

      if (!res.ok) {
        let errorMessage = "Failed to delete tenant.";

        if (contentType.includes("application/json")) {
          const errData = await res.json();
          errorMessage =
            errData?.error ||
            errData?.message ||
            `Failed to delete tenant. Server responded with ${res.status}.`;
        } else {
          const errText = await res.text();
          errorMessage =
            errText ||
            `Failed to delete tenant. Server responded with ${res.status}.`;
        }

        throw new Error(errorMessage);
      }

      setTenants((prev) => prev.filter((t) => t.id !== selectedTenant.id));
      closeDeleteModal();
    } catch (err) {
      console.error("Error deleting tenant:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to delete tenant. Please try again."
      );
    } finally {
      setDeleting(false);
    }
  }

  const filteredTenants = useMemo(() => {
    const query = searchTerm.toLowerCase().trim();

    return tenants.filter((tenant) => {
      const fullName = `${tenant.firstName} ${tenant.lastName}`.toLowerCase();
      const phone = tenant.phone?.toLowerCase() || "";
      const email = tenant.email?.toLowerCase() || "";
      const propertyName = tenant.property?.name?.toLowerCase() || "";
      const propertyCode = tenant.property?.code?.toLowerCase() || "";
      const resolvedStatus = getTenantStatus(tenant);

      const matchesSearch =
        fullName.includes(query) ||
        phone.includes(query) ||
        email.includes(query) ||
        propertyName.includes(query) ||
        propertyCode.includes(query);

      const matchesStatus =
        statusFilter === "ALL" || resolvedStatus === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [tenants, searchTerm, statusFilter]);

  const totalTenants = tenants.length;
  const activeTenants = tenants.filter(
    (t) => getTenantStatus(t) === "ACTIVE"
  ).length;
  const pendingTenants = tenants.filter(
    (t) => getTenantStatus(t) === "PENDING"
  ).length;
  const inactiveTenants = tenants.filter(
    (t) => getTenantStatus(t) === "INACTIVE"
  ).length;

  const normalizedRole = String(user?.role || "").trim().toUpperCase();
  const isSuperAdmin = normalizedRole === "OWNER";
  const canEdit = normalizedRole === "ADMIN";

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="rounded-2xl border bg-white px-6 py-4 shadow">
          Checking session...
        </div>
      </div>
    );
  }

  return (
    <AdminShell
      user={user}
      activeItem="tenants"
      title="Tenant Management"
      subtitle="Manage your tenants, track occupancy, and access tenant records."
      actions={
        canEdit ? (
          <Link
            href="/tenants/add"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Add Tenant
          </Link>
        ) : null
      }
    >
      <div className="space-y-6">
        {isSuperAdmin && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-700">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="font-semibold">Read-only Super Admin mode</p>
                <p className="mt-1">
                  You can review all tenant records, but only Admin can add,
                  edit, or delete tenants.
                </p>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <div className="flex-1">
              <p className="font-semibold">Unable to load tenant data</p>
              <p className="mt-1">{error}</p>
            </div>

            <button
              onClick={fetchTenants}
              className="rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
            >
              Retry
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total Tenants"
            value={totalTenants}
            icon={<Users className="h-6 w-6 text-blue-600" />}
            bg="bg-blue-50"
            valueClass="text-slate-800"
          />

          <StatCard
            label="Active"
            value={activeTenants}
            icon={<UserCircle2 className="h-6 w-6 text-emerald-600" />}
            bg="bg-emerald-50"
            valueClass="text-emerald-600"
          />

          <StatCard
            label="Pending"
            value={pendingTenants}
            icon={<Home className="h-6 w-6 text-amber-600" />}
            bg="bg-amber-50"
            valueClass="text-amber-600"
          />

          <StatCard
            label="Inactive"
            value={inactiveTenants}
            icon={<Building2 className="h-6 w-6 text-slate-600" />}
            bg="bg-slate-100"
            valueClass="text-slate-700"
          />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, phone, email, property..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as "ALL" | TenantStatus)
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="PENDING">Pending</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-950">
                Tenant Portfolio
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Review occupants, lease status, property assignment, and tenant access.
              </p>
            </div>
            <div className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600">
              Showing {filteredTenants.length} of {tenants.length}
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 2xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="h-80 animate-pulse rounded-3xl border border-slate-200 bg-slate-100"
                />
              ))}
            </div>
          ) : filteredTenants.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-16 text-center">
              <Users className="mx-auto h-12 w-12 text-slate-300" />
              <h3 className="mt-4 text-lg font-semibold text-slate-700">
                No tenants found
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                {error
                  ? "The tenant list could not be loaded."
                  : "Try adjusting your search or add a new tenant."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 2xl:grid-cols-3">
              {filteredTenants.map((tenant) => {
                const resolvedStatus = getTenantStatus(tenant);
                const tenantName = getTenantName(tenant);
                const occupancyDays = getOccupancyDays(tenant);
                const propertyName =
                  tenant.property?.name || tenant.property?.code || "Not assigned";

                return (
                  <article
                    key={tenant.id}
                    className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-xl"
                  >
                    <div className="relative min-h-40 bg-slate-950 p-5 text-white">
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.48),_transparent_35%),linear-gradient(135deg,_#111827,_#172554_55%,_#064e3b)]" />
                      <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full border border-white/15" />
                      <div className="absolute bottom-3 right-5 text-6xl font-black text-white/10">
                        {getInitials(tenant.firstName, tenant.lastName)}
                      </div>

                      <div className="relative flex items-start justify-between gap-4">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 text-lg font-black backdrop-blur">
                          {getInitials(tenant.firstName, tenant.lastName) || "T"}
                        </div>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            resolvedStatus === "ACTIVE"
                              ? "bg-emerald-400/20 text-emerald-100 ring-1 ring-emerald-300/40"
                              : resolvedStatus === "PENDING"
                                ? "bg-amber-400/20 text-amber-100 ring-1 ring-amber-300/40"
                                : "bg-white/15 text-white/80 ring-1 ring-white/20"
                          }`}
                        >
                          {resolvedStatus}
                        </span>
                      </div>

                      <div className="relative mt-8">
                        <p className="text-xs font-semibold uppercase tracking-wide text-white/60">
                          Tenant ID #{tenant.id}
                        </p>
                        <h3 className="mt-2 line-clamp-2 text-2xl font-bold">
                          {tenantName}
                        </h3>
                      </div>
                    </div>

                    <div className="p-5">
                      <div className="grid grid-cols-1 gap-3">
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                          <p className="mb-2 text-xs font-semibold uppercase text-slate-400">
                            Contact
                          </p>
                          <p className="flex items-center gap-2 truncate text-sm font-medium text-slate-800">
                            <Phone className="h-4 w-4 shrink-0 text-slate-400" />
                            {tenant.phone || "No phone"}
                          </p>
                          <p className="mt-1 flex items-center gap-2 truncate text-sm text-slate-600">
                            <Mail className="h-4 w-4 shrink-0 text-slate-400" />
                            {tenant.email || "No email"}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                          <p className="mb-2 text-xs font-semibold uppercase text-slate-400">
                            Property assignment
                          </p>
                          <p className="flex items-center gap-2 truncate text-sm font-bold text-slate-900">
                            <MapPin className="h-4 w-4 shrink-0 text-blue-500" />
                            {propertyName}
                          </p>
                          <p className="mt-1 truncate font-mono text-[11px] text-emerald-600">
                            Org: {tenant.organizationId || "-"}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <div className="rounded-2xl border border-slate-200 bg-white p-3">
                          <p className="text-xs font-semibold uppercase text-slate-400">
                            Lease
                          </p>
                          <span
                            className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-bold ${leaseBadge(
                              tenant.leaseStatus
                            )}`}
                          >
                            {tenant.leaseStatus || "NO LEASE"}
                          </span>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white p-3">
                          <p className="text-xs font-semibold uppercase text-slate-400">
                            Occupancy
                          </p>
                          <p className="mt-2 text-lg font-black text-slate-950">
                            {occupancyDays ? `${occupancyDays} days` : "Not set"}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                        <p className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-400">
                          <CalendarDays className="h-4 w-4" />
                          Occupancy period
                        </p>
                        <p className="mt-2 text-sm font-semibold text-slate-800">
                          {getOccupancyPeriod(tenant)}
                        </p>
                        {tenant.leaseStatus === "ACTIVE" && (
                          <p className="mt-1 text-xs font-medium text-emerald-600">
                            Current occupancy
                          </p>
                        )}
                      </div>

                      <div className="mt-5 flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
                        <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                          <KeyRound className="h-3.5 w-3.5" />
                          Tenant profile
                        </span>

                        <div className="flex items-center gap-2">
                          <Link
                            href={`/tenants/${tenant.id}`}
                            className="inline-flex items-center gap-1 rounded-xl bg-slate-950 px-3 py-2 text-xs font-bold text-white transition hover:bg-blue-700"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            View
                          </Link>

                          {canEdit ? (
                            <>
                              <Link
                                href={`/tenants/edit/${tenant.id}`}
                                className="inline-flex items-center gap-1 rounded-xl border border-blue-200 px-3 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-50"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                                Edit
                              </Link>

                              <button
                                type="button"
                                onClick={() => openDeleteModal(tenant)}
                                className="rounded-xl border border-rose-200 p-2 text-rose-700 transition hover:bg-rose-50"
                                title="Delete tenant"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        {deleteModalOpen && selectedTenant && canEdit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
              <h2 className="text-xl font-bold text-slate-800">
                Delete Tenant
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Are you sure you want to delete{" "}
                <span className="font-semibold text-slate-800">
                  {selectedTenant.firstName} {selectedTenant.lastName}
                </span>
                ? This action cannot be undone.
              </p>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={closeDeleteModal}
                  disabled={deleting}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>

                <button
                  onClick={handleDeleteTenant}
                  disabled={deleting}
                  className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {deleting ? "Deleting..." : "Yes, Delete"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}

function StatCard({
  label,
  value,
  icon,
  bg,
  valueClass,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  bg: string;
  valueClass: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <h3 className={`mt-2 text-2xl font-bold ${valueClass}`}>{value}</h3>
        </div>
        <div className={`rounded-xl p-3 ${bg}`}>{icon}</div>
      </div>
    </div>
  );
}
