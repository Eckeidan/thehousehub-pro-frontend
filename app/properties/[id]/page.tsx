"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import PropertyGallery from "./PropertyGallery";
import {
  ArrowLeft,
  MapPin,
  Building2,
  Wallet,
  Home,
  Pencil,
  BedDouble,
  Ruler,
  Car,
  CalendarDays,
  UserRound,
  LayoutDashboard,
  Users,
  Wrench,
  FileText,
  Brain,
  Settings,
  LogOut,
} from "lucide-react";

type PropertyImage = {
  id: string;
  imageUrl: string;
  fileName?: string | null;
  isPrimary: boolean;
  sortOrder: number;
};

type Property = {
  id: string;
  code: string;
  name: string | null;
  addressLine1: string;
  addressLine2?: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  propertyType: string;
  monthlyRent?: number | null;
  unitsCount: number;
  isActive: boolean;
  description?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  areaSqm?: number | null;
  floor?: number | null;
  furnishingStatus?: string | null;
  parkingSpaces?: number | null;
  availableFrom?: string | null;
  ownerName?: string | null;
  occupancyStatus?: string | null;
  propertyImages?: PropertyImage[];
};

type StoredUser = {
  id?: string;
  fullName?: string;
  name?: string;
  email?: string;
  role?: string;
};

const API_URL = "http://localhost:4000";

function InfoCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p className="mt-2 break-words text-sm font-semibold text-slate-900">
        {value}
      </p>
    </div>
  );
}

function getStatusClasses(status?: string | null) {
  switch (status) {
    case "AVAILABLE":
      return "bg-emerald-100 text-emerald-700";
    case "OCCUPIED":
      return "bg-blue-100 text-blue-700";
    case "MAINTENANCE":
      return "bg-amber-100 text-amber-700";
    case "RESERVED":
      return "bg-purple-100 text-purple-700";
    default:
      return "bg-slate-200 text-slate-700";
  }
}

