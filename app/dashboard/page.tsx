"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  Bot,
  Building2,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  Home,
  Loader2,
  Lock,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Users,
  Wrench,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from "recharts";
import AdminShell from "@/components/AdminShell";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type StoredUser = {
  id?: string;
  fullName?: string;
  name?: string;
  email?: string;
  role?: string;
  organizationId?: string;
  mustChangePassword?: boolean;
};

type DashboardStats = {
  totalProperties: number;
  totalUnits: number;
  totalTenants: number;
  occupancyRate: number;
  openMaintenance: number;
  occupiedProperties?: number;
};

type ReportPayload = {
  summary: {
    properties: number;
    tenants: number;
    occupiedProperties: number;
    occupancyRate: number;
    totalRevenue: number;
    pendingRevenue: number;
    rejectedRevenue: number;
    totalRentPotential: number;
    maintenanceOpen: number;
    maintenanceTotal: number;
  };
  charts: {
    revenueByMonth: Array<{
      month: string;
      paid: number;
      pending: number;
      rejected: number;
      payments: number;
    }>;
    paymentsByStatus: Array<{ name: string; value: number }>;
    propertyPerformance: Array<{
      id: string;
      name: string;
      paid: number;
      pending: number;
      rejected: number;
      maintenance: number;
      tenants: number;
      monthlyRent: number;
    }>;
  };
};

type AssistantMessage = {
  role: "system" | "user";
  text: string;
};

