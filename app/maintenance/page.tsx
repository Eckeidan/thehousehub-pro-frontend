"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Users,
  Wrench,
  Search,
  Filter,
  Eye,
  Pencil,
  Trash2,
  AlertTriangle,
  Clock3,
  CheckCircle2,
  XCircle,
  Plus,
  RefreshCw,
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

type Tenant = {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
};

type Contractor = {
  id: string;
  companyName: string;
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
  assignedTo?: string | null;
  preferredDate?: string | null;
  entryPermission: boolean;
  estimatedCost?: string | null;
  actualCost?: string | null;
  adminNotes?: string | null;
  dueDate?: string | null;
  resolvedAt?: string | null;
  completedAt?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  property: Property;
  tenant?: Tenant | null;
  contractor?: Contractor | null;
};

type MaintenanceStats = {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  urgent: number;
  closed: number;
};

const API_BASE = "http://localhost:4000/api";

export default function MaintenancePage() {
  const router = useRouter();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [user, setUser] = useState<StoredUser | null>(null);

  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [stats, setStats] = useState<MaintenanceStats>({
    total: 0,
    open: 0,
    inProgress: 0,
    resolved: 0,
    urgent: 0,
    closed: 0,
  });

  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [category, setCategory] = useState("");

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] =
    useState<MaintenanceRequest | null>(null);
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
      console.error("Maintenance auth error:", error);
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      router.replace("/");
    }
  }, [router]);

  const statusColor = (status: string) => {
    switch (status) {
      case "OPEN":
        return "bg-yellow-100 text-yellow-700";
      case "IN_PROGRESS":
        return "bg-blue-100 text-blue-700";
      case "RESOLVED":
        return "bg-green-100 text-green-700";
      case "CLOSED":
        return "bg-gray-200 text-gray-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  const priorityColor = (priority: string) => {
    switch (priority) {
      case "LOW":
        return "bg-gray-100 text-gray-700";
      case "MEDIUM":
        return "bg-yellow-100 text-yellow-700";
      case "HIGH":
        return "bg-orange-100 text-orange-700";
      case "URGENT":
        return "bg-red-100 text-red-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  const queryString = useMemo(() => {
    const params = new URLSearchParams();

    if (search.trim()) params.set("search", search.trim());
    if (status) params.set("status", status);
    if (priority) params.set("priority", priority);
    if (category) params.set("category", category);

    return params.toString();
  }, [search, status, priority, category]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("token");

      const res = await fetch(
        `${API_BASE}/maintenance${queryString ? `?${queryString}` : ""}`,
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
        throw new Error(data?.error || "Failed to fetch maintenance requests");
      }

      const data = await res.json();
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load maintenance requests."
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      setStatsLoading(true);

      const token = localStorage.getItem("token");

      const res = await fetch(`${API_BASE}/maintenance/stats`, {
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
        throw new Error(data?.error || "Failed to fetch maintenance stats");
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
      fetchRequests();
    }
  }, [checkingAuth, queryString]);

  useEffect(() => {
    if (!checkingAuth) {
      fetchStats();
    }
  }, [checkingAuth]);

  const refreshAll = async () => {
    await Promise.all([fetchRequests(), fetchStats()]);
  };

  const handleDeleteClick = (request: MaintenanceRequest) => {
    setSelectedRequest(request);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedRequest) return;

    try {
      setDeleting(true);

      const token = localStorage.getItem("token");

      const res = await fetch(`${API_BASE}/maintenance/${selectedRequest.id}`, {
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
        throw new Error(data?.error || "Failed to delete maintenance request");
      }

      setDeleteModalOpen(false);
      setSelectedRequest(null);
      await refreshAll();
    } catch (err) {
      console.error(err);
      alert("Failed to delete maintenance request.");
    } finally {
      setDeleting(false);
    }
  };

  const handleQuickStatusChange = async (
    requestId: string,
    newStatus: string
  ) => {
    try {
      const token = localStorage.getItem("token");

      const res = await fetch(`${API_BASE}/maintenance/${requestId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token || ""}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        router.replace("/");
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to update status");
      }

      await refreshAll();
    } catch (err) {
      console.error(err);
      alert("Failed to update request status.");
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

  const statCards = [
    {
      label: "Total Requests",
      value: stats.total,
      icon: <Wrench className="h-5 w-5" />,
      color: "text-slate-700",
      bg: "bg-slate-50",
    },
    {
      label: "Open",
      value: stats.open,
      icon: <Clock3 className="h-5 w-5" />,
      color: "text-amber-700",
      bg: "bg-amber-50",
    },
    {
      label: "In Progress",
      value: stats.inProgress,
      icon: <RefreshCw className="h-5 w-5" />,
      color: "text-blue-700",
      bg: "bg-blue-50",
    },
    {
      label: "Resolved",
      value: stats.resolved,
      icon: <CheckCircle2 className="h-5 w-5" />,
      color: "text-emerald-700",
      bg: "bg-emerald-50",
    },
    {
      label: "Urgent",
      value: stats.urgent,
      icon: <AlertTriangle className="h-5 w-5" />,
      color: "text-red-700",
      bg: "bg-red-50",
    },
    {
      label: "Closed",
      value: stats.closed,
      icon: <XCircle className="h-5 w-5" />,
      color: "text-slate-700",
      bg: "bg-slate-100",
    },
  ];

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
    <div className="min-h-screen bg-slate-50 px-4 py-6 md:px-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
            >
              <ArrowLeft className="h-4 w-4" />
              <Users className="h-4 w-4 text-blue-600" />
              Dashboard
            </Link>

            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Maintenance
              </h1>
              <p className="text-sm text-slate-500">
                Track, manage, and resolve maintenance requests across your
                properties.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={refreshAll}
              className="rounded-lg border px-4 py-2 text-sm hover:bg-slate-100"
            >
              Refresh
            </button>

            <Link
              href="/maintenance/new"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
            >
              + New Request
            </Link>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
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

        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div className="mb-4 flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-500" />
            <h2 className="text-sm font-semibold text-slate-800">Filters</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Search
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Title, request #, tenant, property..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-500"
              >
                <option value="">All Statuses</option>
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="ON_HOLD">On Hold</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-500"
              >
                <option value="">All Priorities</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-500"
              >
                <option value="">All Categories</option>
                <option value="PLUMBING">Plumbing</option>
                <option value="ELECTRICAL">Electrical</option>
                <option value="HVAC">HVAC</option>
                <option value="LOCKS">Locks</option>
                <option value="PAINTING">Painting</option>
                <option value="PEST_CONTROL">Pest Control</option>
                <option value="APPLIANCE">Appliance</option>
                <option value="GENERAL">General</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-sm font-semibold text-slate-800">
              Maintenance Requests
            </h2>
          </div>

          {loading ? (
            <div className="p-10 text-center text-sm text-slate-500">
              Loading maintenance requests...
            </div>
          ) : error ? (
            <div className="p-10 text-center text-sm text-red-600">{error}</div>
          ) : requests.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">
              No maintenance requests found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Request #</th>
                    <th className="px-5 py-3 font-semibold">Title</th>
                    <th className="px-5 py-3 font-semibold">Tenant</th>
                    <th className="px-5 py-3 font-semibold">Property</th>
                    <th className="px-5 py-3 font-semibold">Category</th>
                    <th className="px-5 py-3 font-semibold">Priority</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 font-semibold">Created</th>
                    <th className="px-5 py-3 font-semibold">Quick Action</th>
                    <th className="px-5 py-3 font-semibold text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {requests.map((request) => (
                    <tr key={request.id} className="hover:bg-slate-50/70">
                      <td className="px-5 py-4 font-medium text-slate-900">
                        {request.requestNumber}
                      </td>

                      <td className="px-5 py-4">
                        <div className="font-medium text-slate-900">
                          {request.title}
                        </div>
                        <div className="mt-1 max-w-xs truncate text-xs text-slate-500">
                          {request.description || "No description"}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        {request.tenant ? (
                          <div>
                            <div className="font-medium text-slate-900">
                              {request.tenant.firstName} {request.tenant.lastName}
                            </div>
                            <div className="text-xs text-slate-500">
                              {request.tenant.email ||
                                request.tenant.phone ||
                                "—"}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <div className="font-medium text-slate-900">
                          {request.property?.name || request.property?.code}
                        </div>
                        <div className="text-xs text-slate-500">
                          {request.property?.addressLine1 || "—"}
                          {request.property?.city
                            ? `, ${request.property.city}`
                            : ""}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-slate-700">
                        {request.category.replaceAll("_", " ")}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`px-2 py-1 text-xs rounded-full font-medium ${priorityColor(
                            request.priority
                          )}`}
                        >
                          {request.priority}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`px-2 py-1 text-xs rounded-full font-medium ${statusColor(
                            request.status
                          )}`}
                        >
                          {request.status}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        <div>{formatDate(request.createdAt)}</div>
                        <div className="text-xs text-slate-400">
                          {formatDateTime(request.createdAt)}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <select
                          value={request.status}
                          onChange={(e) =>
                            handleQuickStatusChange(request.id, e.target.value)
                          }
                          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:border-slate-500"
                        >
                          <option value="OPEN">Open</option>
                          <option value="IN_PROGRESS">In Progress</option>
                          <option value="ON_HOLD">On Hold</option>
                          <option value="RESOLVED">Resolved</option>
                          <option value="CLOSED">Closed</option>
                          <option value="CANCELLED">Cancelled</option>
                        </select>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <Link
                            href={`/maintenance/${request.id}`}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            View
                          </Link>

                          <Link
                            href={`/maintenance/edit/${request.id}`}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                          </Link>

                          <button
                            onClick={() => handleDeleteClick(request)}
                            className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-100"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </button>
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

      {deleteModalOpen && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-red-50 p-3 text-red-600">
                <Trash2 className="h-5 w-5" />
              </div>

              <div className="flex-1">
                <h3 className="text-lg font-semibold text-slate-900">
                  Delete Maintenance Request
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                  Are you sure you want to delete{" "}
                  <span className="font-semibold text-slate-700">
                    {selectedRequest.requestNumber}
                  </span>
                  ? This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setDeleteModalOpen(false);
                  setSelectedRequest(null);
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
                {deleting ? "Deleting..." : "Delete Request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}