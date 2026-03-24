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
  ArrowLeft,
  ShieldCheck,
  LayoutDashboard,
  Wallet,
  FileText,
  Brain,
  Settings,
  Wrench,
  LogOut,
} from "lucide-react";

type TenantStatus = "ACTIVE" | "INACTIVE" | "PENDING";
type LeaseStatus = "ACTIVE" | "EXPIRED" | "TERMINATED" | "PENDING";

type StoredUser = {
  id?: string;
  fullName?: string;
  name?: string;
  email?: string;
  role?: string;
};

interface Property {
  id: string;
  name?: string | null;
  code?: string | null;
}

interface Tenant {
  id: string;
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
            errText || `Failed to load tenants. Server responded with ${res.status}.`;
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
            errText || `Failed to delete tenant. Server responded with ${res.status}.`;
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

  const displayRole =
    normalizedRole === "OWNER"
      ? "Super Admin"
      : normalizedRole === "ADMIN"
      ? "Admin"
      : "User";

  const userInitials =
    (user?.fullName || user?.name || "User")
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "US";

  const isDeleteBlocked = !canEdit;

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
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen">
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 bg-gradient-to-b from-blue-950 via-blue-900 to-slate-900 text-white shadow-2xl lg:flex lg:flex-col">
          <div className="border-b border-white/10 px-6 py-7">
            <h1 className="text-3xl font-bold tracking-tight">
              <span className="text-white">The House</span>{" "}
              <span className="text-emerald-400">Hub</span>
            </h1>
            <p className="mt-2 text-xs text-blue-100/60">
              Smart Property Management
            </p>
          </div>

          <nav className="flex-1 overflow-y-auto px-4 py-6">
            <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-widest text-blue-200/50">
              Main Menu
            </p>

            <div className="space-y-2">
              <SidebarItem
                label="Dashboard"
                icon={<LayoutDashboard size={18} />}
                href="/dashboard"
              />
              <SidebarItem
                label="Properties"
                icon={<Building2 size={18} />}
                href="/properties"
              />
              <SidebarItem
                label="Tenants"
                icon={<Users size={18} />}
                active
                href="/tenants"
              />
              <SidebarItem
                label="Units"
                icon={<Home size={18} />}
                href="/units"
              />
              <SidebarItem
                label="Maintenance"
                icon={<Wrench size={18} />}
                href="/maintenance"
              />
              <SidebarItem
                label="Financials"
                icon={<Wallet size={18} />}
                href="/payments"
              />
              <SidebarItem
                label="Documents"
                icon={<FileText size={18} />}
                href="/documents"
              />
              <SidebarItem
                label="AI Insights"
                icon={<Brain size={18} />}
                href="/insights"
              />
              <SidebarItem
                label="Settings"
                icon={<Settings size={18} />}
                href="/settings"
              />
            </div>
          </nav>

          <div className="border-t border-white/10 px-6 py-5">
            <p className="text-xs uppercase tracking-widest text-blue-200/50">
              Current Role
            </p>
            <p className="mt-2 font-semibold">{displayRole}</p>

            <div className="mt-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 px-3 py-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-500 text-sm font-bold text-white">
                {userInitials}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">
                  {user?.fullName || user?.name || "User"}
                </p>
                <p className="text-xs text-blue-100/80">{displayRole}</p>
              </div>
            </div>

            <button
              onClick={() => {
                localStorage.removeItem("token");
                localStorage.removeItem("user");
                window.location.href = "/";
              }}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-200 transition hover:bg-red-500/20 hover:text-white"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </aside>

        <main className="flex-1 lg:ml-72">
          <div className="space-y-6 p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-3">
                <Link
                  href="/dashboard"
                  className="mt-1 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-blue-600"
                  title="Back to Dashboard"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Link>

                <div>
                  <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-800">
                    <Users className="h-7 w-7 text-blue-600" />
                    Tenant Management
                  </h1>
                  <p className="mt-1 text-sm text-slate-500">
                    Manage your tenants, track occupancy, and access tenant
                    records.
                  </p>
                </div>
              </div>

