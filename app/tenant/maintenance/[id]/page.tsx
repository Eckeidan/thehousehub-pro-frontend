"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  Wrench,
  Clock3,
  AlertTriangle,
  CheckCircle2,
  PauseCircle,
  XCircle,
  CalendarDays,
  MapPin,
  ShieldCheck,
  UserCircle2,
  Building2,
  Home,
  BadgeDollarSign,
  Pencil,
  Phone,
  FileText,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type AuthUser = {
  id: string;
  fullName?: string;
  name?: string;
  email?: string;
  role?: string;
  tenantId?: string | null;
  tenant?: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    property?: {
      id: string;
      code?: string | null;
      name?: string | null;
      addressLine1?: string | null;
      city?: string | null;
    } | null;
    unit?: {
      id: string;
      unitCode?: string | null;
      unitName?: string | null;
    } | null;
  } | null;
};

type MaintenanceRequest = {
  id: string;
  requestNumber: string;
  title: string;
  description?: string | null;
  category: string;
  priority: string;
  status: string;
  locationNote?: string | null;
  preferredDate?: string | null;
  entryPermission?: boolean;
  estimatedCost?: number | string | null;
  actualCost?: number | string | null;
  adminNotes?: string | null;
  createdAt: string;
  updatedAt: string;
  property?: {
    id: string;
    code?: string | null;
    name?: string | null;
    addressLine1?: string | null;
    city?: string | null;
  } | null;
  unit?: {
    id: string;
    unitCode?: string | null;
    unitName?: string | null;
  } | null;
  tenant?: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
  } | null;
  contractor?: {
    id: string;
    companyName?: string | null;
    phone?: string | null;
    serviceCategory?: string | null;
    city?: string | null;
  } | null;
};

