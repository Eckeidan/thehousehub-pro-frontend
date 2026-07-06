"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  BedDouble,
  Building2,
  CalendarDays,
  Car,
  Home,
  MapPin,
  Pencil,
  Ruler,
  ShieldCheck,
  Sparkles,
  UserRound,
  Wallet,
} from "lucide-react";
import AdminShell from "@/components/AdminShell";
import PropertyGallery from "./PropertyGallery";

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
  postalCode?: string | null;
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
  organizationId?: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

function formatMoney(value?: number | null) {
  if (value == null) return "-";
  return `$${Number(value).toLocaleString()}`;
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString();
}

function formatEnum(value?: string | null) {
  if (!value) return "-";
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getStatusClasses(status?: string | null) {
  switch (status) {
    case "AVAILABLE":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "OCCUPIED":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "MAINTENANCE":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "RESERVED":
      return "border-violet-200 bg-violet-50 text-violet-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

function MetricCard({
  label,
  value,
  detail,
  icon,
  tone,
}: {
  label: string;
  value: string;
  detail?: string;
  icon: React.ReactNode;
  tone: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {label}
          </p>
          <p className="mt-3 text-2xl font-bold tracking-tight text-slate-950">
            {value}
          </p>
          {detail && <p className="mt-1 text-sm text-slate-500">{detail}</p>}
        </div>
        <div className={`rounded-2xl p-3 ${tone}`}>{icon}</div>
      </div>
    </div>
  );
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-2 break-words text-sm font-semibold text-slate-900">
        {value || "-"}
      </p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-8">
      <div className="rounded-3xl border border-slate-200 bg-white px-8 py-6 text-slate-700 shadow-xl">
        Loading property details...
      </div>
    </div>
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
    } catch (authError) {
      console.error("Property detail auth error:", authError);
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
      } catch (loadError) {
        console.error("Error loading property:", loadError);
        setError("Unable to load property details.");
      } finally {
        setLoading(false);
      }
    };

    loadProperty();
  }, [checkingAuth, id, router]);

  const address = useMemo(() => {
    if (!property) return "-";
    return (
      [
        property.addressLine1,
        property.addressLine2,
        property.city,
        property.state,
        property.postalCode,
        property.country,
      ]
        .filter(Boolean)
        .join(", ") || "-"
    );
  }, [property]);

  if (checkingAuth || loading) {
    return <LoadingState />;
  }

  if (!property) {
    return (
      <AdminShell
        user={user}
        activeItem="properties"
        title="Property Not Found"
        subtitle="The property could not be loaded."
        actions={
          <Link
            href="/properties"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <ArrowLeft size={16} />
            Back
          </Link>
        }
      >
        <div className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-950">
            Property not found
          </h1>
          <p className="mt-2 text-slate-500">
            {error ||
              "The property you are looking for does not exist, or the API could not return the data."}
          </p>
        </div>
      </AdminShell>
    );
  }

  const status = property.occupancyStatus || "AVAILABLE";

  return (
    <AdminShell
      user={user}
      activeItem="properties"
      title={property.name || "Unnamed Property"}
      subtitle={`${property.code} / ${[
        property.city,
        property.state,
        property.country,
      ]
        .filter(Boolean)
        .join(", ")}`}
      actions={
        <>
          <span
            className={`inline-flex items-center rounded-full border px-4 py-2 text-sm font-semibold ${getStatusClasses(
              status
            )}`}
          >
            {formatEnum(status)}
          </span>
          <Link
            href="/properties"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <ArrowLeft size={16} />
            Back
          </Link>
        </>
      }
    >
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-[1.35fr_0.65fr]">
            <div className="relative min-h-[340px] bg-slate-950 p-6 text-white sm:p-8">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.45),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.28),transparent_30%)]" />
              <div className="relative z-10 flex h-full flex-col justify-between gap-10">
                <div>
                  <Link
                    href="/properties"
                    className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15"
                  >
                    <ArrowLeft size={16} />
                    Back to Properties
                  </Link>

                  <div className="mt-8 max-w-3xl">
                    <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-100">
                      <ShieldCheck size={14} />
                      Asset Profile
                    </p>
                    <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
                      {property.name || "Unnamed Property"}
                    </h1>
                    <p className="mt-4 max-w-2xl text-base leading-7 text-blue-50/80">
                      {property.description ||
                        "Premium property record with operational, financial, and occupancy data in one place."}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                    <p className="text-xs uppercase tracking-wide text-blue-100/70">
                      Code
                    </p>
                    <p className="mt-2 text-lg font-bold">{property.code}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                    <p className="text-xs uppercase tracking-wide text-blue-100/70">
                      Type
                    </p>
                    <p className="mt-2 text-lg font-bold">
                      {formatEnum(property.propertyType)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                    <p className="text-xs uppercase tracking-wide text-blue-100/70">
                      Rent
                    </p>
                    <p className="mt-2 text-lg font-bold">
                      {formatMoney(property.monthlyRent)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col justify-between gap-6 bg-white p-6 sm:p-8">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Location
                </p>
                <div className="mt-4 flex gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                    <MapPin size={20} />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-slate-950">
                      {property.city || "-"}
                      {property.state ? `, ${property.state}` : ""}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      {address}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <DetailItem label="Units" value={String(property.unitsCount ?? 0)} />
                <DetailItem label="Floor" value={String(property.floor ?? "-")} />
                <DetailItem
                  label="Available"
                  value={formatDate(property.availableFrom)}
                />
                <DetailItem
                  label="Record"
                  value={property.isActive ? "Active" : "Inactive"}
                />
              </div>

              <Link
                href="/properties"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
              >
                <Pencil size={16} />
                Manage Property
              </Link>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Monthly Rent"
            value={formatMoney(property.monthlyRent)}
            detail="Recurring revenue"
            icon={<Wallet size={22} />}
            tone="bg-blue-50 text-blue-700"
          />
          <MetricCard
            label="Bedrooms / Baths"
            value={`${property.bedrooms ?? 0} / ${property.bathrooms ?? 0}`}
            detail="Residential capacity"
            icon={<BedDouble size={22} />}
            tone="bg-violet-50 text-violet-700"
          />
          <MetricCard
            label="Area"
            value={property.areaSqm ? `${property.areaSqm} sqm` : "-"}
            detail="Interior size"
            icon={<Ruler size={22} />}
            tone="bg-amber-50 text-amber-700"
          />
          <MetricCard
            label="Parking"
            value={String(property.parkingSpaces ?? 0)}
            detail="Available spaces"
            icon={<Car size={22} />}
            tone="bg-emerald-50 text-emerald-700"
          />
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[0.68fr_0.32fr]">
          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-950">
                    Property Intelligence
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Core operational fields for leasing, accounting, and maintenance.
                  </p>
                </div>
                <span className="inline-flex w-fit items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  <Sparkles size={14} />
                  Live profile
                </span>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                <DetailItem label="Property Name" value={property.name || "-"} />
                <DetailItem label="Property Code" value={property.code || "-"} />
                <DetailItem
                  label="Property Type"
                  value={formatEnum(property.propertyType)}
                />
                <DetailItem label="Status" value={formatEnum(status)} />
                <DetailItem label="City" value={property.city || "-"} />
                <DetailItem label="State" value={property.state || "-"} />
                <DetailItem label="ZIP Code" value={property.postalCode || "-"} />
                <DetailItem label="Country" value={property.country || "-"} />
                <DetailItem
                  label="Furnishing"
                  value={formatEnum(property.furnishingStatus)}
                />
                <DetailItem
                  label="Owner / Landlord"
                  value={property.ownerName || "-"}
                />
                <div className="md:col-span-2">
                  <DetailItem label="Full Address" value={address} />
                </div>
                <div className="md:col-span-2">
                  <DetailItem
                    label="Description"
                    value={property.description || "-"}
                  />
                </div>
              </div>
            </div>

            <PropertyGallery
              propertyId={property.id}
              images={property.propertyImages || []}
            />
          </div>

          <aside className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-950">
                Asset Snapshot
              </h2>
              <div className="mt-5 space-y-3">
                <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4">
                  <div className="rounded-xl bg-blue-100 p-3 text-blue-700">
                    <Home size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Units
                    </p>
                    <p className="text-lg font-bold text-slate-950">
                      {property.unitsCount}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4">
                  <div className="rounded-xl bg-emerald-100 p-3 text-emerald-700">
                    <CalendarDays size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Available From
                    </p>
                    <p className="text-lg font-bold text-slate-950">
                      {formatDate(property.availableFrom)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4">
                  <div className="rounded-xl bg-slate-200 p-3 text-slate-700">
                    <UserRound size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Owner
                    </p>
                    <p className="text-lg font-bold text-slate-950">
                      {property.ownerName || "-"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-950 p-6 text-white shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                <Building2 size={22} />
              </div>
              <h2 className="mt-5 text-xl font-bold">Next Operations</h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                This property profile is ready to connect tenants, lease contracts,
                maintenance requests, payments, and documents.
              </p>
              <div className="mt-5 space-y-2 text-sm">
                {[
                  "Tenant assignment",
                  "Lease contract",
                  "Payment history",
                  "Maintenance timeline",
                  "Documents vault",
                ].map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-100"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </section>
      </div>
    </AdminShell>
  );
}
