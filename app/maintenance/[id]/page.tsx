"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  User,
  Building2,
  Loader2,
  MapPin,
  DoorOpen,
  Layers3,
  Calendar,
  ClipboardList,
  ShieldCheck,
  FileText,
  StickyNote,
  Pencil,
} from "lucide-react";

const API_BASE = "http://localhost:4000/api";

type StoredUser = {
  id?: string;
  fullName?: string;
  name?: string;
  email?: string;
  role?: string;
};

function statusBadge(status?: string) {
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

function priorityBadge(priority?: string) {
  switch (priority) {
    case "LOW":
      return "bg-slate-100 text-slate-700 border border-slate-200";
    case "MEDIUM":
      return "bg-amber-100 text-amber-700 border border-amber-200";
    case "HIGH":
      return "bg-orange-100 text-orange-700 border border-orange-200";
    case "URGENT":
      return "bg-rose-100 text-rose-700 border border-rose-200";
    default:
      return "bg-slate-100 text-slate-700 border border-slate-200";
  }
}

export default function MaintenanceDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [user, setUser] = useState<StoredUser | null>(null);

  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
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
      console.error("Maintenance detail auth error:", error);
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      router.replace("/");
    }
  }, [router]);

  useEffect(() => {
    if (!checkingAuth && id) {
      fetchRequest();
    }
  }, [checkingAuth, id]);

  const fetchRequest = async () => {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("token");

      const res = await fetch(`${API_BASE}/maintenance/${id}`, {
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
        throw new Error(data?.error || "Failed to fetch request");
      }

      setRequest(data);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Unable to load maintenance request.");
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (status: string) => {
    try {
      setUpdatingStatus(true);

      const token = localStorage.getItem("token");

      const res = await fetch(`${API_BASE}/maintenance/${request.id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token || ""}`,
        },
        body: JSON.stringify({ status }),
      });

      if (res.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        router.replace("/");
        return;
      }

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "Failed to update status");
      }

      await fetchRequest();
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Unable to update status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const formatDate = (date?: string | null) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("en-GB");
  };

  const formatDateTime = (date?: string | null) => {
    if (!date) return "—";
    return new Date(date).toLocaleString("en-GB");
  };

  if (checkingAuth) {
    return (
      <div className="flex items-center justify-center px-6 py-20 text-slate-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Checking session...
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center px-6 py-20 text-slate-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading maintenance request...
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="space-y-6 p-6 max-w-5xl mx-auto">
        <div className="flex items-center gap-3">
          <Link
            href="/maintenance"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-blue-600"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>

          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              Maintenance Details
            </h1>
            <p className="text-sm text-slate-500">
              Unable to display maintenance request.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700">
          {error || "Maintenance request not found."}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <Link
              href="/maintenance"
              className="mt-1 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-blue-600"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>

            <div>
              <h1 className="text-2xl font-bold text-slate-800">
                {request.requestNumber}
              </h1>
              <p className="mt-1 text-sm text-slate-500">{request.title}</p>
            </div>
          </div>

          <div className="flex gap-3">
            <Link
              href={`/maintenance/edit/${request.id}`}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <Pencil className="h-4 w-4" />
              Edit Request
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Status
            </p>
            <div className="mt-3">
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusBadge(
                  request.status
                )}`}
              >
                {request.status || "N/A"}
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Priority
            </p>
            <div className="mt-3">
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${priorityBadge(
                  request.priority
                )}`}
              >
                {request.priority || "N/A"}
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Created At
            </p>
            <p className="mt-3 text-sm font-medium text-slate-800">
              {formatDateTime(request.createdAt)}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Preferred Date
            </p>
            <p className="mt-3 text-sm font-medium text-slate-800">
              {formatDate(request.preferredDate)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-800">
              Property
            </h2>

            <div className="space-y-4">
              <div className="flex items-start gap-3 text-slate-700">
                <Building2 className="mt-1 h-4 w-4 text-slate-400" />
                <div>
                  <p className="font-medium">
                    {request.property?.name || request.property?.code || "N/A"}
                  </p>
                  <p className="text-sm text-slate-500">
                    {request.property?.code || "—"}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 text-slate-700">
                <MapPin className="mt-1 h-4 w-4 text-slate-400" />
                <div>
                  <p className="text-sm">
                    {request.property?.addressLine1 || "No address available"}
                  </p>
                  <p className="text-sm text-slate-500">
                    {request.property?.city || "—"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-800">
              Unit
            </h2>

            {request.unit ? (
              <div className="space-y-4">
                <div className="flex items-start gap-3 text-slate-700">
                  <DoorOpen className="mt-1 h-4 w-4 text-slate-400" />
                  <div>
                    <p className="font-medium">
                      {request.unit.unitCode}
                      {request.unit.unitName ? ` — ${request.unit.unitName}` : ""}
                    </p>
                    <p className="text-sm text-slate-500">
                      Occupancy: {request.unit.occupancyStatus || "—"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 text-slate-700">
                  <Layers3 className="mt-1 h-4 w-4 text-slate-400" />
                  <div>
                    <p className="text-sm">
                      Floor: {request.unit.floor ?? "—"}
                    </p>
                    <p className="text-sm text-slate-500">
                      Beds/Baths: {request.unit.bedrooms ?? "—"} /{" "}
                      {request.unit.bathrooms ?? "—"}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">No unit linked.</p>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-800">
              Tenant
            </h2>

            {request.tenant ? (
              <div className="space-y-4">
                <div className="flex items-start gap-3 text-slate-700">
                  <User className="mt-1 h-4 w-4 text-slate-400" />
                  <div>
                    <p className="font-medium">
                      {request.tenant.firstName} {request.tenant.lastName}
                    </p>
                    <p className="text-sm text-slate-500">
                      {request.tenant.email || request.tenant.phone || "—"}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">No tenant linked.</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-800">
              <ClipboardList className="h-5 w-5 text-slate-500" />
              Request Description
            </h2>

            <div className="min-h-[220px] rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700 whitespace-pre-line">
              {request.description || "No description provided."}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-800">
                <Calendar className="h-5 w-5 text-slate-500" />
                Request Details
              </h2>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Category
                  </p>
                  <p className="mt-2 text-sm font-medium text-slate-800">
                    {request.category || "N/A"}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Entry Permission
                  </p>
                  <p className="mt-2 text-sm font-medium text-slate-800">
                    {request.entryPermission ? "Yes" : "No"}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Resolved At
                  </p>
                  <p className="mt-2 text-sm font-medium text-slate-800">
                    {formatDateTime(request.resolvedAt)}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Completed At
                  </p>
                  <p className="mt-2 text-sm font-medium text-slate-800">
                    {formatDateTime(request.completedAt)}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-800">
                <ShieldCheck className="h-5 w-5 text-slate-500" />
                Quick Actions
              </h2>

              <div className="flex flex-col gap-3">
                <button
                  onClick={() => updateStatus("IN_PROGRESS")}
                  disabled={updatingStatus}
                  className="rounded-lg bg-blue-600 px-4 py-2.5 text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {updatingStatus ? "Updating..." : "Mark In Progress"}
                </button>

                <button
                  onClick={() => updateStatus("RESOLVED")}
                  disabled={updatingStatus}
                  className="rounded-lg bg-emerald-600 px-4 py-2.5 text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {updatingStatus ? "Updating..." : "Mark Resolved"}
                </button>

                <button
                  onClick={() => updateStatus("CLOSED")}
                  disabled={updatingStatus}
                  className="rounded-lg bg-slate-700 px-4 py-2.5 text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {updatingStatus ? "Updating..." : "Close Request"}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-800">
              <StickyNote className="h-5 w-5 text-slate-500" />
              Admin Notes
            </h2>

            <div className="min-h-[180px] rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700 whitespace-pre-line">
              {request.adminNotes || "No admin notes available."}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-800">
              <FileText className="h-5 w-5 text-slate-500" />
              Notes
            </h2>

            <div className="min-h-[180px] rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700 whitespace-pre-line">
              {request.notes || "No notes available."}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}