function formatDate(value?: string | null) {
  if (!value) return "Not set";
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(value?: string | null) {
  if (!value) return "Not set";
  return new Date(value).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMoney(value?: number | string | null) {
  if (value === null || value === undefined || value === "") return "Pending";
  const amount = Number(value);
  if (Number.isNaN(amount)) return String(value);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function getPriorityBadge(priority?: string | null) {
  switch (priority) {
    case "LOW":
      return "bg-slate-100 text-slate-700 border border-slate-200";
    case "MEDIUM":
      return "bg-blue-100 text-blue-700 border border-blue-200";
    case "HIGH":
      return "bg-amber-100 text-amber-700 border border-amber-200";
    case "URGENT":
      return "bg-rose-100 text-rose-700 border border-rose-200";
    default:
      return "bg-slate-100 text-slate-700 border border-slate-200";
  }
}

function getStatusBadge(status?: string | null) {
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

function getStatusIcon(status?: string | null) {
  switch (status) {
    case "OPEN":
      return <Clock3 className="h-5 w-5" />;
    case "IN_PROGRESS":
      return <Wrench className="h-5 w-5" />;
    case "ON_HOLD":
      return <PauseCircle className="h-5 w-5" />;
    case "RESOLVED":
      return <CheckCircle2 className="h-5 w-5" />;
    case "CLOSED":
      return <CheckCircle2 className="h-5 w-5" />;
    case "CANCELLED":
      return <XCircle className="h-5 w-5" />;
    default:
      return <AlertTriangle className="h-5 w-5" />;
  }
}

export default function TenantMaintenanceDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loading, setLoading] = useState(true);

  const [user, setUser] = useState<AuthUser | null>(null);
  const [request, setRequest] = useState<MaintenanceRequest | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    const rawUser = localStorage.getItem("user");

    if (!token || !rawUser) {
      router.replace("/");
      return;
    }

    try {
      const parsed = JSON.parse(rawUser);
      const role = String(parsed?.role || "").trim().toLowerCase();

      if (role !== "tenant") {
        if (role === "admin" || role === "superadmin") {
          router.replace("/dashboard");
          return;
        }
        if (role === "owner") {
          router.replace("/owner");
          return;
        }
        router.replace("/");
        return;
      }

      setCheckingAuth(false);
    } catch (err) {
      console.error("Tenant details auth parse error:", err);
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      router.replace("/");
    }
  }, [router]);

  useEffect(() => {
    if (!checkingAuth && id) {
      loadData();
    }
  }, [checkingAuth, id]);

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("token");

      const meRes = await fetch(`${API_URL}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${token || ""}`,
        },
        cache: "no-store",
      });

      const meData = await meRes.json().catch(() => null);

      if (meRes.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        router.replace("/");
        return;
      }

      if (!meRes.ok) {
        throw new Error(meData?.error || "Failed to load tenant profile");
      }

      const currentUser: AuthUser = meData?.user || null;
      setUser(currentUser);

      const res = await fetch(`${API_URL}/api/maintenance/${id}`, {
        headers: {
          Authorization: `Bearer ${token || ""}`,
        },
        cache: "no-store",
      });

      const data = await res.json().catch(() => null);

      if (res.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        router.replace("/");
        return;
      }

      if (!res.ok) {
        throw new Error(data?.error || "Failed to load maintenance request");
      }

      const tenantId = currentUser?.tenant?.id || currentUser?.tenantId;
      if (data?.tenant?.id !== tenantId) {
        throw new Error("You are not allowed to view this maintenance request.");
      }

      setRequest(data);
    } catch (err: any) {
      console.error("Tenant maintenance details error:", err);
      setError(err?.message || "Failed to load maintenance request.");
    } finally {
      setLoading(false);
    }
  }

  const canEdit = useMemo(() => {
    return request?.status === "OPEN";
  }, [request]);

  if (checkingAuth || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4f7fb]">
        <div className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-white px-8 py-6 shadow-xl text-slate-700">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading request details...
        </div>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4f7fb] p-6">
        <div className="w-full max-w-2xl rounded-3xl border border-rose-200 bg-white p-8 shadow-xl">
          <div className="flex items-center gap-3 text-rose-600">
            <AlertTriangle className="h-6 w-6" />
            <h2 className="text-2xl font-bold">Unable to load request</h2>
          </div>

          <p className="mt-4 text-slate-600">
            {error || "Maintenance request not found."}
          </p>

          <div className="mt-6">
            <Link
              href="/tenant/maintenance"
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Maintenance
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f7fb] px-4 py-8 md:px-6 md:py-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/tenant/maintenance"
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>

            <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700">
              {getStatusIcon(request.status)}
              Maintenance Details
            </span>
          </div>

          {canEdit && (
            <Link
              href={`/tenant/maintenance/edit/${request.id}`}
              className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              <Pencil className="h-4 w-4" />
              Edit Request
            </Link>
          )}
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Request Number
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                {request.requestNumber}
              </h1>
              <h2 className="mt-3 text-xl font-semibold text-slate-800">
                {request.title}
              </h2>
            </div>

            <div className="flex flex-wrap gap-2">
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadge(
                  request.status
                )}`}
              >
                {request.status?.replaceAll("_", " ")}
              </span>

              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getPriorityBadge(
                  request.priority
                )}`}
              >
                {request.priority}
              </span>
            </div>
          </div>

          <div className="mt-8 grid gap-6 xl:grid-cols-3">
            <div className="xl:col-span-2 space-y-6">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <div className="mb-3 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-slate-500" />
                  <h3 className="text-lg font-semibold text-slate-900">
                    Description
                  </h3>
                </div>
                <p className="text-sm leading-7 text-slate-700">
                  {request.description || "No description provided."}
                </p>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <div className="mb-4 flex items-center gap-2">
                  <Wrench className="h-5 w-5 text-slate-500" />
                  <h3 className="text-lg font-semibold text-slate-900">
                    Request Details
                  </h3>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <DetailCard
                    icon={<CalendarDays className="h-4 w-4" />}
                    label="Created On"
                    value={formatDateTime(request.createdAt)}
                  />
                  <DetailCard
                    icon={<CalendarDays className="h-4 w-4" />}
                    label="Preferred Date"
                    value={formatDate(request.preferredDate)}
                  />
                  <DetailCard
                    icon={<Wrench className="h-4 w-4" />}
                    label="Category"
                    value={request.category?.replaceAll("_", " ")}
                  />
                  <DetailCard
                    icon={<AlertTriangle className="h-4 w-4" />}
                    label="Priority"
                    value={request.priority}
                  />
                  <DetailCard
                    icon={<MapPin className="h-4 w-4" />}
                    label="Location Note"
                    value={request.locationNote || "Not specified"}
                  />
                  <DetailCard
                    icon={<ShieldCheck className="h-4 w-4" />}
                    label="Entry Permission"
                    value={request.entryPermission ? "Allowed" : "Not allowed"}
                  />
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <div className="mb-4 flex items-center gap-2">
                  <UserCircle2 className="h-5 w-5 text-slate-500" />
                  <h3 className="text-lg font-semibold text-slate-900">
                    Assigned Contractor
                  </h3>
                </div>

                {request.contractor ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    <DetailCard
                      icon={<UserCircle2 className="h-4 w-4" />}
                      label="Company"
                      value={request.contractor.companyName || "N/A"}
                    />
                    <DetailCard
                      icon={<Phone className="h-4 w-4" />}
                      label="Phone"
                      value={request.contractor.phone || "N/A"}
                    />
                    <DetailCard
                      icon={<Wrench className="h-4 w-4" />}
                      label="Service Category"
                      value={
                        request.contractor.serviceCategory || "Not specified"
                      }
                    />
                    <DetailCard
                      icon={<MapPin className="h-4 w-4" />}
                      label="City"
                      value={request.contractor.city || "N/A"}
                    />
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-5 py-6 text-sm text-slate-500">
                    No contractor assigned yet.
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <div className="mb-4 flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-slate-500" />
                  <h3 className="text-lg font-semibold text-slate-900">
                    Property & Unit
                  </h3>
                </div>

                <div className="space-y-4">
                  <DetailCard
                    icon={<Building2 className="h-4 w-4" />}
                    label="Property"
                    value={
                      request.property?.name ||
                      request.property?.code ||
                      "N/A"
                    }
                  />
                  <DetailCard
                    icon={<MapPin className="h-4 w-4" />}
                    label="Address"
                    value={
                      request.property?.addressLine1 ||
                      request.property?.city ||
                      "N/A"
                    }
                  />
                  <DetailCard
                    icon={<Home className="h-4 w-4" />}
                    label="Unit"
                    value={
                      request.unit?.unitCode || request.unit?.unitName || "N/A"
                    }
                  />
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <div className="mb-4 flex items-center gap-2">
                  <BadgeDollarSign className="h-5 w-5 text-slate-500" />
                  <h3 className="text-lg font-semibold text-slate-900">
                    Cost Summary
                  </h3>
                </div>

                <div className="space-y-4">
                  <DetailCard
                    icon={<BadgeDollarSign className="h-4 w-4" />}
                    label="Estimated Cost"
                    value={formatMoney(request.estimatedCost)}
                  />
                  <DetailCard
                    icon={<BadgeDollarSign className="h-4 w-4" />}
                    label="Actual Cost"
                    value={formatMoney(request.actualCost)}
                  />
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <div className="mb-4 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-slate-500" />
                  <h3 className="text-lg font-semibold text-slate-900">
                    Admin Notes
                  </h3>
                </div>

                <p className="text-sm leading-7 text-slate-700">
                  {request.adminNotes || "No admin notes yet."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
      <div className="flex items-center gap-2 text-slate-500">
        {icon}
        <p className="text-xs font-semibold uppercase tracking-wide">{label}</p>
      </div>
      <p className="mt-2 text-sm font-medium text-slate-900">{value}</p>
    </div>
  );
}