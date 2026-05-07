"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
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
  Loader2,
  Wallet,
} from "lucide-react";

import AdminShell from "@/components/AdminShell";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://propertyos-backend.onrender.com";

type StoredUser = {
  id?: string;
  fullName?: string;
  name?: string;
  email?: string;
  role?: string;
  organizationId?: string;
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
    setNotification({
      open: true,
      type,
      title,
      message,
    });
  }

  const handleUnauthorized = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.replace("/");
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

      const role = String(parsedUser?.role || "")
        .trim()
        .toLowerCase();

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
      setNotification((prev) => ({
        ...prev,
        open: false,
      }));
    }, 4000);

    return () => clearTimeout(timer);
  }, [notification.open]);

  async function fetchInsights() {
    try {
      setLoading(true);

      const token = localStorage.getItem("token");

      const res = await fetch(`${API_BASE}/api/insights`, {
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${token || ""}`,
          "Content-Type": "application/json",
        },
      });

      if (res.status === 401) {
        handleUnauthorized();
        return;
      }

      const contentType = res.headers.get("content-type") || "";

      let result: any = null;

      if (contentType.includes("application/json")) {
        result = await res.json();
      } else {
        const rawText = await res.text();

        throw new Error(rawText || "Invalid response from insights API");
      }

      if (!res.ok) {
        throw new Error(
          result?.error ||
            result?.message ||
            "Failed to load insights"
        );
      }

      setData(result);
    } catch (error: any) {
      console.error("Insights fetch error:", error);

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
    <AdminShell
      user={user}
      activeItem="insights"
      title="AI Insights"
      subtitle="Smart recommendations and portfolio observations generated from your current organization data."
      actions={
        <button
          onClick={fetchInsights}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700"
        >
          <Sparkles className="h-4 w-4" />
          Refresh Analysis
        </button>
      }
    >
      <div className="space-y-6">
        {notification.open && (
          <div className="fixed right-4 top-4 z-[110] w-[calc(100%-2rem)] max-w-md sm:right-6 sm:top-6">
            <div
              className={`rounded-3xl border bg-white shadow-2xl ${
                isError
                  ? "border-red-200"
                  : "border-emerald-200"
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
                      isError
                        ? "text-red-700"
                        : "text-emerald-700"
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
                    setNotification((prev) => ({
                      ...prev,
                      open: false,
                    }))
                  }
                  className="rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-4 text-sm text-blue-700">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />

            <div>
              <p className="font-semibold">
                Organization-secured insights
              </p>

              <p className="mt-1">
                Current Org ID:{" "}
                <span className="font-mono">
                  {user?.organizationId || "No organizationId"}
                </span>
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">
            Loading AI insights...
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
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
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-2xl font-semibold text-slate-900">
                    Portfolio Insights
                  </h3>

                  <div className="mt-6 space-y-4">
                    {insights.length === 0 ? (
                      <div className="rounded-2xl bg-slate-50 p-8 text-center text-sm text-slate-500">
                        No insights available yet.
                      </div>
                    ) : (
                      insights.map((insight) => (
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
                                {getInsightIcon(
                                  insight.category
                                )}
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
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-2xl font-semibold text-slate-900">
                    Recommended Actions
                  </h3>

                  <div className="mt-6 space-y-4">
                    {recommendations.length === 0 ? (
                      <div className="rounded-2xl bg-slate-50 p-8 text-center text-sm text-slate-500">
                        No recommendations available.
                      </div>
                    ) : (
                      recommendations.map((item, index) => (
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
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-2xl font-semibold text-slate-900">
                    AI Summary
                  </h3>

                  <div className="mt-6 space-y-4">
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
                        (stats?.openMaintenance ?? 0) > 0
                          ? "warn"
                          : "good"
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
                        (stats?.missingDocuments ?? 0) > 0
                          ? "warn"
                          : "good"
                      }
                    />

                    <SummaryRow
                      label="Payment Monitoring"
                      value={
                        (stats?.paymentRisk ?? 0) > 0
                          ? "Review Suggested"
                          : "Stable"
                      }
                      tone={
                        (stats?.paymentRisk ?? 0) > 0
                          ? "warn"
                          : "good"
                      }
                    />
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-2xl font-semibold text-slate-900">
                    Current Status
                  </h3>

                  <div className="mt-6 space-y-4">
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
    </AdminShell>
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

function getPriorityBadge(
  priority: "HIGH" | "MEDIUM" | "LOW"
) {
  switch (priority) {
    case "HIGH":
      return "bg-red-100 text-red-700";

    case "MEDIUM":
      return "bg-amber-100 text-amber-700";

    default:
      return "bg-emerald-100 text-emerald-700";
  }
}

function getPriorityIconBox(
  priority: "HIGH" | "MEDIUM" | "LOW"
) {
  switch (priority) {
    case "HIGH":
      return "bg-red-100 text-red-600";

    case "MEDIUM":
      return "bg-amber-100 text-amber-600";

    default:
      return "bg-emerald-100 text-emerald-600";
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

      <h3 className="mt-4 text-4xl font-bold text-slate-900">
        {value}
      </h3>

      <p className="mt-4 text-lg text-slate-400">
        {subtitle}
      </p>
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
  const colorClasses: Record<
    "green" | "blue" | "amber",
    string
  > = {
    green: "bg-emerald-100 text-emerald-700",
    blue: "bg-blue-100 text-blue-700",
    amber: "bg-amber-100 text-amber-700",
  };

  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
      <span className="text-sm text-slate-600">{label}</span>

      <span
        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${colorClasses[color]}`}
      >
        {value}
      </span>
    </div>
  );
}