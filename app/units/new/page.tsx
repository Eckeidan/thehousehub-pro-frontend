"use client";

import {
  useEffect,
  useState,
  type FormEvent,
  type ChangeEvent,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Loader2,
  LayoutDashboard,
  Building2,
  Users,
  Wallet,
  FileText,
  Brain,
  Settings,
  LogOut,
  Home,
  ShieldCheck,
  Wrench,
  Trash2,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

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
};

type UnitFormState = {
  propertyId: string;
  unitName: string;
  floor: string;
  bedrooms: string;
  bathrooms: string;
  areaSqm: string;
  monthlyRent: string;
  occupancyStatus: string;
  notes: string;
};

export default function NewUnitPage() {
  const router = useRouter();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [user, setUser] = useState<StoredUser | null>(null);

  const [properties, setProperties] = useState<Property[]>([]);
  const [loadingProperties, setLoadingProperties] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState<UnitFormState>({
    propertyId: "",
    unitName: "",
    floor: "",
    bedrooms: "",
    bathrooms: "",
    areaSqm: "",
    monthlyRent: "",
    occupancyStatus: "AVAILABLE",
    notes: "",
  });

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
      console.error("New unit auth error:", authError);
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      router.replace("/");
    }
  }, [router]);

  const normalizedRole = String(user?.role || "").trim().toUpperCase();
  const isSuperAdmin = normalizedRole === "OWNER";
  const canEdit = normalizedRole === "ADMIN";

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

  useEffect(() => {
    if (!checkingAuth) {
      fetchProperties();
    }
  }, [checkingAuth]);

  async function fetchProperties() {
    try {
      setLoadingProperties(true);
      setError("");

      const token = localStorage.getItem("token");

      const res = await fetch(`${API_BASE}/api/properties`, {
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

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "Failed to load properties");
      }

      setProperties(Array.isArray(data) ? data : []);
    } catch (fetchError: any) {
      console.error("Failed to load properties:", fetchError);
      setProperties([]);
      setError(fetchError?.message || "Failed to load properties.");
    } finally {
      setLoadingProperties(false);
    }
  }

  function handleChange(
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (!canEdit) {
      setError("Only Admin can create a new unit.");
      return;
    }

    if (!form.propertyId) {
      setError("Please select a property.");
      return;
    }

    try {
      setLoading(true);

      const token = localStorage.getItem("token");

      const res = await fetch(`${API_BASE}/api/units`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token || ""}`,
  },
  body: JSON.stringify({
    propertyId: form.propertyId,
    unitName: form.unitName.trim() || null,
    floor: form.floor !== "" ? Number(form.floor) : null,
    bedrooms: form.bedrooms !== "" ? Number(form.bedrooms) : null,
    bathrooms: form.bathrooms !== "" ? Number(form.bathrooms) : null,
    areaSqm: form.areaSqm !== "" ? Number(form.areaSqm) : null,
    monthlyRent: form.monthlyRent !== "" ? Number(form.monthlyRent) : null,
    occupancyStatus: form.occupancyStatus || "AVAILABLE",
    notes: form.notes.trim() || null,
  }),
});

      if (res.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        router.replace("/");
        return;
      }

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "Failed to create unit");
      }

      router.push("/units");
    } catch (submitError: any) {
      console.error("Create unit error:", submitError);
      setError(submitError?.message || "Failed to create unit");
    } finally {
      setLoading(false);
    }
  }

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
            <h1 className="text-3xl font-bold tracking-tight">The House Hub</h1>
            <p className="mt-2 text-sm text-blue-100/70">
              The Morden home management platform.
            </p>
          </div>

          <nav className="flex-1 overflow-y-auto px-4 py-6">
            <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-widest text-blue-200/50">
              Main Menu
            </p>

            <div className="space-y-2">
              <SidebarItem label="Dashboard" icon={<LayoutDashboard size={18} />} href="/dashboard" />
              <SidebarItem label="Properties" icon={<Building2 size={18} />} href="/properties" />
              <SidebarItem label="Tenants" icon={<Users size={18} />} href="/tenants" />
              <SidebarItem label="Units" icon={<Home size={18} />} href="/units" active />
              <SidebarItem label="Maintenance" icon={<Wrench size={18} />} href="/maintenance" />
              <SidebarItem label="Financials" icon={<Wallet size={18} />} href="/payments" />
              <SidebarItem label="Documents" icon={<FileText size={18} />} href="/documents" />
              <SidebarItem label="AI Insights" icon={<Brain size={18} />} href="/insights" />
              <SidebarItem label="Settings" icon={<Settings size={18} />} href="/settings" />
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
                  href="/units"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Link>

                <div>
                  <h2 className="text-3xl font-bold tracking-tight text-slate-900">
                    Create Unit
                  </h2>
                  <p className="mt-1 text-slate-500">
                    Add a new rentable unit to a property.
                  </p>
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
                      You can view the form, but only Admin can create units.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            )}

            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Property
                  </label>
                  <select
                    name="propertyId"
                    required
                    value={form.propertyId}
                    onChange={handleChange}
                    disabled={loadingProperties || !canEdit}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100"
                  >
                    <option value="">
                      {loadingProperties ? "Loading properties..." : "Select Property"}
                    </option>
                    {properties.map((property) => (
                      <option key={property.id} value={property.id}>
                        {property.name || "Unnamed Property"} ({property.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Unit Name
                  </label>
                  <input
                    name="unitName"
                    value={form.unitName}
                    onChange={handleChange}
                    placeholder="Apartment 101"
                    disabled={!canEdit}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100"
                  />
                  <span className="mt-1 block text-xs text-slate-500">
                    Example: Apt-001
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Floor
                    </label>
                    <input
                      name="floor"
                      type="number"
                      value={form.floor}
                      onChange={handleChange}
                      disabled={!canEdit}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Area (sqm)
                    </label>
                    <input
                      name="areaSqm"
                      type="number"
                      value={form.areaSqm}
                      onChange={handleChange}
                      disabled={!canEdit}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Bedrooms
                    </label>
                    <input
                      name="bedrooms"
                      type="number"
                      value={form.bedrooms}
                      onChange={handleChange}
                      disabled={!canEdit}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Bathrooms
                    </label>
                    <input
                      name="bathrooms"
                      type="number"
                      value={form.bathrooms}
                      onChange={handleChange}
                      disabled={!canEdit}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Monthly Rent
                  </label>
                  <input
                    name="monthlyRent"
                    type="number"
                    value={form.monthlyRent}
                    onChange={handleChange}
                    disabled={!canEdit}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Occupancy Status
                  </label>
                  <select
                    name="occupancyStatus"
                    value={form.occupancyStatus}
                    onChange={handleChange}
                    disabled={!canEdit}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100"
                  >
                    <option value="AVAILABLE">Available</option>
                    <option value="OCCUPIED">Occupied</option>
                    <option value="RESERVED">Reserved</option>
                    <option value="MAINTENANCE">Maintenance</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Notes
                  </label>
                  <textarea
                    name="notes"
                    value={form.notes}
                    onChange={handleChange}
                    rows={3}
                    disabled={!canEdit}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100"
                  />
                </div>

                {canEdit ? (
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center gap-2 rounded-lg bg-black px-5 py-3 text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Plus size={16} />
                    )}
                    {loading ? "Saving..." : "Create Unit"}
                  </button>
                ) : (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                    Read-only mode. Only Admin can create a unit.
                  </div>
                )}
              </form>
            </div>
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
  icon: ReactNode;
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