function formatMoney(value?: number | null) {
  if (value == null) return "-";
  return `$${Number(value).toLocaleString()}`;
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString();
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

export default function PropertyDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const id = String(params?.id || "");

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [user, setUser] = useState<StoredUser | null>(null);
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
      console.error("Property detail auth error:", error);
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      router.replace("/");
    }
  }, [router]);

  useEffect(() => {
    if (checkingAuth || !id) return;

    const loadProperty = async () => {
      try {
        setLoading(true);
        setError("");

        const token = localStorage.getItem("token");

        const res = await fetch(`${API_URL}/api/properties/${id}`, {
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

        if (res.status === 404) {
          setProperty(null);
          setError("Property not found.");
          return;
        }

        if (!res.ok) {
          throw new Error(`HTTP error ${res.status}`);
        }

        const data = await res.json();
        setProperty(data);
      } catch (error) {
        console.error("Error loading property:", error);
        setError("Unable to load property details.");
      } finally {
        setLoading(false);
      }
    };

    loadProperty();
  }, [checkingAuth, id, router]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/";
  };

  const initials =
    (user?.fullName || user?.name || "User")
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "US";

  const displayRole =
    String(user?.role || "").trim().toUpperCase() === "ADMIN"
      ? "Admin"
      : "Owner";

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-8">
        <div className="rounded-3xl border border-slate-200 bg-white px-8 py-6 shadow-xl text-slate-700">
          Checking session...
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-8">
        <div className="rounded-3xl border border-slate-200 bg-white px-8 py-6 shadow-xl text-slate-700">
          Loading property details...
        </div>
      </div>
    );
  }

  if (!property) {
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
                  active
                />
                <SidebarItem
                  label="Tenants"
                  icon={<Users size={18} />}
                  href="/tenants"
                />
                <SidebarItem
                  label="Units"
                  icon={<Wallet size={18} />}
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

              <button
                onClick={handleLogout}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-200 transition hover:bg-red-500/20 hover:text-white"
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          </aside>

          <main className="flex-1 lg:ml-72">
            <div className="p-6 md:p-8">
              <div className="mx-auto max-w-5xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
                <div className="mb-4">
                  <Link
                    href="/properties"
                    className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:underline"
                  >
                    <ArrowLeft size={16} />
                    Back to Properties
                  </Link>
                </div>

                <h1 className="text-2xl font-bold text-slate-900">
                  Property not found
                </h1>
                <p className="mt-2 text-slate-500">
                  {error ||
                    "The property you are looking for does not exist, or the API could not return the data."}
                </p>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const status = property.occupancyStatus || "AVAILABLE";

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
                active
              />
              <SidebarItem
                label="Tenants"
                icon={<Users size={18} />}
                href="/tenants"
              />
              <SidebarItem
                label="Units"
                icon={<Wallet size={18} />}
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

            <button
              onClick={handleLogout}
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
              <div>
                <Link
                  href="/properties"
                  className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:underline"
                >
                  <ArrowLeft size={16} />
                  Back to Properties
                </Link>

                <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
                  {property.name || "Unnamed Property"}
                </h2>

                <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                  <span className="inline-flex items-center gap-1">
                    <Building2 size={15} />
                    {property.code}
                  </span>

                  <span className="inline-flex items-center gap-1">
                    <MapPin size={15} />
                    {property.city || "-"}
                    {property.state ? `, ${property.state}` : ""}
                    {property.country ? `, ${property.country}` : ""}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={`rounded-full px-4 py-2 text-sm font-semibold ${getStatusClasses(
                    status
                  )}`}
                >
                  {status}
                </span>

                

                <div className="ml-2 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                    {initials}
                  </div>
                  <div className="hidden sm:block">
                    <p className="text-sm font-semibold text-slate-900">
                      {user?.fullName || user?.name || "User"}
                    </p>
                    <p className="text-xs text-slate-500">{displayRole}</p>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <div className="p-6 md:p-8">
            <div className="mx-auto max-w-7xl space-y-6">
              <div className="space-y-6">
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-xl font-semibold text-slate-900">
                    Overview
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Main information about this apartment / property.
                  </p>

                  <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                    <InfoCard label="Property Code" value={property.code || "-"} />
                    <InfoCard label="Property Name" value={property.name || "-"} />
                    <InfoCard label="Property Type" value={property.propertyType || "-"} />
                    <InfoCard
                      label="Monthly Rent"
                      value={formatMoney(property.monthlyRent)}
                    />
                    <InfoCard label="City" value={property.city || "-"} />
                    <InfoCard label="State" value={property.state || "-"} />
                    <InfoCard label="Country" value={property.country || "-"} />
                    <InfoCard
                      label="Units Count"
                      value={String(property.unitsCount ?? 0)}
                    />
                    <InfoCard
                      label="Occupancy Status"
                      value={property.occupancyStatus || "-"}
                    />
                    <InfoCard
                      label="Available From"
                      value={formatDate(property.availableFrom)}
                    />

                    <div className="md:col-span-2">
                      <InfoCard
                        label="Address"
                        value={
                          [property.addressLine1, property.addressLine2]
                            .filter(Boolean)
                            .join(", ") || "-"
                        }
                      />
                    </div>

                    <div className="md:col-span-2">
                      <InfoCard
                        label="Description"
                        value={property.description || "-"}
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-xl font-semibold text-slate-900">
                    Property Features
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Physical and comfort details of this property.
                  </p>

                  <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                    <InfoCard
                      label="Bedrooms"
                      value={String(property.bedrooms ?? "-")}
                    />
                    <InfoCard
                      label="Bathrooms"
                      value={String(property.bathrooms ?? "-")}
                    />
                    <InfoCard
                      label="Area (sqm)"
                      value={String(property.areaSqm ?? "-")}
                    />
                    <InfoCard
                      label="Floor"
                      value={String(property.floor ?? "-")}
                    />
                    <InfoCard
                      label="Furnishing"
                      value={property.furnishingStatus || "-"}
                    />
                    <InfoCard
                      label="Parking Spaces"
                      value={String(property.parkingSpaces ?? 0)}
                    />
                    <InfoCard
                      label="Owner / Landlord"
                      value={property.ownerName || "-"}
                    />
                    <InfoCard
                      label="Active Record"
                      value={property.isActive ? "Yes" : "No"}
                    />
                  </div>
                </div>

                <PropertyGallery
                  propertyId={property.id}
                  images={property.propertyImages || []}
                />

                <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="text-xl font-semibold text-slate-900">
                      Quick Stats
                    </h2>

                    <div className="mt-5 space-y-4">
                      <div className="flex items-center gap-4 rounded-2xl bg-slate-50 p-4">
                        <div className="rounded-xl bg-blue-100 p-3 text-blue-700">
                          <Wallet size={20} />
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wide text-slate-500">
                            Monthly Rent
                          </p>
                          <p className="text-lg font-bold text-slate-900">
                            {formatMoney(property.monthlyRent)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 rounded-2xl bg-slate-50 p-4">
                        <div className="rounded-xl bg-emerald-100 p-3 text-emerald-700">
                          <Home size={20} />
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wide text-slate-500">
                            Units Count
                          </p>
                          <p className="text-lg font-bold text-slate-900">
                            {property.unitsCount}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 rounded-2xl bg-slate-50 p-4">
                        <div className="rounded-xl bg-purple-100 p-3 text-purple-700">
                          <BedDouble size={20} />
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wide text-slate-500">
                            Bedrooms / Bathrooms
                          </p>
                          <p className="text-lg font-bold text-slate-900">
                            {property.bedrooms ?? 0} / {property.bathrooms ?? 0}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 rounded-2xl bg-slate-50 p-4">
                        <div className="rounded-xl bg-amber-100 p-3 text-amber-700">
                          <Ruler size={20} />
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wide text-slate-500">
                            Area
                          </p>
                          <p className="text-lg font-bold text-slate-900">
                            {property.areaSqm ?? "-"} sqm
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 rounded-2xl bg-slate-50 p-4">
                        <div className="rounded-xl bg-cyan-100 p-3 text-cyan-700">
                          <Car size={20} />
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wide text-slate-500">
                            Parking Spaces
                          </p>
                          <p className="text-lg font-bold text-slate-900">
                            {property.parkingSpaces ?? 0}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 rounded-2xl bg-slate-50 p-4">
                        <div className="rounded-xl bg-indigo-100 p-3 text-indigo-700">
                          <CalendarDays size={20} />
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wide text-slate-500">
                            Available From
                          </p>
                          <p className="text-lg font-bold text-slate-900">
                            {formatDate(property.availableFrom)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 rounded-2xl bg-slate-50 p-4">
                        <div className="rounded-xl bg-slate-200 p-3 text-slate-700">
                          <UserRound size={20} />
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wide text-slate-500">
                            Owner / Landlord
                          </p>
                          <p className="text-lg font-bold text-slate-900">
                            {property.ownerName || "-"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="text-xl font-semibold text-slate-900">
                      Future Modules
                    </h2>
                    <p className="mt-2 text-sm text-slate-500">
                      This page is ready for the next PropertyOS features.
                    </p>

                    <div className="mt-4 space-y-3">
                      <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                        Tenants
                      </div>
                      <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                        Lease Contracts
                      </div>
                      <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                        Maintenance Requests
                      </div>
                      <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                        Payments History
                      </div>
                      <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                        Documents
                      </div>
                      <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                        Photo Upload
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <footer className="mt-8 border-t border-slate-200 bg-white px-6 py-4 md:px-8">
            <div className="flex flex-col gap-2 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
              <p>© 2026 PropertyOS. All rights reserved.</p>
              <p>Built for smart property management.</p>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
} 