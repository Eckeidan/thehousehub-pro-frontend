"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Home,
  CreditCard,
  Wrench,
  FileText,
  Bell,
  LogOut,
  Loader2,
  Sparkles,
  ArrowLeft,
  ArrowRight,
  UserCircle2,
  Clock3,
  AlertTriangle,
  CheckCircle2,
  PauseCircle,
  XCircle,
  CalendarDays,
  MapPin,
  ShieldCheck,
  Plus,
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
};

function formatDate(value?: string | null) {
  if (!value) return "Not set";
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getInitials(name?: string | null) {
  if (!name) return "TN";
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
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

export default function TenantMaintenancePage() {
  const router = useRouter();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [user, setUser] = useState<AuthUser | null>(null);
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [error, setError] = useState("");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formError, setFormError] = useState("");

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "GENERAL",
    priority: "MEDIUM",
    preferredDate: "",
    entryPermission: false,
    locationNote: "",
  });

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
      }

      setCheckingAuth(false);
    } catch (err) {
      console.error("Tenant auth parse error:", err);
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      router.replace("/");
    }
  }, [router]);

  useEffect(() => {
    if (!checkingAuth) {
      loadMaintenanceData();
    }
  }, [checkingAuth]);

  async function loadMaintenanceData() {
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

      const maintenanceRes = await fetch(`${API_URL}/api/maintenance`, {
        cache: "no-store",
      });

      const maintenanceData = await maintenanceRes.json().catch(() => []);

      const tenantId = currentUser?.tenant?.id || currentUser?.tenantId;

      const tenantRequests = Array.isArray(maintenanceData)
        ? maintenanceData.filter((item: MaintenanceRequest) => item?.tenant?.id === tenantId)
        : [];

      setRequests(tenantRequests);
    } catch (err: any) {
      console.error("Tenant maintenance load error:", err);
      setError(err?.message || "Failed to load maintenance requests.");
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.replace("/");
  }

  async function handleCreateRequest(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!user?.tenant?.id) {
      setFormError("Tenant account is not linked correctly.");
      return;
    }

    if (!user?.tenant?.property?.id) {
      setFormError("No property is linked to this tenant.");
      return;
    }

    if (!form.title.trim()) {
      setFormError("Title is required.");
      return;
    }

    try {
      setSubmitting(true);
      setFormError("");

      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        category: form.category,
        priority: form.priority,
        propertyId: user.tenant.property.id,
        unitId: user?.tenant?.unit?.id || null,
        tenantId: user.tenant.id,
        preferredDate: form.preferredDate || null,
        entryPermission: form.entryPermission,
        locationNote: form.locationNote.trim() || null,
      };

      const res = await fetch(`${API_URL}/api/maintenance`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "Failed to create maintenance request.");
      }

      setShowCreateModal(false);
      setForm({
        title: "",
        description: "",
        category: "GENERAL",
        priority: "MEDIUM",
        preferredDate: "",
        entryPermission: false,
        locationNote: "",
      });

      await loadMaintenanceData();
    } catch (err: any) {
      console.error("Create maintenance request error:", err);
      setFormError(err?.message || "Failed to create request.");
    } finally {
      setSubmitting(false);
    }
  }

  const fullName =
    user?.fullName ||
    user?.name ||
    `${user?.tenant?.firstName || ""} ${user?.tenant?.lastName || ""}`.trim() ||
    "Tenant";

  const initials = getInitials(fullName);

  const openCount = useMemo(() => {
    return requests.filter((r) => r.status === "OPEN").length;
  }, [requests]);

  const inProgressCount = useMemo(() => {
    return requests.filter((r) => r.status === "IN_PROGRESS").length;
  }, [requests]);

  const resolvedCount = useMemo(() => {
    return requests.filter((r) => r.status === "RESOLVED" || r.status === "CLOSED").length;
  }, [requests]);

  const urgentCount = useMemo(() => {
    return requests.filter((r) => r.priority === "URGENT" || r.priority === "HIGH").length;
  }, [requests]);

  const latestRequest = requests.length > 0 ? requests[0] : null;

  if (checkingAuth || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4f7fb]">
        <div className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-white px-8 py-6 shadow-xl text-slate-700">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading maintenance...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4f7fb] p-6">
        <div className="w-full max-w-xl rounded-3xl border border-rose-200 bg-white p-8 shadow-xl">
          <h2 className="text-2xl font-bold text-rose-600">Unable to load maintenance</h2>
          <p className="mt-3 text-slate-600">{error}</p>
          <button
            onClick={loadMaintenanceData}
            className="mt-6 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f7fb] text-slate-900">
      <div className="flex min-h-screen">
        <aside className="hidden w-80 shrink-0 flex-col justify-between bg-gradient-to-b from-[#102a67] via-[#173d8e] to-[#0f1f45] text-white shadow-2xl lg:flex">
          <div>
            <div className="border-b border-white/10 px-8 py-8">
              <h1 className="text-3xl font-bold tracking-tight">The House Hub</h1>
              <p className="mt-2 text-sm text-blue-100/70">
                Premium Tenant Workspace
              </p>
            </div>

            <div className="px-6 py-6">
              <div className="rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/15 text-lg font-bold text-white">
                    {initials}
                  </div>
                  <div>
                    <p className="text-base font-semibold">{fullName}</p>
                    <p className="text-sm text-blue-100/70">
                      {user?.email || user?.tenant?.email || "Tenant"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <nav className="px-4 pb-6">
              <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-widest text-blue-200/50">
                Tenant Menu
              </p>

              <div className="space-y-2">
                <SidebarItem label="Overview" icon={<Home size={18} />} href="/tenant" />
                <SidebarItem label="Payments" icon={<CreditCard size={18} />} href="/tenant/payments" />
                <SidebarItem label="Maintenance" icon={<Wrench size={18} />} active href="/tenant/maintenance" />
                <SidebarItem label="Documents" icon={<FileText size={18} />} href="/tenant/documents" />
                <SidebarItem label="Notifications" icon={<Bell size={18} />} href="/tenant/notifications" />
              </div>
            </nav>
          </div>

          <div className="border-t border-white/10 px-6 py-6">
            <button
              onClick={handleLogout}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200/20 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-100 transition hover:bg-red-500/20"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </aside>

        <main className="flex-1">
          <div className="border-b border-slate-200 bg-white/80 px-6 py-6 backdrop-blur md:px-8">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <Link
                  href="/tenant"
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Overview
                </Link>

                <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700">
                  <Sparkles className="h-4 w-4" />
                  Maintenance Center
                </div>

                <h2 className="mt-4 text-4xl font-bold tracking-tight text-slate-900">
                  Maintenance Requests
                </h2>
                <p className="mt-3 max-w-3xl text-base leading-7 text-slate-500">
                  Follow your maintenance requests, check their progress, and submit
                  new issues directly from your tenant workspace.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={loadMaintenanceData}
                  className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  Refresh
                </button>

                <button
                  onClick={() => {
                    setFormError("");
                    setShowCreateModal(true);
                  }}
                  className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4" />
                  New Request
                </button>
              </div>
            </div>
          </div>

          <div className="p-6 md:p-8">
            <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
              <KpiCard
                title="Open Requests"
                value={String(openCount)}
                subtitle="Waiting for action"
                icon={<Clock3 className="h-5 w-5" />}
                accent="amber"
              />
              <KpiCard
                title="In Progress"
                value={String(inProgressCount)}
                subtitle="Currently being handled"
                icon={<Wrench className="h-5 w-5" />}
                accent="blue"
              />
              <KpiCard
                title="Resolved / Closed"
                value={String(resolvedCount)}
                subtitle="Completed issues"
                icon={<CheckCircle2 className="h-5 w-5" />}
                accent="emerald"
              />
              <KpiCard
                title="High Priority"
                value={String(urgentCount)}
                subtitle="Urgent or important issues"
                icon={<AlertTriangle className="h-5 w-5" />}
                accent="rose"
              />
            </section>

            <section className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-3">
              <div className="xl:col-span-2 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-semibold text-slate-900">
                      Request History
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      View all maintenance requests linked to your tenant account.
                    </p>
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  {requests.length === 0 ? (
                    <EmptyState text="No maintenance request has been submitted yet." />
                  ) : (
                    requests.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-3xl border border-slate-200 bg-slate-50 p-5 transition hover:border-slate-300 hover:bg-white"
                      >
                        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                          <div className="flex gap-4">
                            <div className="rounded-2xl bg-white p-3 text-slate-500 shadow-sm">
                              {getStatusIcon(item.status)}
                            </div>

                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className="text-lg font-semibold text-slate-900">
                                  {item.title}
                                </h4>

                                <span
                                  className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadge(
                                    item.status
                                  )}`}
                                >
                                  {item.status?.replaceAll("_", " ")}
                                </span>

                                <span
                                  className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getPriorityBadge(
                                    item.priority
                                  )}`}
                                >
                                  {item.priority}
                                </span>
                              </div>

                              <p className="mt-2 text-sm text-slate-500">
                                Request #: {item.requestNumber}
                              </p>

                              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
                                {item.description || "No description provided."}
                              </p>

                              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                                <InfoPill
                                  icon={<CalendarDays className="h-4 w-4" />}
                                  text={`Created: ${formatDate(item.createdAt)}`}
                                />
                                <InfoPill
                                  icon={<Wrench className="h-4 w-4" />}
                                  text={`Category: ${item.category?.replaceAll("_", " ")}`}
                                />
                                <InfoPill
                                  icon={<MapPin className="h-4 w-4" />}
                                  text={`Unit: ${item.unit?.unitCode || "N/A"}`}
                                />
                                <InfoPill
                                  icon={<ShieldCheck className="h-4 w-4" />}
                                  text={
                                    item.entryPermission
                                      ? "Entry allowed"
                                      : "Entry not allowed"
                                  }
                                />
                              </div>
                            </div>
                          </div>

                          <div className="flex shrink-0 items-center">
                            <Link
                              href={`/tenant/maintenance/${item.id}`}
                              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                            >
                              View
                              <ArrowRight className="h-4 w-4" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-2xl font-semibold text-slate-900">
                    Tenant Summary
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Your current maintenance profile.
                  </p>

                  <div className="mt-6 space-y-4">
                    <SummaryRow label="Tenant" value={fullName} />
                    <SummaryRow
                      label="Property"
                      value={
                        user?.tenant?.property?.name ||
                        user?.tenant?.property?.code ||
                        "N/A"
                      }
                    />
                    <SummaryRow
                      label="Unit"
                      value={
                        user?.tenant?.unit?.unitCode ||
                        user?.tenant?.unit?.unitName ||
                        "N/A"
                      }
                    />
                    <SummaryRow label="Total Requests" value={String(requests.length)} />
                    <SummaryRow label="Open" value={String(openCount)} />
                    <SummaryRow label="Resolved" value={String(resolvedCount)} />
                  </div>
                </div>

                <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-2xl font-semibold text-slate-900">
                    Latest Request
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Most recent maintenance activity.
                  </p>

                  {latestRequest ? (
                    <div className="mt-6 rounded-3xl bg-gradient-to-r from-blue-600 to-indigo-600 p-5 text-white">
                      <p className="text-sm text-blue-100">Title</p>
                      <p className="mt-1 text-2xl font-bold">{latestRequest.title}</p>

                      <div className="mt-5 space-y-2 text-sm text-blue-100">
                        <p>Status: {latestRequest.status?.replaceAll("_", " ")}</p>
                        <p>Priority: {latestRequest.priority}</p>
                        <p>Date: {formatDate(latestRequest.createdAt)}</p>
                        <p>Request #: {latestRequest.requestNumber}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-6">
                      <EmptyState text="No request available yet." />
                    </div>
                  )}
                </div>

                <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-2xl font-semibold text-slate-900">
                        Continue
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        Navigate to another section.
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 space-y-3">
                    <QuickLink href="/tenant" label="Back to Overview" />
                    <QuickLink href="/tenant/payments" label="Open Payments" />
                    <QuickLink href="/tenant/documents" label="Open Documents" />
                  </div>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-[28px] bg-white p-6 shadow-2xl md:p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-900">
                Create Maintenance Request
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Submit a new issue for your property or unit.
              </p>
            </div>

            <form onSubmit={handleCreateRequest} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Title
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, title: e.target.value }))
                  }
                  placeholder="Example: Water leaking in bathroom"
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Description
                </label>
                <textarea
                  rows={4}
                  value={form.description}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="Describe the issue..."
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Category
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, category: e.target.value }))
                    }
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="GENERAL">General</option>
                    <option value="PLUMBING">Plumbing</option>
                    <option value="ELECTRICAL">Electrical</option>
                    <option value="HVAC">HVAC</option>
                    <option value="LOCKS">Locks</option>
                    <option value="PAINTING">Painting</option>
                    <option value="PEST_CONTROL">Pest Control</option>
                    <option value="APPLIANCE">Appliance</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Priority
                  </label>
                  <select
                    value={form.priority}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, priority: e.target.value }))
                    }
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Preferred Date
                  </label>
                  <input
                    type="date"
                    value={form.preferredDate}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, preferredDate: e.target.value }))
                    }
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Location Note
                  </label>
                  <input
                    type="text"
                    value={form.locationNote}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, locationNote: e.target.value }))
                    }
                    placeholder="Example: Master bathroom"
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <input
                  type="checkbox"
                  checked={form.entryPermission}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      entryPermission: e.target.checked,
                    }))
                  }
                  className="h-4 w-4"
                />
                <span className="text-sm font-medium text-slate-700">
                  Allow maintenance team to enter if needed
                </span>
              </label>

              {formError && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {formError}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setFormError("");
                  }}
                  disabled={submitting}
                  className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Create Request
                    </>
                  )}
                </button>
              </div>
            </form>
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
        className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${
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

function KpiCard({
  title,
  value,
  subtitle,
  icon,
  accent,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  accent: "blue" | "emerald" | "amber" | "rose";
}) {
  const accentMap = {
    blue: "from-blue-500 to-blue-600",
    emerald: "from-emerald-500 to-emerald-600",
    amber: "from-amber-500 to-orange-500",
    rose: "from-rose-500 to-rose-600",
  };

  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className={`h-2 w-16 rounded-full bg-gradient-to-r ${accentMap[accent]}`} />
        <div className="rounded-2xl bg-slate-50 p-3 text-slate-500">{icon}</div>
      </div>

      <p className="mt-5 text-sm font-medium text-slate-500">{title}</p>
      <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">{value}</p>
      <p className="mt-3 text-sm text-slate-500">{subtitle}</p>
    </div>
  );
}

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
      <span className="text-sm text-slate-600">{label}</span>
      <span className="text-sm font-semibold text-slate-900">{value}</span>
    </div>
  );
}

function QuickLink({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <Link href={href}>
      <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-700 transition hover:bg-slate-100">
        <span>{label}</span>
        <ArrowRight className="h-4 w-4" />
      </div>
    </Link>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-center text-sm text-slate-500">
      {text}
    </div>
  );
}

function InfoPill({
  icon,
  text,
}: {
  icon: React.ReactNode;
  text: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-xs font-medium text-slate-600">
      <span className="text-slate-400">{icon}</span>
      <span>{text}</span>
    </div>
  );
}