"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  DoorOpen,
  Home,
  Loader2,
  Pencil,
  User,
  Wrench,
  DollarSign,
  Layers3,
  FileText,
} from "lucide-react";

const API_BASE = "http://localhost:4000/api";

type Property = {
  id: string;
  code: string;
  name?: string | null;
  addressLine1?: string | null;
  city?: string | null;
  country?: string | null;
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
  createdAt?: string;
  updatedAt?: string;
  property?: Property;
};

type Tenant = {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  status?: string | null;
  leaseStatus?: string | null;
  isActive?: boolean;
  propertyId?: string | null;
  unitId?: string | null;
};

type MaintenanceRequest = {
  id: string;
  requestNumber: string;
  title: string;
  description?: string | null;
  category?: string | null;
  priority?: string | null;
  status?: string | null;
  createdAt?: string;
};

function occupancyBadge(status?: string | null) {
  switch (status) {
    case "AVAILABLE":
      return "bg-emerald-100 text-emerald-700 border border-emerald-200";
    case "OCCUPIED":
      return "bg-blue-100 text-blue-700 border border-blue-200";
    case "RESERVED":
      return "bg-violet-100 text-violet-700 border border-violet-200";
    case "MAINTENANCE":
      return "bg-rose-100 text-rose-700 border border-rose-200";
    default:
      return "bg-slate-100 text-slate-700 border border-slate-200";
  }
}

function maintenanceStatusBadge(status?: string | null) {
  switch (status) {
    case "OPEN":
      return "bg-amber-100 text-amber-700 border border-amber-200";
    case "IN_PROGRESS":
      return "bg-blue-100 text-blue-700 border border-blue-200";
    case "ON_HOLD":
      return "bg-violet-100 text-violet-700 border border-violet-200";
    case "RESOLVED":
      return "bg-emerald-100 text-emerald-700 border border-emerald-200";
    case "CLOSED":
      return "bg-slate-100 text-slate-700 border border-slate-200";
    case "CANCELLED":
      return "bg-rose-100 text-rose-700 border border-rose-200";
    default:
      return "bg-slate-100 text-slate-700 border border-slate-200";
  }
}

function formatMoney(value?: string | number | null) {
  if (value === null || value === undefined || value === "") return "N/A";
  return `$${value}`;
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-GB");
}