              {canEdit && (
                <Link
                  href="/tenants/add"
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4" />
                  Add Tenant
                </Link>
              )}
            </div>

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
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Total Tenants</p>
                    <h3 className="mt-2 text-2xl font-bold text-slate-800">
                      {totalTenants}
                    </h3>
                  </div>
                  <div className="rounded-xl bg-blue-50 p-3">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Active</p>
                    <h3 className="mt-2 text-2xl font-bold text-emerald-600">
                      {activeTenants}
                    </h3>
                  </div>
                  <div className="rounded-xl bg-emerald-50 p-3">
                    <UserCircle2 className="h-6 w-6 text-emerald-600" />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Pending</p>
                    <h3 className="mt-2 text-2xl font-bold text-amber-600">
                      {pendingTenants}
                    </h3>
                  </div>
                  <div className="rounded-xl bg-amber-50 p-3">
                    <Home className="h-6 w-6 text-amber-600" />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Inactive</p>
                    <h3 className="mt-2 text-2xl font-bold text-slate-700">
                      {inactiveTenants}
                    </h3>
                  </div>
                  <div className="rounded-xl bg-slate-100 p-3">
                    <Building2 className="h-6 w-6 text-slate-600" />
                  </div>
                </div>
              </div>
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

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              {loading ? (
                <div className="flex items-center justify-center gap-3 px-6 py-16 text-slate-500">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Loading tenants...
                </div>
              ) : filteredTenants.length === 0 ? (
                <div className="px-6 py-16 text-center">
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
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr className="text-left text-slate-600">
                        <th className="px-6 py-4 font-semibold">Tenant</th>
                        <th className="px-6 py-4 font-semibold">Contact</th>
                        <th className="px-6 py-4 font-semibold">Property</th>
                        <th className="px-6 py-4 font-semibold">Status</th>
                        <th className="px-6 py-4 font-semibold">Lease</th>
                        <th className="px-6 py-4 font-semibold">
                          Occupancy Period
                        </th>
                        <th className="px-6 py-4 font-semibold text-right">
                          Actions
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {filteredTenants.map((tenant) => {
                        const resolvedStatus = getTenantStatus(tenant);

                        return (
                          <tr key={tenant.id} className="hover:bg-slate-50/70">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-100 font-semibold text-blue-700">
                                  {getInitials(tenant.firstName, tenant.lastName)}
                                </div>
                                <div>
                                  <p className="font-semibold text-slate-800">
                                    {tenant.firstName} {tenant.lastName}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    Tenant ID: #{tenant.id}
                                  </p>
                                </div>
                              </div>
                            </td>

                            <td className="px-6 py-4">
                              <div className="space-y-1">
                                <p className="flex items-center gap-2 text-slate-700">
                                  <Phone className="h-3.5 w-3.5 text-slate-400" />
                                  {tenant.phone || "N/A"}
                                </p>
                                <p className="flex items-center gap-2 text-slate-700">
                                  <Mail className="h-3.5 w-3.5 text-slate-400" />
                                  {tenant.email || "N/A"}
                                </p>
                              </div>
                            </td>

                            <td className="px-6 py-4 text-slate-700">
                              {tenant.property?.name ||
                                tenant.property?.code ||
                                "Not assigned"}
                            </td>

                            <td className="px-6 py-4">
                              <span
                                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusBadge(
                                  resolvedStatus
                                )}`}
                              >
                                {resolvedStatus}
                              </span>
                            </td>

                            <td className="px-6 py-4">
                              <span
                                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${leaseBadge(
                                  tenant.leaseStatus
                                )}`}
                              >
                                {tenant.leaseStatus || "NO LEASE"}
                              </span>
                            </td>

                            <td className="px-6 py-4">
                              <div className="space-y-1">
                                <p className="text-sm font-medium text-slate-700">
                                  {getOccupancyPeriod(tenant)}
                                </p>

                                {tenant.leaseStatus === "TERMINATED" && (
                                  <p className="text-xs text-slate-400">
                                    Former occupancy
                                  </p>
                                )}

                                {tenant.leaseStatus === "ACTIVE" && (
                                  <p className="text-xs text-emerald-600">
                                    Current occupancy
                                  </p>
                                )}
                              </div>
                            </td>

                            <td className="px-6 py-4">
                              <div className="flex items-center justify-end gap-2">
                                <Link
                                  href={`/tenants/${tenant.id}`}
                                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                  View
                                </Link>

                                {canEdit ? (
                                  <>
                                    <Link
                                      href={`/tenants/edit/${tenant.id}`}
                                      className="inline-flex items-center gap-1 rounded-lg border border-blue-200 px-3 py-2 text-xs font-medium text-blue-700 transition hover:bg-blue-50"
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                      Edit
                                    </Link>

                                    <button
                                      onClick={() => openDeleteModal(tenant)}
                                      className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-3 py-2 text-xs font-medium text-rose-700 transition hover:bg-rose-50"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                      Delete
                                    </button>
                                  </>
                                ) : (
                                  <span className="inline-flex rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-500">
                                    Read only
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {deleteModalOpen && selectedTenant && !isDeleteBlocked && (
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
        </main>
      </div>
    </div>
  );
}

function SidebarItem({
  label,
  icon,
  href,
  active = false,
}: {
  label: string;
  icon: React.ReactNode;
  href: string;
  active?: boolean;
}) {
  return (
    <Link href={href}>
      <div
        className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium transition ${
          active
            ? "bg-white/15 text-white shadow"
            : "text-blue-100/80 hover:bg-white/10 hover:text-white"
        }`}
      >
        <span>{icon}</span>
        <span>{label}</span>
      </div>
    </Link>
  );
}