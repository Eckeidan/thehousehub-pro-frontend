"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
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
  Sparkles,
  TriangleAlert,
  BadgeCheck,
  CircleAlert,
  TrendingUp,
  FileWarning,
  Hammer,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  X,
  LogOut,
  Loader2,
} from "lucide-react";
import { useRouter } from "next/navigation";

const API_BASE = "http://localhost:4000/api";

type StoredUser = {
  id?: string;
  fullName?: string;
  name?: string;
  email?: string;
  role?: string;
};

type Insight = {
  id: number;
  title: string;
  message: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  category:
    | "FINANCIAL"
    | "MAINTENANCE"
    | "DOCUMENTS"
    | "OCCUPANCY"
    | "COMPLIANCE";
};

type InsightsResponse = {
  stats: {
    occupancyRate: number;
    openMaintenance: number;
    missingDocuments: number;
    paymentRisk: number;
    healthySignals: number;
    highPriority: number;
    mediumPriority: number;
    lowPriority: number;
  };
  insights: Insight[];
  recommendations: string[];
};

type NotificationState = {
  open: boolean;
  type: "success" | "error";
  title: string;
  message: string;
};

export default function InsightsPage() {
  const router = useRouter();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [user, setUser] = useState<StoredUser | null>(null);

  const [data, setData] = useState<InsightsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const [notification, setNotification] = useState<NotificationState>({
    open: false,
    type: "error",
    title: "",
    message: "",
  });

  function showNotification(
    type: "success" | "error",
    title: string,
    message: string
  ) {
    setNotification({ open: true, type, title, message });
  }

  const handleUnauthorized = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.replace("/");
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/";
  };

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
      console.error("Insights auth error:", error);
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      router.replace("/");
    }
  }, [router]);

  useEffect(() => {
    if (!notification.open) return;
    const timer = setTimeout(() => {
      setNotification((prev) => ({ ...prev, open: false }));
    }, 4000);
    return () => clearTimeout(timer);
  }, [notification.open]);

  async function fetchInsights() {
    try {
      setLoading(true);

      const token = localStorage.getItem("token");

      const res = await fetch(`${API_BASE}/insights`, {
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${token || ""}`,
        },
      });

      if (res.status === 401) {
        handleUnauthorized();
        return;
      }

      const result = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(result?.error || "Failed to load insights");
      }

      setData(result);
    } catch (error: any) {
      showNotification(
        "error",
        "Unable to load insights",
        error?.message || "Failed to load insights"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (checkingAuth) return;
    fetchInsights();
  }, [checkingAuth]);

  const stats = data?.stats;
  const insights = data?.insights || [];
  const recommendations = data?.recommendations || [];
  const isError = notification.type === "error";

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
          <div className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Checking session...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-300">
      {notification.open && (
        <div className="fixed right-6 top-6 z-[110] w-full max-w-md">
          <div
            className={`rounded-3xl border bg-white shadow-2xl ${
              isError ? "border-red-200" : "border-emerald-200"
            }`}
          >
            <div className="flex items-start gap-3 p-5">
              <div
                className={`mt-0.5 rounded-full p-2 ${
                  isError
                    ? "bg-red-100 text-red-600"
                    : "bg-emerald-100 text-emerald-600"
                }`}
              >
                {isError ? (
                  <AlertCircle className="h-5 w-5" />
                ) : (
                  <CheckCircle2 className="h-5 w-5" />
                )}
              </div>
              <div className="flex-1">
                <p
                  className={`text-sm font-semibold ${
                    isError ? "text-red-700" : "text-emerald-700"
                  }`}
                >
                  {notification.title}
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  {notification.message}
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setNotification((prev) => ({ ...prev, open: false }))
                }
                className="rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 lg:flex lg:flex-col bg-gradient-to-b from-blue-950 via-blue-900 to-slate-900 text-white shadow-2xl">
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
              active
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
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-500 text-sm font-bold text-white">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">
                {user?.fullName || user?.name || "User"}
              </p>
              <p className="text-xs text-blue-100/80">{displayRole}</p>
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

      <main className="min-h-screen px-4 py-6 lg:pl-[352px] lg:pr-7">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <h2 className="text-4xl font-bold tracking-tight text-slate-900">
                AI Insights
              </h2>
              <p className="mt-3 text-xl text-slate-500">
                Smart recommendations and portfolio observations generated from
                your current data.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={fetchInsights}
                className="inline-flex items-center gap-2 rounded-2xl bg-[#1f3270] px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-[#19295d]"
              >
                <Sparkles className="h-4 w-4" />
                Refresh Analysis
              </button>

              <div className="hidden sm:flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                  {initials}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {user?.fullName || user?.name || "User"}
                  </p>
                  <p className="text-xs text-slate-500">{displayRole}</p>
                </div>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="rounded-[28px] border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">
              Loading AI insights...
            </div>
          ) : (
            <>
              <div className="mb-8 grid gap-6 md:grid-cols-2 xl:grid-cols-5">
                <StatCard
                  color="blue"
                  title="High Priority"
                  value={stats?.highPriority ?? 0}
                  subtitle="Immediate attention"
                  icon={<TriangleAlert className="h-5 w-5" />}
                />
                <StatCard
                  color="amber"
                  title="Medium Priority"
                  value={stats?.mediumPriority ?? 0}
                  subtitle="Should be reviewed"
                  icon={<CircleAlert className="h-5 w-5" />}
                />
                <StatCard
                  color="emerald"
                  title="Healthy Signals"
                  value={stats?.healthySignals ?? 0}
                  subtitle="Positive portfolio indicators"
                  icon={<BadgeCheck className="h-5 w-5" />}
                />
                <StatCard
                  color="purple"
                  title="Missing Docs"
                  value={stats?.missingDocuments ?? 0}
                  subtitle="Records needing attention"
                  icon={<FileWarning className="h-5 w-5" />}
                />
                <StatCard
                  color="rose"
                  title="Open Maintenance"
                  value={stats?.openMaintenance ?? 0}
                  subtitle="Pending operational items"
                  icon={<Hammer className="h-5 w-5" />}
                />
              </div>

              <div className="grid gap-6 xl:grid-cols-3">
                <div className="space-y-6 xl:col-span-2">
                  <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="mb-6">
                      <h3 className="text-2xl font-semibold text-slate-900">
                        Portfolio Insights
                      </h3>
                    </div>

                    <div className="space-y-4">
                      {insights.map((insight) => (
                        <div
                          key={insight.id}
                          className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                        >
                          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                            <div className="flex gap-4">
                              <div
                                className={`mt-1 rounded-2xl p-3 ${getPriorityIconBox(
                                  insight.priority
                                )}`}
                              >
                                {getInsightIcon(insight.category)}
                              </div>

                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <h4 className="text-lg font-semibold text-slate-900">
                                    {insight.title}
                                  </h4>
                                  <span
                                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getPriorityBadge(
                                      insight.priority
                                    )}`}
                                  >
                                    {insight.priority}
                                  </span>
                                  <span className="inline-flex rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">
                                    {insight.category}
                                  </span>
                                </div>

                                <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
                                  {insight.message}
                                </p>
                              </div>
                            </div>

                            <button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100">
                              Review
                              <ArrowRight className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="mb-6">
                      <h3 className="text-2xl font-semibold text-slate-900">
                        Recommended Actions
                      </h3>
                    </div>

                    <div className="space-y-4">
                      {recommendations.map((item, index) => (
                        <div
                          key={index}
                          className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4"
                        >
                          <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                            {index + 1}
                          </div>
                          <p className="text-sm leading-7 text-slate-700">
                            {item}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="mb-6">
                      <h3 className="text-2xl font-semibold text-slate-900">
                        AI Summary
                      </h3>
                    </div>

                    <div className="space-y-4">
                      <SummaryRow
                        label="Occupancy Rate"
                        value={`${stats?.occupancyRate ?? 0}%`}
                        tone="good"
                      />
                      <SummaryRow
                        label="Maintenance Risk"
                        value={
                          (stats?.openMaintenance ?? 0) > 0
                            ? "Attention Needed"
                            : "Stable"
                        }
                        tone={
                          (stats?.openMaintenance ?? 0) > 0 ? "warn" : "good"
                        }
                      />
                      <SummaryRow
                        label="Document Completeness"
                        value={
                          (stats?.missingDocuments ?? 0) > 0
                            ? "Incomplete"
                            : "Good"
                        }
                        tone={
                          (stats?.missingDocuments ?? 0) > 0 ? "warn" : "good"
                        }
                      />
                      <SummaryRow
                        label="Payment Monitoring"
                        value={
                          (stats?.paymentRisk ?? 0) > 0
                            ? "Review Suggested"
                            : "Stable"
                        }
                        tone={(stats?.paymentRisk ?? 0) > 0 ? "warn" : "good"}
                      />
                    </div>
                  </div>

                  <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="mb-6">
                      <h3 className="text-2xl font-semibold text-slate-900">
                        Current Status
                      </h3>
                    </div>

                    <div className="space-y-4">
                      <StatusRow
                        label="Rule Engine"
                        value="Active"
                        color="green"
                      />
                      <StatusRow
                        label="Portfolio Scan"
                        value="Available"
                        color="blue"
                      />
                      <StatusRow
                        label="Predictive Models"
                        value="Coming Soon"
                        color="amber"
                      />
                      <StatusRow
                        label="Auto Suggestions"
                        value="Enabled"
                        color="green"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function getInsightIcon(category: string) {
  switch (category) {
    case "FINANCIAL":
      return <Wallet className="h-5 w-5" />;
    case "MAINTENANCE":
      return <Hammer className="h-5 w-5" />;
    case "DOCUMENTS":
      return <FileWarning className="h-5 w-5" />;
    case "OCCUPANCY":
      return <TrendingUp className="h-5 w-5" />;
    default:
      return <ShieldCheck className="h-5 w-5" />;
  }
}

function StatCard({
  color,
  title,
  value,
  subtitle,
  icon,
}: {
  color: "blue" | "amber" | "emerald" | "purple" | "rose";
  title: string;
  value: number | string;
  subtitle: string;
  icon: ReactNode;
}) {
  const colorMap = {
    blue: "bg-blue-500",
    amber: "bg-amber-500",
    emerald: "bg-emerald-500",
    purple: "bg-purple-500",
    rose: "bg-rose-500",
  };

  return (
    <div className="rounded-[22px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <div className={`h-3 w-24 rounded-full ${colorMap[color]}`} />
        <div className="text-slate-400">{icon}</div>
      </div>
      <p className="text-lg text-slate-500">{title}</p>
      <h3 className="mt-4 text-4xl font-bold text-slate-900">{value}</h3>
      <p className="mt-4 text-lg text-slate-400">{subtitle}</p>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "good" | "warn";
}) {
  const toneClasses =
    tone === "good"
      ? "bg-emerald-100 text-emerald-700"
      : "bg-amber-100 text-amber-700";

  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
      <span className="text-sm text-slate-600">{label}</span>
      <span
        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${toneClasses}`}
      >
        {value}
      </span>
    </div>
  );
}

function StatusRow({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: "green" | "blue" | "amber";
}) {
  const colorClasses =
    color === "green"
      ? "bg-emerald-100 text-emerald-700"
      : color === "blue"
      ? "bg-blue-100 text-blue-700"
      : "bg-amber-100 text-amber-700";

  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
      <span className="text-sm text-slate-600">{label}</span>
      <span
        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${colorClasses}`}
      >
        {value}
      </span>
    </div>
  );
}

function getPriorityBadge(priority: "HIGH" | "MEDIUM" | "LOW") {
  switch (priority) {
    case "HIGH":
      return "bg-red-100 text-red-700";
    case "MEDIUM":
      return "bg-amber-100 text-amber-700";
    default:
      return "bg-emerald-100 text-emerald-700";
  }
}

function getPriorityIconBox(priority: "HIGH" | "MEDIUM" | "LOW") {
  switch (priority) {
    case "HIGH":
      return "bg-red-100 text-red-600";
    case "MEDIUM":
      return "bg-amber-100 text-amber-600";
    default:
      return "bg-emerald-100 text-emerald-600";
  }
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