export default function UnitDetailsPage() {
  const params = useParams();
  const id = params?.id as string;

  const [unit, setUnit] = useState<Unit | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const unitRes = await fetch(`${API_BASE}/units/${id}`, {
        cache: "no-store",
      });

      const unitData = await unitRes.json();

      if (!unitRes.ok) {
        throw new Error(unitData?.error || "Failed to load unit");
      }

      setUnit(unitData);

      const [tenantsRes, maintenanceRes] = await Promise.all([
        fetch(`${API_BASE}/tenants`, { cache: "no-store" }),
        fetch(`${API_BASE}/maintenance?unitId=${encodeURIComponent(id)}`, {
          cache: "no-store",
        }),
      ]);

      const tenantsData = await tenantsRes.json();
      const maintenanceData = await maintenanceRes.json();

      if (!tenantsRes.ok) {
        throw new Error(tenantsData?.error || "Failed to load tenants");
      }

      if (!maintenanceRes.ok) {
        throw new Error(
          maintenanceData?.error || "Failed to load maintenance requests"
        );
      }

      const allTenants = Array.isArray(tenantsData) ? tenantsData : [];
      const unitTenants = allTenants.filter((tenant: Tenant) => tenant.unitId === id);
      setTenants(unitTenants);

      setMaintenance(Array.isArray(maintenanceData) ? maintenanceData : []);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to load unit.");
    } finally {
      setLoading(false);
    }
  }

  const currentTenant = useMemo(() => {
    return (
      tenants.find(
        (tenant) =>
          tenant.isActive !== false &&
          tenant.status !== "INACTIVE"
      ) || null
    );
  }, [tenants]);

  const maintenanceStats = useMemo(() => {
    return {
      total: maintenance.length,
      open: maintenance.filter((m) => m.status === "OPEN").length,
      inProgress: maintenance.filter((m) => m.status === "IN_PROGRESS").length,
      resolved: maintenance.filter((m) => m.status === "RESOLVED").length,
    };
  }, [maintenance]);

  if (loading) {
    return (
      <div className="flex items-center justify-center px-6 py-20 text-slate-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading unit details...
      </div>
    );
  }

  if (error || !unit) {
    return (
      <div className="space-y-6 p-6 max-w-5xl mx-auto">
        <div className="flex items-center gap-3">
          <Link
            href="/units"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-blue-600"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>

          <div>
            <h1 className="text-2xl font-bold text-slate-800">Unit Details</h1>
            <p className="text-sm text-slate-500">
              Unable to display unit record.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700">
          {error || "Unit not found."}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <Link
            href="/units"
            className="mt-1 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-blue-600"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>

          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              {unit.unitCode}
              {unit.unitName ? ` — ${unit.unitName}` : ""}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Unit profile, occupancy, and maintenance overview.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/units/edit/${unit.id}`}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            <Pencil className="h-4 w-4" />
            Edit Unit
          </Link>
        </div>
      </div>

      {/* Top cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Occupancy Status
          </p>
          <div className="mt-3">
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${occupancyBadge(
                unit.occupancyStatus
              )}`}
            >
              {unit.occupancyStatus || "N/A"}
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Monthly Rent
          </p>
          <p className="mt-3 text-lg font-bold text-slate-800">
            {formatMoney(unit.monthlyRent)}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Beds / Baths
          </p>
          <p className="mt-3 text-lg font-bold text-slate-800">
            {unit.bedrooms ?? "—"} / {unit.bathrooms ?? "—"}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Area
          </p>
          <p className="mt-3 text-lg font-bold text-slate-800">
            {unit.areaSqm ?? "—"} sqm
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Unit Info */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-800">Unit Information</h3>

          <div className="mt-4 space-y-4">
            <div className="flex items-center gap-3 text-slate-700">
              <DoorOpen className="h-4 w-4 text-slate-400" />
              <span>{unit.unitCode}</span>
            </div>

            <div className="flex items-center gap-3 text-slate-700">
              <Layers3 className="h-4 w-4 text-slate-400" />
              <span>Floor: {unit.floor ?? "—"}</span>
            </div>

            <div className="flex items-center gap-3 text-slate-700">
              <Home className="h-4 w-4 text-slate-400" />
              <span>
                {unit.bedrooms ?? "—"} beds / {unit.bathrooms ?? "—"} baths
              </span>
            </div>

            <div className="flex items-center gap-3 text-slate-700">
              <DollarSign className="h-4 w-4 text-slate-400" />
              <span>{formatMoney(unit.monthlyRent)}</span>
            </div>
          </div>
        </div>

        {/* Property */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-800">Property</h3>

          <div className="mt-4 space-y-4">
            <div className="flex items-center gap-3 text-slate-700">
              <Building2 className="h-4 w-4 text-slate-400" />
              <span>{unit.property?.name || unit.property?.code || "N/A"}</span>
            </div>

            <div className="flex items-center gap-3 text-slate-700">
              <Building2 className="h-4 w-4 text-slate-400" />
              <span>{unit.property?.addressLine1 || "No address available"}</span>
            </div>

            <div className="flex items-center gap-3 text-slate-700">
              <Building2 className="h-4 w-4 text-slate-400" />
              <span>
                {[unit.property?.city, unit.property?.country]
                  .filter(Boolean)
                  .join(", ") || "N/A"}
              </span>
            </div>
          </div>
        </div>

        {/* Current Tenant */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-800">Current Tenant</h3>

          <div className="mt-4">
            {currentTenant ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-slate-700">
                  <User className="h-4 w-4 text-slate-400" />
                  <span>
                    {currentTenant.firstName} {currentTenant.lastName}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-slate-700">
                  <User className="h-4 w-4 text-slate-400" />
                  <span>{currentTenant.email || currentTenant.phone || "N/A"}</span>
                </div>

                <div>
                  <Link
                    href={`/tenants/${currentTenant.id}`}
                    className="inline-flex items-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    View Tenant
                  </Link>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">No active tenant assigned.</p>
            )}
          </div>
        </div>
      </div>

      {/* Maintenance summary */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Total Requests
          </p>
          <p className="mt-3 text-2xl font-bold text-slate-800">
            {maintenanceStats.total}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Open
          </p>
          <p className="mt-3 text-2xl font-bold text-amber-700">
            {maintenanceStats.open}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            In Progress
          </p>
          <p className="mt-3 text-2xl font-bold text-blue-700">
            {maintenanceStats.inProgress}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Resolved
          </p>
          <p className="mt-3 text-2xl font-bold text-emerald-700">
            {maintenanceStats.resolved}
          </p>
        </div>
      </div>

      {/* Maintenance history + notes */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-800">
            <Wrench className="h-5 w-5 text-slate-500" />
            Maintenance History
          </h3>

          <div className="mt-4 space-y-3">
            {maintenance.length === 0 ? (
              <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                No maintenance requests found for this unit.
              </div>
            ) : (
              maintenance.map((item) => (
                <Link
                  key={item.id}
                  href={`/maintenance/${item.id}`}
                  className="block rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:bg-slate-100"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="font-semibold text-slate-800">
                        {item.requestNumber}
                      </p>
                      <p className="mt-1 text-sm text-slate-700">{item.title}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {item.category || "N/A"} • {formatDate(item.createdAt)}
                      </p>
                    </div>

                    <span
                      className={`inline-flex self-start rounded-full px-3 py-1 text-xs font-semibold ${maintenanceStatusBadge(
                        item.status
                      )}`}
                    >
                      {item.status || "N/A"}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-800">
            <FileText className="h-5 w-5 text-slate-500" />
            Notes
          </h3>

          <div className="mt-4 min-h-[250px] rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
            {unit.notes || "No notes available for this unit."}
          </div>
        </div>
      </div>
    </div>
  );
}