function formatMoney(value?: number | null) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function pct(value?: number | null) {
  return `${Math.round(Number(value || 0))}%`;
}

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [report, setReport] = useState<ReportPayload | null>(null);
  const [error, setError] = useState("");
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<StoredUser | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [assistantMessages, setAssistantMessages] = useState<AssistantMessage[]>([
    {
      role: "system",
      text: "Ask me for portfolio risk, cash position, occupancy, or pending work.",
    },
  ]);

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

      async function verifyUserFromBackend() {
        try {
          const res = await fetch(`${API_BASE}/api/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
          });

          const data = await res.json();

          if (!res.ok) {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            router.replace("/");
            return;
          }

          const freshUser = data.user;
          localStorage.setItem("user", JSON.stringify(freshUser));
          setUser(freshUser);
          setShowPasswordModal(freshUser?.mustChangePassword === true);
          setCheckingAuth(false);
        } catch (authError) {
          console.error("Auth verify error:", authError);
          router.replace("/");
        }
      }

      verifyUserFromBackend();
    } catch (authError) {
      console.error("Auth parse error:", authError);
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      router.replace("/");
    }
  }, [router]);

  useEffect(() => {
    if (checkingAuth) return;

    async function loadDashboard() {
      try {
        setLoading(true);
        setError("");
        const token = localStorage.getItem("token");

        const [dashboardRes, reportRes] = await Promise.all([
          fetch(`${API_BASE}/api/dashboard`, {
            cache: "no-store",
            headers: { Authorization: `Bearer ${token || ""}` },
          }),
          fetch(`${API_BASE}/api/reports`, {
            cache: "no-store",
            headers: { Authorization: `Bearer ${token || ""}` },
          }),
        ]);

        if (dashboardRes.status === 401 || reportRes.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          router.replace("/");
          return;
        }

        if (!dashboardRes.ok) throw new Error(`Dashboard error ${dashboardRes.status}`);
        if (!reportRes.ok) throw new Error(`Report error ${reportRes.status}`);

        setStats(await dashboardRes.json());
        setReport(await reportRes.json());
      } catch (loadError) {
        console.error("Dashboard load error:", loadError);
        setError("Unable to load dashboard intelligence.");
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, [checkingAuth, router]);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (!newPassword || !confirmPassword) {
      setPasswordError("New password and confirmation are required.");
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation do not match.");
      return;
    }

    try {
      setChangingPassword(true);
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/auth/change-password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token || ""}`,
        },
        body: JSON.stringify({ newPassword, confirmPassword }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Failed to change password.");

      const updatedUser = {
        ...JSON.parse(localStorage.getItem("user") || "{}"),
        mustChangePassword: false,
      };

      localStorage.setItem("user", JSON.stringify(updatedUser));
      setUser(updatedUser);
      setPasswordSuccess("Password changed successfully.");
      setNewPassword("");
      setConfirmPassword("");

      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordSuccess("");
      }, 900);
    } catch (changeError: any) {
      setPasswordError(changeError?.message || "Failed to change password.");
    } finally {
      setChangingPassword(false);
    }
  }

  const normalizedRole = String(user?.role || "").trim().toUpperCase();
  const isSuperAdmin = normalizedRole === "OWNER";
  const canEdit = normalizedRole === "ADMIN";

  const performanceData = useMemo(() => {
    return (report?.charts.propertyPerformance || [])
      .slice()
      .sort((a, b) => b.paid - a.paid)
      .slice(0, 6);
  }, [report]);

  const healthScore = useMemo(() => {
    const occupancy = report?.summary.occupancyRate || stats?.occupancyRate || 0;
    const maintenancePenalty = Math.min((report?.summary.maintenanceOpen || 0) * 4, 25);
    const pendingPenalty =
      report?.summary.totalRevenue || report?.summary.pendingRevenue
        ? Math.min(
            ((report.summary.pendingRevenue || 0) /
              Math.max(report.summary.totalRevenue + report.summary.pendingRevenue, 1)) *
              25,
            25
          )
        : 0;

    return Math.max(0, Math.round(occupancy - maintenancePenalty - pendingPenalty + 25));
  }, [report, stats]);

  function askAssistant(prompt: string) {
    const summary = report?.summary;
    let answer = "I need the latest portfolio data before answering.";

    if (summary) {
      if (prompt === "cash") {
        answer = `Collected revenue is ${formatMoney(summary.totalRevenue)}. Pending approval is ${formatMoney(summary.pendingRevenue)}, so your immediate cash review priority is pending payment validation.`;
      } else if (prompt === "risk") {
        answer = `Main risk: ${summary.maintenanceOpen} open maintenance item(s), ${formatMoney(summary.pendingRevenue)} pending payments, and ${pct(summary.occupancyRate)} occupancy. Focus on approvals, vacancies, and open work orders first.`;
      } else if (prompt === "occupancy") {
        answer = `${summary.occupiedProperties} of ${summary.properties} properties are occupied. Current occupancy is ${pct(summary.occupancyRate)}.`;
      } else {
        answer = `Top next action: review ${formatMoney(summary.pendingRevenue)} in pending payments, then inspect ${summary.maintenanceOpen} open maintenance item(s).`;
      }
    }

    setAssistantMessages((current) => [
      ...current,
      { role: "user", text: prompt },
      { role: "system", text: answer },
    ]);
  }

  if (checkingAuth || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-8 dark:bg-slate-950">
        <div className="rounded-3xl border border-slate-200 bg-white px-8 py-6 text-slate-700 shadow-xl dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
          Loading command center...
        </div>
      </div>
    );
  }

  if (error || !stats || !report) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-8 dark:bg-slate-950">
        <div className="rounded-3xl border border-red-200 bg-white p-8 shadow-xl dark:border-red-500/30 dark:bg-white/5">
          <h1 className="mb-2 text-2xl font-bold text-red-600">Error</h1>
          <p className="text-slate-600 dark:text-slate-300">{error || "Dashboard unavailable."}</p>
        </div>
      </div>
    );
  }

  return (
    <AdminShell
      user={user}
      activeItem="dashboard"
      title="Dashboard"
      subtitle="Executive portfolio intelligence, cashflow, work queue, and tenant operations."
      actions={
        <div className="flex flex-wrap gap-2">
          <Link
            href="/reports"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
          >
            Reports
            <ArrowUpRight className="h-4 w-4" />
          </Link>
          {canEdit && (
            <Link
              href="/properties"
              className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-blue-700"
            >
              Add Property
            </Link>
          )}
        </div>
      }
    >
      {showPasswordModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[28px] border border-slate-200 bg-white p-7 shadow-2xl dark:border-white/10 dark:bg-slate-900">
            <div className="mb-6 flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                <Lock className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                  Change your password
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                  For security, you must change your temporary password before continuing.
                </p>
              </div>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <PasswordInput label="New password" value={newPassword} onChange={setNewPassword} />
              <PasswordInput label="Confirm new password" value={confirmPassword} onChange={setConfirmPassword} />

              {passwordError && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {passwordError}
                </div>
              )}
              {passwordSuccess && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                  {passwordSuccess}
                </div>
              )}
              <button
                type="submit"
                disabled={changingPassword}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {changingPassword && <Loader2 className="h-4 w-4 animate-spin" />}
                Save new password
              </button>
            </form>
          </div>
        </div>
      )}

      {isSuperAdmin && (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">Read-only Super Admin mode</p>
              <p className="mt-1">Operational changes remain protected for tenant isolation.</p>
            </div>
          </div>
        </div>
      )}

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.45fr_.55fr]">
        <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-slate-950 text-white shadow-sm dark:border-white/10">
          <div className="grid gap-6 p-6 lg:grid-cols-[1fr_300px] lg:p-8">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-blue-100">
                <Sparkles className="h-4 w-4" />
                Portfolio Command Center
              </div>
              <h1 className="mt-5 max-w-2xl text-4xl font-black tracking-tight sm:text-5xl">
                {formatMoney(report.summary.totalRevenue)} collected
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300 sm:text-base">
                {formatMoney(report.summary.pendingRevenue)} pending approval, {pct(report.summary.occupancyRate)} occupancy, and {report.summary.maintenanceOpen} open maintenance item(s).
              </p>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                <HeroMetric label="Health Score" value={`${healthScore}/100`} />
                <HeroMetric label="Properties" value={String(report.summary.properties)} />
                <HeroMetric label="Tenants" value={String(report.summary.tenants)} />
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/10 p-4">
              <p className="text-sm font-semibold text-slate-200">Monthly Revenue</p>
              <div className="mt-4 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={report.charts.revenueByMonth}>
                    <defs>
                      <linearGradient id="paidGradient" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.85} />
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} />
                    <Tooltip />
                    <Area type="monotone" dataKey="paid" stroke="#22c55e" fill="url(#paidGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-blue-50 p-3 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-950 dark:text-white">Portfolio Chat</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Fast answers from current data.</p>
            </div>
          </div>
          <div className="mt-5 h-64 space-y-3 overflow-y-auto rounded-3xl bg-slate-50 p-3 dark:bg-slate-950/70">
            {assistantMessages.slice(-6).map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`rounded-2xl px-4 py-3 text-sm ${
                  message.role === "user"
                    ? "ml-8 bg-blue-600 text-white"
                    : "mr-8 bg-white text-slate-700 shadow-sm dark:bg-white/10 dark:text-slate-200"
                }`}
              >
                {message.text}
              </div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ChatButton label="Cash" onClick={() => askAssistant("cash")} />
            <ChatButton label="Risk" onClick={() => askAssistant("risk")} />
            <ChatButton label="Occupancy" onClick={() => askAssistant("occupancy")} />
            <ChatButton label="Next Action" onClick={() => askAssistant("next")} />
          </div>
        </div>
      </section>

      <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard icon={<Building2 />} title="Properties" value={stats.totalProperties} subtitle={`${report.summary.occupiedProperties} occupied`} accent="blue" />
        <StatCard icon={<Users />} title="Tenants" value={stats.totalTenants} subtitle="Active tenant records" accent="cyan" />
        <StatCard icon={<Home />} title="Occupancy" value={pct(stats.occupancyRate)} subtitle="Property-level occupancy" accent="emerald" />
        <StatCard icon={<Wrench />} title="Open Work" value={stats.openMaintenance} subtitle="Maintenance attention" accent="amber" />
        <StatCard icon={<CreditCard />} title="Pending Cash" value={formatMoney(report.summary.pendingRevenue)} subtitle="Needs approval" accent="rose" />
      </section>

      <section className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Panel title="Cashflow Intelligence" subtitle="Paid, pending, and rejected by month" className="xl:col-span-2">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={report.charts.revenueByMonth}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar dataKey="paid" stackId="a" fill="#22c55e" radius={[8, 8, 0, 0]} />
                <Bar dataKey="pending" stackId="a" fill="#f59e0b" radius={[8, 8, 0, 0]} />
                <Bar dataKey="rejected" stackId="a" fill="#ef4444" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Payment Mix" subtitle="Current reporting window">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={report.charts.paymentsByStatus} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92} paddingAngle={4}>
                  {report.charts.paymentsByStatus.map((entry, index) => (
                    <Cell key={entry.name} fill={["#22c55e", "#f59e0b", "#ef4444", "#2563eb"][index % 4]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </section>

      <section className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1fr_.8fr]">
        <Panel title="Property Performance" subtitle="Top properties by collected rent">
          <div className="space-y-3">
            {performanceData.length === 0 ? (
              <EmptyState text="No property payment performance yet." />
            ) : (
              performanceData.map((property) => (
                <div key={property.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-slate-950 dark:text-white">{property.name}</p>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        {property.tenants} tenant(s) · {property.maintenance} work item(s)
                      </p>
                    </div>
                    <p className="font-black text-emerald-600">{formatMoney(property.paid)}</p>
                  </div>
                  <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Share of collected revenue:{" "}
                    {Math.round(
                      (property.paid / Math.max(report.summary.totalRevenue, 1)) * 100
                    )}
                    %
                  </p>
                </div>
              ))
            )}
          </div>
        </Panel>

        <Panel title="Action Board" subtitle="Operational shortcuts">
          <div className="grid gap-3">
            <ActionLink icon={<ClipboardList />} title="Approve tenant payments" detail={`${formatMoney(report.summary.pendingRevenue)} waiting`} href="/todo" />
            <ActionLink icon={<Wrench />} title="Resolve maintenance" detail={`${report.summary.maintenanceOpen} open item(s)`} href="/maintenance" />
            <ActionLink icon={<MessageCircle />} title="Message tenants" detail="Open communication center" href="/communications" />
            <ActionLink icon={<CheckCircle2 />} title="Generate full report" detail="Export or email landlord report" href="/reports" />
          </div>
        </Panel>
      </section>
    </AdminShell>
  );
}

function PasswordInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
        {label}
      </label>
      <input
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:border-white/10 dark:bg-white/5 dark:text-white"
        placeholder="Minimum 8 characters"
      />
    </div>
  );
}

function HeroMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-black text-white">{value}</p>
    </div>
  );
}

function ChatButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
    >
      {label}
    </button>
  );
}

function StatCard({
  icon,
  title,
  value,
  subtitle,
  accent,
}: {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  subtitle: string;
  accent: "blue" | "cyan" | "emerald" | "amber" | "rose";
}) {
  const colors = {
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300",
    cyan: "bg-cyan-50 text-cyan-600 dark:bg-cyan-500/10 dark:text-cyan-300",
    emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300",
    amber: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300",
    rose: "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300",
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
      <div className={`mb-4 inline-flex rounded-2xl p-3 [&_svg]:h-5 [&_svg]:w-5 ${colors[accent]}`}>
        {icon}
      </div>
      <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{title}</p>
      <p className="mt-2 text-3xl font-black tracking-tight text-slate-950 dark:text-white">{value}</p>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
    </div>
  );
}

function Panel({
  title,
  subtitle,
  className = "",
  children,
}: {
  title: string;
  subtitle: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5 ${className}`}>
      <div className="mb-5">
        <h3 className="text-xl font-black text-slate-950 dark:text-white">{title}</h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

function ActionLink({
  icon,
  title,
  detail,
  href,
}: {
  icon: React.ReactNode;
  title: string;
  detail: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-blue-300 hover:bg-blue-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-blue-500/10"
    >
      <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-white p-3 text-blue-600 shadow-sm dark:bg-white/10 dark:text-blue-300 [&_svg]:h-5 [&_svg]:w-5">
          {icon}
        </div>
        <div>
          <p className="font-bold text-slate-950 dark:text-white">{title}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">{detail}</p>
        </div>
      </div>
      <ArrowUpRight className="h-5 w-5 text-slate-400" />
    </Link>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
      {text}
    </div>
  );
}
