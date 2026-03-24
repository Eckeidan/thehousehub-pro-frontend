"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  DoorOpen,
  Home,
  Search,
  Filter,
  Eye,
  Pencil,
  Trash2,
  Plus,
  RefreshCw,
  Loader2,
  LayoutDashboard,
  Users,
  Wallet,
  FileText,
  Brain,
  Settings,
  LogOut,
  ShieldCheck,
  Wrench,
} from "lucide-react";

type StoredUser = {
  id?: string;
  fullName?: string;
  name?: string;
  email?: string;
  role?: string;
};

type Property = {
  id: string;
  code: string;
  name?: string | null;
  addressLine1?: string | null;
  city?: string | null;
};

type Unit = {
  id: string;
  propertyId: string;
  unitCode: string;
  unitName?: string | null;
  floor?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  areaSqm?: string | number | null;
  monthlyRent?: string | number | null;
  occupancyStatus?: string | null;
  isActive: boolean;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  property: Property;
};

type UnitStats = {
  total: number;
  available: number;
  occupied: number;
  inactive: number;
};

const API_BASE = "http://localhost:4000/api";

export default function UnitsPage() {
  const router = useRouter();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [user, setUser] = useState<StoredUser | null>(null);

  const [units, setUnits] = useState<Unit[]>([]);
  const [stats, setStats] = useState<UnitStats>({
    total: 0,
    available: 0,
    occupied: 0,
    inactive: 0,
  });

  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [occupancyStatus, setOccupancyStatus] = useState("");

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [deleting, setDeleting] = useState(false);

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
    } catch (error) {
      console.error("Units auth error:", error);
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      router.replace("/");
    }
  }, [router]);

  const normalizedRole = String(user?.role || "").trim().toUpperCase();
  const isSuperAdmin = normalizedRole === "OWNER";
  const canEdit = normalizedRole === "ADMIN";

  const queryString = useMemo(() => {
    const params = new URLSearchParams();

    if (search.trim()) params.set("search", search.trim());
    if (occupancyStatus) params.set("occupancyStatus", occupancyStatus);

    return params.toString();
  }, [search, occupancyStatus]);

  const fetchUnits = async () => {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("token");

      const res = await fetch(
        `${API_BASE}/units${queryString ? `?${queryString}` : ""}`,
        {
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${token || ""}`,
          },
        }
      );

      if (res.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        router.replace("/");
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to fetch units");
      }

      const data = await res.json();
      setUnits(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Unable to load units.");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      setStatsLoading(true);

      const token = localStorage.getItem("token");

      const res = await fetch(`${API_BASE}/units/stats`, {
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

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to fetch unit stats");
      }

      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error(err);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    if (!checkingAuth) {
      fetchUnits();
    }
  }, [checkingAuth, queryString]);

  useEffect(() => {
    if (!checkingAuth) {
      fetchStats();
    }
  }, [checkingAuth]);

  const refreshAll = async () => {
    await Promise.all([fetchUnits(), fetchStats()]);
  };

  const handleDeleteClick = (unit: Unit) => {
    if (!canEdit) return;
    setSelectedUnit(unit);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedUnit || !canEdit) return;

    try {
      setDeleting(true);

      const token = localStorage.getItem("token");

      const res = await fetch(`${API_BASE}/units/${selectedUnit.id}`, {
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

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to delete unit");
      }

      setDeleteModalOpen(false);
      setSelectedUnit(null);
      await refreshAll();
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to delete unit.");
    } finally {
      setDeleting(false);
    }
  };

  const formatMoney = (value?: string | number | null) => {
    if (value === null || value === undefined || value === "") return "—";

    const num = Number(value);
    if (Number.isNaN(num)) return String(value);

    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(num);
  };

  const getOccupancyBadge = (value?: string | null) => {
    const status = value || "AVAILABLE";

    const map: Record<string, string> = {
      AVAILABLE: "bg-emerald-50 text-emerald-700 border-emerald-200",
      OCCUPIED: "bg-orange-50 text-orange-700 border-orange-200",
      RESERVED: "bg-blue-50 text-blue-700 border-blue-200",
      MAINTENANCE: "bg-red-50 text-red-700 border-red-200",
    };

    return (
      <span
        className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${
          map[status] || "bg-slate-100 text-slate-700 border-slate-200"
        }`}
      >
        {status.replaceAll("_", " ")}
      </span>
    );
  };

  const getActiveBadge = (isActive: boolean) => {
    return (
      <span
        className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${
          isActive
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : "border-slate-200 bg-slate-100 text-slate-600"
        }`}
      >
        {isActive ? "Active" : "Inactive"}
      </span>
    );
  };

  const statCards = [
    {
      label: "Total Units",
      value: stats.total,
      icon: <Building2 className="h-5 w-5" />,
      color: "text-slate-700",
      bg: "bg-slate-50",
    },
    {
      label: "Available",
      value: stats.available,
      icon: <DoorOpen className="h-5 w-5" />,
      color: "text-emerald-700",
      bg: "bg-emerald-50",
    },
    {
      label: "Occupied",
      value: stats.occupied,
      icon: <Home className="h-5 w-5" />,
      color: "text-orange-700",
      bg: "bg-orange-50",
    },
    {
      label: "Inactive",
      value: stats.inactive,
      icon: <Building2 className="h-5 w-5" />,
      color: "text-slate-700",
      bg: "bg-slate-100",
    },
  ];

  const initials =
    (user?.fullName || user?.name || "User")
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "US";

  const displayRole =
    normalizedRole === "ADMIN"
      ? "Admin"
      : normalizedRole === "OWNER"
      ? "Super Admin"
      : "User";

  const userDisplayName = user?.fullName || user?.name || "User";

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-8">
        <div className="rounded-3xl border border-slate-200 bg-white px-8 py-6 shadow-xl text-slate-700">
          Checking session...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="flex min-h-screen">
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 bg-gradient-to-b from-blue-950 via-blue-900 to-slate-900 text-white shadow-2xl lg:flex lg:flex-col">
          <div className="border-b border-white/10 px-6 py-7">
            <h1 className="text-3xl font-bold tracking-tight">PropertyOS</h1>
            <p className="mt-2 text-sm text-blue-100/70">
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
                href="/tenants"
              />
              <SidebarItem
                label="Units"
                icon={<Home size={18} />}
                href="/units"
                active
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
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">
                  {userDisplayName}
                </p>
                <p className="truncate text-xs text-blue-100/70">
                  {user?.email || displayRole}
                </p>
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
          <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
            <div className="flex flex-col gap-5 px-6 py-5 md:flex-row md:items-center md:justify-between md:px-8">
              <div className="flex items-start gap-4">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Dashboard
                </Link>

                <div>
                  <h2 className="text-3xl font-bold tracking-tight text-slate-900">
                    Units
                  </h2>
                  <p className="mt-1 text-slate-500">
                    Manage rentable units inside your properties.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={refreshAll}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </button>

                {canEdit && (
                  <Link
                    href="/units/new"
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    <Plus className="h-4 w-4" />
                    New Unit
                  </Link>
                )}

                <div className="ml-2 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                    {initials}
                  </div>
                  <div className="hidden sm:block">
                    <p className="text-sm font-semibold text-slate-900">
                      {userDisplayName}
                    </p>
                    <p className="text-xs text-slate-500">{displayRole}</p>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <div className="p-6 md:p-8">
            {isSuperAdmin && (
              <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-700">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
                  <div>
                    <p className="font-semibold">Read-only Super Admin mode</p>
                    <p className="mt-1">
                      You can review all units, but only Admin can create, edit,
                      or delete units.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {statCards.map((card) => (
                <div
                  key={card.label}
                  className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-500">{card.label}</p>
                      <h3 className="mt-2 text-2xl font-bold text-slate-900">
                        {statsLoading ? "..." : card.value}
                      </h3>
                    </div>
                    <div className={`rounded-xl p-3 ${card.bg} ${card.color}`}>
                      {card.icon}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <div className="mb-4 flex items-center gap-2">
                <Filter className="h-4 w-4 text-slate-500" />
                <h2 className="text-sm font-semibold text-slate-800">Filters</h2>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Search
                  </label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Unit code, unit name, property..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Occupancy
                  </label>
                  <select
                    value={occupancyStatus}
                    onChange={(e) => setOccupancyStatus(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                  >
                    <option value="">All Occupancy Statuses</option>
                    <option value="AVAILABLE">Available</option>
                    <option value="OCCUPIED">Occupied</option>
                    <option value="RESERVED">Reserved</option>
                    <option value="MAINTENANCE">Maintenance</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="mt-6 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
              <div className="border-b border-slate-200 px-5 py-4">
                <h2 className="text-sm font-semibold text-slate-800">Units</h2>
              </div>

              {loading ? (
                <div className="p-10 text-center text-sm text-slate-500">
                  <div className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading units...
                  </div>
                </div>
              ) : error ? (
                <div className="p-10 text-center text-sm text-red-600">{error}</div>
              ) : units.length === 0 ? (
                <div className="p-10 text-center text-sm text-slate-500">
                  No units found.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="px-5 py-3 font-semibold">Unit Code</th>
                        <th className="px-5 py-3 font-semibold">Unit Name</th>
                        <th className="px-5 py-3 font-semibold">Property</th>
                        <th className="px-5 py-3 font-semibold">Floor</th>
                        <th className="px-5 py-3 font-semibold">Beds / Baths</th>
                        <th className="px-5 py-3 font-semibold">Rent</th>
                        <th className="px-5 py-3 font-semibold">Occupancy</th>
                        <th className="px-5 py-3 font-semibold">State</th>
                        <th className="px-5 py-3 font-semibold text-right">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {units.map((unit) => (
                        <tr key={unit.id} className="hover:bg-slate-50/70">
                          <td className="px-5 py-4 font-medium text-slate-900">
                            {unit.unitCode}
                          </td>

                          <td className="px-5 py-4">
                            <div className="font-medium text-slate-900">
                              {unit.unitName || "—"}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              {unit.areaSqm ? `${unit.areaSqm} sqm` : "No area set"}
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <div className="font-medium text-slate-900">
                              {unit.property?.name || unit.property?.code}
                            </div>
                            <div className="text-xs text-slate-500">
                              {unit.property?.addressLine1 || "—"}
                              {unit.property?.city ? `, ${unit.property.city}` : ""}
                            </div>
                          </td>

                          <td className="px-5 py-4 text-slate-700">
                            {unit.floor ?? "—"}
                          </td>

                          <td className="px-5 py-4 text-slate-700">
                            {unit.bedrooms ?? "—"} / {unit.bathrooms ?? "—"}
                          </td>

                          <td className="px-5 py-4 text-slate-700">
                            {formatMoney(unit.monthlyRent)}
                          </td>

                          <td className="px-5 py-4">
                            {getOccupancyBadge(unit.occupancyStatus)}
                          </td>

                          <td className="px-5 py-4">
                            {getActiveBadge(unit.isActive)}
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex justify-end gap-2">
                              <Link
                                href={`/units/${unit.id}`}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                View
                              </Link>

                              {canEdit ? (
                                <>
                                  <Link
                                    href={`/units/edit/${unit.id}`}
                                    className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                    Edit
                                  </Link>

                                  <button
                                    onClick={() => handleDeleteClick(unit)}
                                    className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-100"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    Delete
                                  </button>
                                </>
                              ) : (
                                <span className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500">
                                  Read only
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {deleteModalOpen && selectedUnit && canEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-red-50 p-3 text-red-600">
                <Trash2 className="h-5 w-5" />
              </div>

              <div className="flex-1">
                <h3 className="text-lg font-semibold text-slate-900">
                  Delete Unit
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                  Are you sure you want to delete{" "}
                  <span className="font-semibold text-slate-700">
                    {selectedUnit.unitCode}
                  </span>
                  ? This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setDeleteModalOpen(false);
                  setSelectedUnit(null);
                }}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deleting ? "Deleting..." : "Delete Unit"}
              </button>
            </div>
          </div>
        </div>
      )}
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