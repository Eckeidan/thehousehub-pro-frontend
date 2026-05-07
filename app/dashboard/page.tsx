"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import AdminShell from "@/components/AdminShell";

type DashboardStats = {
  totalProperties: number;
  totalUnits: number;
  totalTenants: number;
  occupancyRate: number;
  openMaintenance: number;
};

type StoredUser = {
  id?: string;
  fullName?: string;
  name?: string;
  email?: string;
  role?: string;
  organizationId?: string;
};

const quickActions = [
  {
    title: "Add Property",
    description: "Create a new property record",
    href: "/properties",
  },
  {
    title: "Add Tenant",
    description: "Register a new tenant",
    href: "/tenants/add",
  },
  {
    title: "Create Maintenance",
    description: "Open a maintenance request",
    href: "/maintenance/new",
  },
  {
    title: "View Reports",
    description: "Open reports and analytics",
    href: "/insights",
  },
];

const recentActivity = [
  "Property portfolio loaded successfully",
  "Dashboard API connected",
  "Frontend connected to backend",
  "Data synchronization completed",
];

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function DashboardPage() {
  const router = useRouter();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState("");
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [user, setUser] = useState<StoredUser | null>(null);

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
    } catch (err) {
      console.error("Auth parse error:", err);
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      router.replace("/");
    }
  }, [router]);

  useEffect(() => {
    if (checkingAuth) return;

    const loadDashboard = async () => {
      try {
        const token = localStorage.getItem("token");

        const res = await fetch(`${API_BASE}/api/dashboard`, {
          method: "GET",
          cache: "no-store",
          headers: {
            "Content-Type": "application/json",
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
          throw new Error(`HTTP error ${res.status}`);
        }

        const data = await res.json();
        setStats(data);
      } catch (err) {
        console.error("Dashboard fetch error:", err);
        setError("Unable to load dashboard from backend.");
      }
    };

    loadDashboard();
  }, [checkingAuth, router]);

  const chartData = useMemo(() => {
    return [
      { name: "Properties", value: stats?.totalProperties ?? 0 },
      { name: "Units", value: stats?.totalUnits ?? 0 },
      { name: "Tenants", value: stats?.totalTenants ?? 0 },
      { name: "Open Maint.", value: stats?.openMaintenance ?? 0 },
    ];
  }, [stats]);

  const normalizedRole = String(user?.role || "").trim().toUpperCase();
  const isSuperAdmin = normalizedRole === "OWNER";
  const canEdit = normalizedRole === "ADMIN";

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-8">
        <div className="rounded-3xl border border-slate-200 bg-white px-8 py-6 text-slate-700 shadow-xl">
          Checking session...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-8">
        <div className="rounded-3xl border border-red-200 bg-white p-8 shadow-xl">
          <h1 className="mb-2 text-2xl font-bold text-red-600">Error</h1>
          <p className="text-slate-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-8">
        <div className="rounded-3xl border border-slate-200 bg-white px-8 py-6 text-slate-700 shadow-xl">
          Loading dashboard...
        </div>
      </div>
    );
  }

  return (
    <AdminShell
      user={user}
      activeItem="dashboard"
      title="Dashboard"
      subtitle="Welcome back. Here is your property portfolio overview."
      actions={
        canEdit ? (
          <Link
            href="/properties"
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-700"
          >
            Add Property
          </Link>
        ) : null
      }
    >
      {isSuperAdmin && (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-700">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">Read-only Super Admin mode</p>
              <p className="mt-1">
                You can review the full platform and manage Admin / Owner
                accounts from Settings, but operational records remain read-only.
              </p>
            </div>
          </div>
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          title="Total Properties"
          value={stats.totalProperties}
          subtitle="Registered assets"
          accent="blue"
        />
        <StatCard
          title="Total Units"
          value={stats.totalUnits}
          subtitle="Units in portfolio"
          accent="indigo"
        />
        <StatCard
          title="Total Tenants"
          value={stats.totalTenants}
          subtitle="Tenant records"
          accent="cyan"
        />
        <StatCard
          title="Occupancy Rate"
          value={`${stats.occupancyRate}%`}
          subtitle="Occupied unit ratio"
          accent="emerald"
        />
        <StatCard
          title="Open Maintenance"
          value={stats.openMaintenance ?? 0}
          subtitle="Pending issues"
          accent="amber"
        />
      </section>

      <section className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 xl:col-span-2">
          <div className="mb-6">
            <h3 className="text-xl font-semibold text-slate-900">
              Quick Actions
            </h3>
            <p className="text-sm text-slate-500">
              Fast access to common tasks
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {quickActions.map((action) =>
              canEdit ? (
                <Link
                  key={action.title}
                  href={action.href}
                  className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-blue-50 p-5 text-left transition hover:border-blue-300 hover:shadow-md"
                >
                  <h4 className="text-base font-semibold text-slate-900">
                    {action.title}
                  </h4>
                  <p className="mt-2 text-sm text-slate-500">
                    {action.description}
                  </p>
                </Link>
              ) : (
                <div
                  key={action.title}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-left opacity-80"
                >
                  <h4 className="text-base font-semibold text-slate-900">
                    {action.title}
                  </h4>
                  <p className="mt-2 text-sm text-slate-500">
                    {action.description}
                  </p>
                  <p className="mt-3 text-xs font-medium text-amber-600">
                    Read only
                  </p>
                </div>
              )
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h3 className="text-xl font-semibold text-slate-900">
            System Status
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Backend and application health
          </p>

          <div className="mt-6 space-y-4">
            <StatusRow label="API Server" status="Online" color="green" />
            <StatusRow label="Database" status="Connected" color="green" />
            <StatusRow label="Dashboard Route" status="Active" color="green" />
            <StatusRow
              label="Open Issues"
              status={
                stats.openMaintenance > 0
                  ? String(stats.openMaintenance)
                  : "None"
              }
              color={stats.openMaintenance > 0 ? "yellow" : "green"}
            />
          </div>
        </div>
      </section>

      <section className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h3 className="text-xl font-semibold text-slate-900">
            Recent Activity
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Latest operations and technical events
          </p>

          <div className="mt-6 space-y-4">
            {recentActivity.map((item, index) => (
              <div
                key={index}
                className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4"
              >
                <div className="mt-1 h-2.5 w-2.5 rounded-full bg-blue-600" />
                <p className="text-sm text-slate-700">{item}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h3 className="text-xl font-semibold text-slate-900">
            Portfolio Summary
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Current status of your portfolio
          </p>

          <div className="mt-6 space-y-5">
            <SummaryRow
              label="Properties created"
              value={String(stats.totalProperties)}
            />
            <SummaryRow
              label="Units available in system"
              value={String(stats.totalUnits)}
            />
            <SummaryRow
              label="Tenant records"
              value={String(stats.totalTenants)}
            />
            <SummaryRow label="Occupancy" value={`${stats.occupancyRate}%`} />
            <SummaryRow
              label="Open maintenance requests"
              value={String(stats.openMaintenance)}
            />
          </div>
        </div>
      </section>

      <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-4">
          <h3 className="text-xl font-semibold text-slate-900">
            Portfolio Overview
          </h3>
          <p className="text-sm text-slate-500">
            Visual summary of current portfolio data
          </p>
        </div>

        <div className="h-64 overflow-x-auto sm:h-72">
          <div className="h-full min-w-[520px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#2563eb" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>
    </AdminShell>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  accent,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  accent: "blue" | "indigo" | "cyan" | "emerald" | "amber";
}) {
  const accentMap = {
    blue: "from-blue-500 to-blue-600",
    indigo: "from-indigo-500 to-indigo-600",
    cyan: "from-cyan-500 to-cyan-600",
    emerald: "from-emerald-500 to-emerald-600",
    amber: "from-amber-500 to-orange-500",
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div
        className={`mb-4 h-2 w-16 rounded-full bg-gradient-to-r ${accentMap[accent]}`}
      />
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
        {value}
      </p>
      <p className="mt-3 text-sm text-slate-500">{subtitle}</p>
    </div>
  );
}

function StatusRow({
  label,
  status,
  color,
}: {
  label: string;
  status: string;
  color: "green" | "yellow" | "red";
}) {
  const colorMap = {
    green: "bg-emerald-500",
    yellow: "bg-amber-500",
    red: "bg-red-500",
  };

  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
      <span className="text-sm text-slate-600">{label}</span>
      <div className="flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${colorMap[color]}`} />
        <span className="text-sm font-medium text-slate-800">{status}</span>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-semibold text-slate-900">{value}</span>
    </div>
  );
}