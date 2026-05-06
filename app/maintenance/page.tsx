"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Users,
  Wallet,
  FileText,
  Brain,
  Settings,
  Wrench,
  Home,
  LogOut,
  Loader2,
  Search,
  RefreshCw,
  Eye,
  Clock3,
  CheckCircle2,
  AlertTriangle,
  PauseCircle,
  XCircle,
  Sparkles,
  UserCircle2,
  ShieldCheck,
  BadgeDollarSign,
  MessageCircle,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type StoredUser = {
  id?: string;
  fullName?: string;
  name?: string;
  email?: string;
  role?: string;
  organizationId?: string;
};

type AIRecommendation = {
  id: string;
  type?: string;
  ownerDecision?: string | null;
  confidenceScore?: string | number | null;
  reasoning?: string | null;
  aiSuggestion?: {
    contractorId?: string | null;
    contractorName?: string | null;
    estimatedCost?: string | number | null;
    estimatedLaborCost?: string | number | null;
    estimatedMaterialsCost?: string | number | null;
    estimatedTotalCost?: string | number | null;
    estimatedHours?: string | number | null;
    serviceCategory?: string | null;
    city?: string | null;
    manualOverride?: boolean;
  } | null;
};

type MaintenanceRequest = {
  id: string;
  requestNumber: string;
  title: string;
  description?: string | null;
  category?: string | null;
  priority?: string | null;
  status?: string | null;
  locationNote?: string | null;
  preferredDate?: string | null;
  entryPermission?: boolean;

  estimatedCost?: string | number | null;
  estimatedLaborCost?: string | number | null;
  estimatedMaterialsCost?: string | number | null;
  estimatedTotalCost?: string | number | null;
  actualCost?: string | number | null;

  createdAt?: string;
  updatedAt?: string;
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
    email?: string | null;
    phone?: string | null;
  } | null;
  contractor?: {
    id: string;
    companyName?: string | null;
    phone?: string | null;
    city?: string | null;
    serviceCategory?: string | null;
  } | null;
  aiRecommendations?: AIRecommendation[];
};

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatMoney(value?: string | number | null) {
  if (value === null || value === undefined || value === "") return "Pending";
  const amount = Number(value);
  if (Number.isNaN(amount)) return String(value);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function statusBadge(status?: string | null) {
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

function priorityBadge(priority?: string | null) {
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

function aiDecisionBadge(decision?: string | null) {
  switch (decision) {
    case "APPROVED":
      return "bg-emerald-100 text-emerald-700 border border-emerald-200";
    case "REJECTED":
      return "bg-rose-100 text-rose-700 border border-rose-200";
    case "MODIFIED":
      return "bg-blue-100 text-blue-700 border border-blue-200";
    case "PENDING":
      return "bg-amber-100 text-amber-700 border border-amber-200";
    default:
      return "bg-slate-100 text-slate-700 border border-slate-200";
  }
}

function statusIcon(status?: string | null) {
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

export default function MaintenancePage() {
  const router = useRouter();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [user, setUser] = useState<StoredUser | null>(null);

  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [aiFilter, setAiFilter] = useState("ALL");

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

  useEffect(() => {
    if (!checkingAuth) {
      fetchRequests();
    }
  }, [checkingAuth]);

  async function fetchRequests() {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("token");

      const res = await fetch(`${API_BASE}/api/maintenance`, {
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

      const data = await res.json().catch(() => []);

      if (!res.ok) {
        throw new Error(data?.error || "Failed to load maintenance requests");
      }

      setRequests(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error("Maintenance page load error:", err);
      setError(err?.message || "Failed to load maintenance requests.");
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }

  const filteredRequests = useMemo(() => {
    const q = search.trim().toLowerCase();

    return requests.filter((item) => {
      const aiRecommendation = item.aiRecommendations?.[0];
      const aiDecision = aiRecommendation?.ownerDecision || "";
      const aiContractor =
        aiRecommendation?.aiSuggestion?.contractorName?.toLowerCase() || "";

      const matchesSearch =
        !q ||
        item.requestNumber?.toLowerCase().includes(q) ||
        item.title?.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q) ||
        item.category?.toLowerCase().includes(q) ||
        item.priority?.toLowerCase().includes(q) ||
        item.status?.toLowerCase().includes(q) ||
        item.property?.name?.toLowerCase().includes(q) ||
        item.property?.code?.toLowerCase().includes(q) ||
        item.property?.city?.toLowerCase().includes(q) ||
        item.unit?.unitCode?.toLowerCase().includes(q) ||
        `${item.tenant?.firstName || ""} ${item.tenant?.lastName || ""}`
          .toLowerCase()
          .includes(q) ||
        item.contractor?.companyName?.toLowerCase().includes(q) ||
        aiContractor.includes(q);

      const matchesStatus =
        statusFilter === "ALL" ? true : item.status === statusFilter;

      const matchesAi =
        aiFilter === "ALL"
          ? true
          : aiFilter === "NONE"
          ? !aiRecommendation
          : aiDecision === aiFilter;

      return matchesSearch && matchesStatus && matchesAi;
    });
  }, [requests, search, statusFilter, aiFilter]);

  const totalRequests = requests.length;
  const openCount = requests.filter((r) => r.status === "OPEN").length;
  const inProgressCount = requests.filter(
    (r) => r.status === "IN_PROGRESS"
  ).length;
  const resolvedCount = requests.filter(
    (r) => r.status === "RESOLVED" || r.status === "CLOSED"
  ).length;
  const aiPendingCount = requests.filter(
    (r) => r.aiRecommendations?.[0]?.ownerDecision === "PENDING"
  ).length;

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

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.replace("/");
  };

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-8">
        <div className="rounded-3xl border border-slate-200 bg-white px-8 py-6 shadow-xl text-slate-700">
          <div className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Checking session...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
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
                label="Units"
                icon={<Home size={18} />}
                href="/units"
              />
              <SidebarItem
                label="Tenants"
                icon={<Users size={18} />}
                href="/tenants"
              />
              
              <SidebarItem
                label="Vendors"
                icon={<Wrench size={18} />}
                href="/vendors"
              />
              <SidebarItem
                label="Maintenance"
                icon={<Wrench size={18} />}
                active
                href="/maintenance"
              />
              <SidebarItem
                label="Financials"
                icon={<Wallet size={18} />}
                href="/payments"
              />

              <SidebarItem label="Messages" icon={<MessageCircle size={18} />} href="/communications"  />
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
            <p className="text-xs text-slate-500">{displayRole}</p>
            

            <div className="mt-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 px-3 py-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-500 text-sm font-bold text-white">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">
                  {user?.fullName || user?.name || "User"}
                </p>

                <p className="text-xs text-blue-100/80">{displayRole}</p>

                <p className="mt-1 truncate rounded-lg bg-black/20 px-2 py-1 text-[10px] font-mono text-emerald-200">
                  Org: {user?.organizationId || "No organizationId"}
                </p>
              </div>
            </div>

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
                <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700">
                  <Sparkles className="h-4 w-4" />
                  AI Maintenance Center
                </div>

                <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900">
                  Maintenance Requests
                </h2>
                <p className="mt-1 text-slate-500">
                  Review issues, monitor progress, and approve AI contractor
                  assignments.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={fetchRequests}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <span className="inline-flex items-center gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Refresh
                  </span>
                </button>

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
            {error && (
              <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700">
                {error}
              </div>
            )}

            <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
              <StatCard
                title="Total Requests"
                value={String(totalRequests)}
                subtitle="All maintenance tickets"
                accent="blue"
                icon={<Wrench className="h-5 w-5" />}
              />
              <StatCard
                title="Open"
                value={String(openCount)}
                subtitle="Waiting for action"
                accent="amber"
                icon={<Clock3 className="h-5 w-5" />}
              />
              <StatCard
                title="In Progress"
                value={String(inProgressCount)}
                subtitle="Currently handled"
                accent="indigo"
                icon={<Wrench className="h-5 w-5" />}
              />
              <StatCard
                title="AI Pending"
                value={String(aiPendingCount)}
                subtitle="Awaiting admin approval"
                accent="emerald"
                icon={<Sparkles className="h-5 w-5" />}
              />
            </section>

            <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                <div className="relative xl:col-span-1">
                  <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search request, tenant, property, contractor..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-4 pl-12 pr-4 text-[15px] text-slate-700 outline-none transition focus:border-blue-600 focus:bg-white"
                  />
                </div>

                <div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-[15px] text-slate-700 outline-none transition focus:border-blue-600 focus:bg-white"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="OPEN">OPEN</option>
                    <option value="IN_PROGRESS">IN_PROGRESS</option>
                    <option value="ON_HOLD">ON_HOLD</option>
                    <option value="RESOLVED">RESOLVED</option>
                    <option value="CLOSED">CLOSED</option>
                    <option value="CANCELLED">CANCELLED</option>
                  </select>
                </div>

                <div>
                  <select
                    value={aiFilter}
                    onChange={(e) => setAiFilter(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-[15px] text-slate-700 outline-none transition focus:border-blue-600 focus:bg-white"
                  >
                    <option value="ALL">All AI States</option>
                    <option value="PENDING">AI Pending Approval</option>
                    <option value="APPROVED">AI Approved</option>
                    <option value="REJECTED">AI Rejected</option>
                    <option value="MODIFIED">AI Modified</option>
                    <option value="NONE">No AI Suggestion</option>
                  </select>
                </div>
              </div>
            </section>

            <section className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              {loading ? (
                <div className="flex items-center justify-center px-6 py-16 text-slate-500">
                  <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                  Loading maintenance requests...
                </div>
              ) : filteredRequests.length === 0 ? (
                <div className="px-6 py-16 text-center text-slate-500">
                  <Wrench className="mx-auto mb-4 h-10 w-10 opacity-40" />
                  No maintenance requests found.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Request
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Property / Tenant
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Status
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Contractor
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          AI Suggestion
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Cost Breakdown
                        </th>
                        <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Action
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredRequests.map((item) => {
                        const aiRecommendation = item.aiRecommendations?.[0];
                        const aiSuggestion = aiRecommendation?.aiSuggestion;
                        const tenantName =
                          `${item.tenant?.firstName || ""} ${
                            item.tenant?.lastName || ""
                          }`.trim() || "N/A";

                        return (
                          <tr
                            key={item.id}
                            className="border-t border-slate-100 hover:bg-slate-50/70"
                          >
                            <td className="px-6 py-5 align-top">
                              <div className="flex gap-3">
                                <div className="rounded-2xl bg-slate-100 p-3 text-slate-600">
                                  {statusIcon(item.status)}
                                </div>
                                <div>
                                  <div className="text-sm font-semibold text-slate-900">
                                    {item.title}
                                  </div>
                                  <div className="mt-1 text-xs text-slate-500">
                                    {item.requestNumber}
                                  </div>
                                  <div className="mt-2 text-xs text-slate-500">
                                    {item.category?.replaceAll("_", " ") ||
                                      "GENERAL"}
                                  </div>
                                  <div className="mt-2 inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                                    {item.priority || "MEDIUM"}
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td className="px-6 py-5 align-top">
                              <div className="space-y-2">
                                <div className="text-sm font-semibold text-slate-900">
                                  {item.property?.name ||
                                    item.property?.code ||
                                    "N/A"}
                                </div>
                                <div className="text-xs text-slate-500">
                                  {item.unit?.unitCode ||
                                    item.unit?.unitName ||
                                    "No unit"}
                                </div>
                                <div className="inline-flex items-center gap-2 text-sm text-slate-700">
                                  <UserCircle2 className="h-4 w-4 text-slate-400" />
                                  {tenantName}
                                </div>
                                <div className="text-xs text-slate-500">
                                  {item.property?.city || "-"}
                                </div>
                                <div className="text-xs text-slate-500">
                                  Created: {formatDate(item.createdAt)}
                                </div>
                              </div>
                            </td>

                            <td className="px-6 py-5 align-top">
                              <div className="space-y-2">
                                <span
                                  className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusBadge(
                                    item.status
                                  )}`}
                                >
                                  {item.status?.replaceAll("_", " ")}
                                </span>
                                <div>
                                  <span
                                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${priorityBadge(
                                      item.priority
                                    )}`}
                                  >
                                    {item.priority || "MEDIUM"}
                                  </span>
                                </div>
                              </div>
                            </td>

                            <td className="px-6 py-5 align-top">
                              {item.contractor ? (
                                <div className="space-y-1">
                                  <div className="text-sm font-semibold text-slate-900">
                                    {item.contractor.companyName || "N/A"}
                                  </div>
                                  <div className="text-xs text-slate-500">
                                    {item.contractor.serviceCategory ||
                                      "No category"}
                                  </div>
                                  <div className="text-xs text-slate-500">
                                    {item.contractor.city || "-"}
                                  </div>
                                </div>
                              ) : (
                                <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-500">
                                  Not assigned
                                </div>
                              )}
                            </td>

                            <td className="px-6 py-5 align-top">
                              {aiRecommendation ? (
                                <div className="space-y-2">
                                  <span
                                    className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${aiDecisionBadge(
                                      aiRecommendation.ownerDecision
                                    )}`}
                                  >
                                    <Sparkles className="h-3.5 w-3.5" />
                                    {aiRecommendation.ownerDecision || "PENDING"}
                                  </span>

                                  <div className="text-sm font-semibold text-slate-900">
                                    {aiSuggestion?.contractorName ||
                                      "AI contractor"}
                                  </div>

                                  <div className="text-xs text-slate-500">
                                    {aiSuggestion?.serviceCategory ||
                                      "No category"}
                                  </div>

                                  <div className="text-xs text-slate-500">
                                    Confidence:{" "}
                                    {aiRecommendation.confidenceScore || 0}%
                                  </div>

                                  {aiSuggestion?.estimatedHours !==
                                    undefined && (
                                    <div className="text-xs text-slate-500">
                                      Hours:{" "}
                                      {String(
                                        aiSuggestion.estimatedHours || "-"
                                      )}
                                    </div>
                                  )}

                                  {aiSuggestion?.manualOverride && (
                                    <div className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                                      Manually Modified
                                    </div>
                                  )}

                                  {aiRecommendation.ownerDecision ===
                                    "PENDING" && (
                                    <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                                      <ShieldCheck className="h-3.5 w-3.5" />
                                      Needs Approval
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-500">
                                  No AI suggestion
                                </div>
                              )}
                            </td>

                            <td className="px-6 py-5 align-top">
                              <div className="space-y-1">
                                <div className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                                  <BadgeDollarSign className="h-4 w-4 text-slate-400" />
                                  Total:{" "}
                                  {formatMoney(
                                    item.estimatedTotalCost ?? item.estimatedCost
                                  )}
                                </div>

                                <div className="text-xs text-slate-500">
                                  Labor:{" "}
                                  {formatMoney(item.estimatedLaborCost)}
                                </div>

                                <div className="text-xs text-slate-500">
                                  Materials:{" "}
                                  {formatMoney(item.estimatedMaterialsCost)}
                                </div>

                                <div className="text-xs text-slate-500">
                                  Actual: {formatMoney(item.actualCost)}
                                </div>

                                {aiSuggestion && (
                                  <div className="mt-2 rounded-xl bg-indigo-50 px-3 py-2 text-xs text-indigo-700">
                                    AI Total:{" "}
                                    {formatMoney(
                                      aiSuggestion.estimatedTotalCost ??
                                        aiSuggestion.estimatedCost
                                    )}
                                  </div>
                                )}
                              </div>
                            </td>

                            <td className="px-6 py-5 text-right align-top">
                              <Link
                                href={`/maintenance/${item.id}`}
                                className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                              >
                                <Eye className="h-4 w-4" />
                                View Details
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
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

function StatCard({
  title,
  value,
  subtitle,
  accent,
  icon,
}: {
  title: string;
  value: string;
  subtitle: string;
  accent: "blue" | "indigo" | "amber" | "emerald";
  icon: ReactNode;
}) {
  const accentMap = {
    blue: "from-blue-500 to-blue-600",
    indigo: "from-indigo-500 to-indigo-600",
    amber: "from-amber-500 to-orange-500",
    emerald: "from-emerald-500 to-emerald-600",
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div
          className={`h-2 w-16 rounded-full bg-gradient-to-r ${accentMap[accent]}`}
        />
        <div className="rounded-2xl bg-slate-50 p-3 text-slate-500">{icon}</div>
      </div>

      <p className="mt-5 text-sm font-medium text-slate-500">{title}</p>
      <p className="mt-3 text-4xl font-bold tracking-tight text-slate-900">
        {value}
      </p>
      <p className="mt-3 text-sm text-slate-500">{subtitle}</p>
    </div>
  );
}