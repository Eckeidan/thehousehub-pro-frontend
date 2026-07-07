"use client";

import { useEffect, useMemo, useState, type ReactNode, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Home,
  CreditCard,
  Wrench,
  FileText,
  Bell,
  LogOut,
  UserCircle2,
  MessageCircle,
  MapPin,
  CalendarDays,
  BadgeCheck,
  Wallet,
  ArrowRight,
  Settings,
  Loader2,
  Building2,
  Phone,
  Mail,
  Sparkles,
  ShieldCheck,
  Layers3,
  Menu,
  X,
  Lock,
  Bot,
  Send,
  TrendingUp,
  ClipboardCheck,
  TimerReset,
} from "lucide-react";
import TenantAIWidget from "@/components/TenantAIWidget";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type AuthUser = {
  id: string;
  fullName?: string;
  name?: string;
  email?: string;
  role?: string;
  tenantId?: string | null;
  mustChangePassword?: boolean;
  tenant?: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    phone?: string | null;
    leaseStartDate?: string | null;
    leaseEndDate?: string | null;
    leaseStatus?: string | null;
    monthlyRent?: string | number | null;
    property?: {
      id: string;
      name?: string | null;
      code?: string | null;
      addressLine1?: string | null;
      city?: string | null;
      state?: string | null;
      postalCode?: string | null;
      country?: string | null;
      monthlyRent?: string | number | null;
      occupancyStatus?: string | null;
      floor?: number | null;
      bedrooms?: number | null;
      bathrooms?: number | null;
      areaSqm?: string | number | null;
    } | null;
    unit?: {
      id: string;
      unitCode?: string | null;
      unitName?: string | null;
      floor?: number | null;
      bedrooms?: number | null;
      bathrooms?: number | null;
      monthlyRent?: string | number | null;
      occupancyStatus?: string | null;
    } | null;
    leases?: Array<{
      id: string;
      status?: string | null;
      startDate?: string | null;
      endDate?: string | null;
      rentAmount?: number | null;
    }>;
  } | null;
};

type PaymentItem = {
  id: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  status: string;
  reference?: string | null;
};

type MaintenanceItem = {
  id: string;
  requestNumber?: string;
  title: string;
  category?: string;
  priority?: string;
  status?: string;
  createdAt?: string;
};

type TenantDocument = {
  id: string;
  documentName: string;
  type: string;
  fileUrl: string;
  createdAt: string;
  accessibleToTenant?: boolean;
  tenantId?: string | null;
  tenant?: {
    id?: string;
  } | null;
};

function formatMoney(value?: string | number | null) {
  if (value === null || value === undefined || value === "") return "$0";
  const num = Number(value);
  if (Number.isNaN(num)) return `$${value}`;

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(num);
}

function formatDate(value?: string | null) {
  if (!value) return "Not set";

  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatShortMonth(date: Date) {
  return date.toLocaleDateString("en-US", { month: "short" });
}

function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function getDaysUntil(value?: string | null) {
  if (!value) return null;
  const target = new Date(value);
  if (Number.isNaN(target.getTime())) return null;

  const today = new Date();
  const dayMs = 1000 * 60 * 60 * 24;
  return Math.ceil((target.getTime() - today.getTime()) / dayMs);
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

function getLeaseBadge(status?: string | null) {
  switch (String(status || "").toUpperCase()) {
    case "ACTIVE":
      return "bg-emerald-100 text-emerald-700 border border-emerald-200";
    case "PENDING":
      return "bg-amber-100 text-amber-700 border border-amber-200";
    case "EXPIRED":
      return "bg-rose-100 text-rose-700 border border-rose-200";
    case "TERMINATED":
      return "bg-slate-100 text-slate-700 border border-slate-200";
    default:
      return "bg-slate-100 text-slate-700 border border-slate-200";
  }
}

function getPaymentBadge(status?: string | null) {
  switch (String(status || "").toUpperCase()) {
    case "PAID":
      return "bg-emerald-100 text-emerald-700 border border-emerald-200";
    case "PARTIAL":
      return "bg-amber-100 text-amber-700 border border-amber-200";
    case "PENDING":
      return "bg-blue-100 text-blue-700 border border-blue-200";
    case "FAILED":
      return "bg-rose-100 text-rose-700 border border-rose-200";
    default:
      return "bg-slate-100 text-slate-700 border border-slate-200";
  }
}

function getMaintenanceBadge(status?: string | null) {
  switch (String(status || "").toUpperCase()) {
    case "OPEN":
      return "bg-amber-100 text-amber-700 border border-amber-200";
    case "IN_PROGRESS":
      return "bg-blue-100 text-blue-700 border border-blue-200";
    case "RESOLVED":
      return "bg-emerald-100 text-emerald-700 border border-emerald-200";
    case "CLOSED":
      return "bg-slate-100 text-slate-700 border border-slate-200";
    default:
      return "bg-slate-100 text-slate-700 border border-slate-200";
  }
}

export default function TenantPortalPage() {
  const router = useRouter();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceItem[]>([]);
  const [documents, setDocuments] = useState<TenantDocument[]>([]);
  const [error, setError] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

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
        if (role === "admin") router.replace("/dashboard");
        else if (role === "owner") router.replace("/owner");
        else router.replace("/");
        return;
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
    if (!checkingAuth) loadTenantPortal();
  }, [checkingAuth]);

  async function loadTenantPortal() {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("token");

      const meRes = await fetch(`${API_URL}/api/auth/me`, {
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${token || ""}`,
        },
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
      localStorage.setItem("user", JSON.stringify(currentUser));
      setShowPasswordModal(currentUser?.mustChangePassword === true);

      const tenantId = currentUser?.tenant?.id;

      if (!tenantId) {
        setPayments([]);
        setMaintenance([]);
        setDocuments([]);
        return;
      }

      const [paymentsRes, maintenanceRes, documentsRes] = await Promise.all([
        fetch(`${API_URL}/api/payments/tenant-history`, {
          cache: "no-store",
          headers: { Authorization: `Bearer ${token || ""}` },
        }),
        fetch(`${API_URL}/api/tenant/maintenance`, {
          cache: "no-store",
          headers: { Authorization: `Bearer ${token || ""}` },
        }),
        fetch(`${API_URL}/api/documents`, {
          cache: "no-store",
          headers: { Authorization: `Bearer ${token || ""}` },
        }),
      ]);

      const paymentsData = await paymentsRes.json().catch(() => []);
      const maintenanceData = await maintenanceRes.json().catch(() => []);
      const documentsData = await documentsRes.json().catch(() => []);

      setPayments(Array.isArray(paymentsData) ? paymentsData : []);
      setMaintenance(Array.isArray(maintenanceData) ? maintenanceData : []);

      const tenantDocuments = Array.isArray(documentsData)
        ? documentsData.filter(
            (item: TenantDocument) =>
              item?.tenant?.id === tenantId ||
              item?.tenantId === tenantId ||
              item?.accessibleToTenant === true
          )
        : [];

      setDocuments(tenantDocuments);
    } catch (err: any) {
      console.error("Tenant portal load error:", err);
      setError(err?.message || "Failed to load tenant portal.");
    } finally {
      setLoading(false);
    }
  }

  async function handleChangePassword(e: FormEvent<HTMLFormElement>) {
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

      const res = await fetch(`${API_URL}/api/auth/change-password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token || ""}`,
        },
        body: JSON.stringify({
          newPassword,
          confirmPassword,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "Failed to change password.");
      }

      const updatedUser: AuthUser = {
        ...(user as AuthUser),
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
    } catch (err: any) {
      setPasswordError(err?.message || "Failed to change password.");
    } finally {
      setChangingPassword(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.replace("/");
  }

  const fullName =
    user?.fullName ||
    user?.name ||
    `${user?.tenant?.firstName || ""} ${user?.tenant?.lastName || ""}`.trim() ||
    "Tenant";

  const initials = getInitials(fullName);
  const currentLease = user?.tenant?.leases?.[0] || null;

  const monthlyRent =
    currentLease?.rentAmount ??
    user?.tenant?.monthlyRent ??
    user?.tenant?.unit?.monthlyRent ??
    user?.tenant?.property?.monthlyRent ??
    0;

  const leaseStatus = String(
    user?.tenant?.leaseStatus || currentLease?.status || ""
  ).toUpperCase();

  const leaseEndDate = currentLease?.endDate || user?.tenant?.leaseEndDate || null;

  const isLeaseEnded =
    ["EXPIRED", "TERMINATED", "CANCELLED", "INACTIVE"].includes(leaseStatus) ||
    (leaseEndDate ? new Date(leaseEndDate) < new Date() : false);

  const activeMonthlyRent = isLeaseEnded ? 0 : Number(monthlyRent || 0);

  const currentMonthPaidAmount = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return payments
      .filter((p) => {
        const status = String(p.status || "").toUpperCase();
        const paymentDate = new Date(p.paymentDate);

        return (
          status === "PAID" &&
          paymentDate.getMonth() === currentMonth &&
          paymentDate.getFullYear() === currentYear
        );
      })
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);
  }, [payments]);

  const remainingBalance = Math.max(
    activeMonthlyRent - Number(currentMonthPaidAmount || 0),
    0
  );

  const pendingMaintenance = useMemo(
    () =>
      maintenance.filter((m) =>
        ["OPEN", "IN_PROGRESS"].includes(String(m.status || "").toUpperCase())
      ).length,
    [maintenance]
  );

  const latestPayment = payments.length > 0 ? payments[0] : null;
  const rentProgress = activeMonthlyRent
    ? clampPercent((Number(currentMonthPaidAmount || 0) / activeMonthlyRent) * 100)
    : 0;
  const paidPaymentCount = payments.filter(
    (p) => String(p.status || "").toUpperCase() === "PAID"
  ).length;
  const resolvedMaintenanceCount = maintenance.filter((m) =>
    ["RESOLVED", "CLOSED"].includes(String(m.status || "").toUpperCase())
  ).length;
  const leaseDaysRemaining = getDaysUntil(leaseEndDate);

  const paymentChartData = useMemo(() => {
    const now = new Date();

    return Array.from({ length: 6 }, (_, index) => {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
      const monthKey = getMonthKey(monthDate);
      const paid = payments
        .filter((payment) => {
          const status = String(payment.status || "").toUpperCase();
          const paymentDate = new Date(payment.paymentDate);

          return (
            status === "PAID" &&
            !Number.isNaN(paymentDate.getTime()) &&
            getMonthKey(paymentDate) === monthKey
          );
        })
        .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

      return {
        month: formatShortMonth(monthDate),
        paid,
        rent: activeMonthlyRent,
      };
    });
  }, [activeMonthlyRent, payments]);

  const nextActions = [
    {
      title: remainingBalance > 0 ? "Pay remaining balance" : "Rent is current",
      detail:
        remainingBalance > 0
          ? `${formatMoney(remainingBalance)} remaining this month`
          : "No balance due for the current month",
      href: "/tenant/payments",
      icon: <CreditCard className="h-4 w-4" />,
    },
    {
      title: pendingMaintenance > 0 ? "Track open repairs" : "No open repairs",
      detail:
        pendingMaintenance > 0
          ? `${pendingMaintenance} request${pendingMaintenance > 1 ? "s" : ""} still active`
          : "Create a request if something needs attention",
      href: "/tenant/maintenance",
      icon: <Wrench className="h-4 w-4" />,
    },
    {
      title: documents.length > 0 ? "Review documents" : "Documents area ready",
      detail:
        documents.length > 0
          ? `${documents.length} shared file${documents.length > 1 ? "s" : ""} available`
          : "Lease files and notices will appear here",
      href: "/tenant/documents",
      icon: <FileText className="h-4 w-4" />,
    },
  ];

  if (checkingAuth || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4f7fb]">
        <div className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-white px-8 py-6 text-slate-700 shadow-xl">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading tenant workspace...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <>
        <div className="flex min-h-screen items-center justify-center bg-[#f4f7fb] p-6">
          <div className="w-full max-w-xl rounded-3xl border border-rose-200 bg-white p-8 shadow-xl">
            <h2 className="text-2xl font-bold text-rose-600">
              Unable to load portal
            </h2>
            <p className="mt-3 text-slate-600">{error}</p>
            <button
              onClick={loadTenantPortal}
              className="mt-6 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        </div>

        <TenantAIWidget />
      </>
    );
  }

  return (
    <>
      {showPasswordModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[28px] border border-slate-200 bg-white p-7 shadow-2xl">
            <div className="mb-6 flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
                <Lock className="h-6 w-6" />
              </div>

              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  Change your password
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  For security, you must change your temporary password before
                  continuing.
                </p>
              </div>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <PasswordInput
                label="New password"
                value={newPassword}
                onChange={setNewPassword}
                placeholder="Minimum 8 characters"
              />

              <PasswordInput
                label="Confirm new password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                placeholder="Confirm new password"
              />

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

      <div className="min-h-screen bg-[#f4f7fb] text-slate-900">
        <div className="flex min-h-screen">
          {mobileMenuOpen && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={() => setMobileMenuOpen(false)}
              />

              <aside className="absolute left-0 top-0 flex h-full w-80 max-w-[85vw] flex-col justify-between bg-gradient-to-b from-[#102a67] via-[#173d8e] to-[#0f1f45] text-white shadow-2xl">
                <TenantSidebarContent
                  initials={initials}
                  fullName={fullName}
                  email={user?.email || user?.tenant?.email || "Tenant"}
                  onLogout={handleLogout}
                  onClose={() => setMobileMenuOpen(false)}
                  mobile
                />
              </aside>
            </div>
          )}

          <aside className="fixed inset-y-0 left-0 z-40 hidden w-80 shrink-0 flex-col justify-between bg-gradient-to-b from-[#102a67] via-[#173d8e] to-[#0f1f45] text-white shadow-2xl lg:flex">
            <TenantSidebarContent
              initials={initials}
              fullName={fullName}
              email={user?.email || user?.tenant?.email || "Tenant"}
              onLogout={handleLogout}
            />
          </aside>

          <main className="min-h-screen flex-1 lg:ml-80">
            <div className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-4 backdrop-blur lg:hidden">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  The House Hub
                </p>
                <p className="text-xs text-slate-500">Tenant Workspace</p>
              </div>

              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="rounded-2xl border border-slate-200 bg-white p-3 text-slate-700 shadow-sm"
              >
                <Menu className="h-5 w-5" />
              </button>
            </div>

            <div className="border-b border-slate-200 bg-white/80 px-6 py-6 backdrop-blur md:px-8">
              <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
                    <Sparkles className="h-4 w-4" />
                    Tenant Experience
                  </div>

                  <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
                    Welcome back, {user?.tenant?.firstName || "Tenant"}
                  </h2>
                  <p className="mt-3 max-w-3xl text-base leading-7 text-slate-500">
                    Manage your home, payments, service requests, and important
                    documents from one modern tenant dashboard.
                  </p>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                    Current Lease
                  </p>
                  <div className="mt-3">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getLeaseBadge(
                        user?.tenant?.leaseStatus || currentLease?.status
                      )}`}
                    >
                      {user?.tenant?.leaseStatus || currentLease?.status || "N/A"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 md:p-8">
              <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-5">
                <KpiCard title="Monthly Rent" value={formatMoney(activeMonthlyRent)} subtitle="Current rental amount" icon={<Wallet className="h-5 w-5" />} accent="blue" />
                <KpiCard title="Paid Amount" value={formatMoney(currentMonthPaidAmount)} subtitle="Approved rent payments" icon={<BadgeCheck className="h-5 w-5" />} accent="emerald" />
                <KpiCard title="Remaining Balance" value={formatMoney(remainingBalance)} subtitle="Amount left to pay" icon={<Wallet className="h-5 w-5" />} accent="amber" />
                <KpiCard title="Open Requests" value={String(pendingMaintenance)} subtitle="Pending maintenance issues" icon={<Wrench className="h-5 w-5" />} accent="amber" />
                <KpiCard title="Available Documents" value={String(documents.length)} subtitle="Files accessible to you" icon={<FileText className="h-5 w-5" />} accent="indigo" />
              </section>

              <section className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-[1.35fr_0.65fr]">
                <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-emerald-700">
                        <TrendingUp className="h-3.5 w-3.5" />
                        Rent health
                      </div>
                      <h3 className="mt-3 text-2xl font-semibold text-slate-900">
                        Payment Progress
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        Six-month view of rent paid against the current monthly rent.
                      </p>
                    </div>

                    <div className="min-w-44 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        This month
                      </p>
                      <p className="mt-2 text-3xl font-bold text-slate-950">
                        {rentProgress}%
                      </p>
                      <div className="mt-3 h-2 rounded-full bg-slate-200">
                        <div
                          className="h-2 rounded-full bg-gradient-to-r from-blue-600 to-emerald-500"
                          style={{ width: `${rentProgress}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={paymentChartData} margin={{ left: 0, right: 8, top: 16, bottom: 0 }}>
                        <defs>
                          <linearGradient id="paidGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#2563eb" stopOpacity={0.32} />
                            <stop offset="95%" stopColor="#2563eb" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} tickFormatter={(value) => `$${Number(value).toLocaleString()}`} width={64} />
                        <Tooltip
                          formatter={(value, name) => [
                            formatMoney(Number(value || 0)),
                            String(name) === "paid" ? "Paid" : "Expected rent",
                          ]}
                          labelClassName="font-semibold text-slate-900"
                          contentStyle={{
                            borderRadius: 16,
                            border: "1px solid #e2e8f0",
                            boxShadow: "0 16px 40px rgba(15, 23, 42, 0.12)",
                          }}
                        />
                        <Area type="monotone" dataKey="rent" stroke="#94a3b8" strokeDasharray="5 5" fill="transparent" strokeWidth={2} />
                        <Area type="monotone" dataKey="paid" stroke="#2563eb" fill="url(#paidGradient)" strokeWidth={3} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="grid gap-6">
                  <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-slate-950 text-white shadow-sm">
                    <div className="relative p-6">
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.45),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.28),transparent_35%)]" />
                      <div className="relative">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
                          <Bot className="h-6 w-6" />
                        </div>
                        <h3 className="mt-5 text-2xl font-semibold">
                          Tenant AI Chat
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-blue-100/75">
                          Ask about payments, lease dates, documents, or describe a maintenance issue in plain language.
                        </p>

                        <div className="mt-5 grid gap-2 text-sm text-blue-50/90">
                          <ChatPrompt text="What is my remaining rent balance?" />
                          <ChatPrompt text="Help me report a maintenance issue." />
                          <ChatPrompt text="Where are my lease documents?" />
                        </div>

                        <Link
                          href="/tenant/chatbot"
                          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-blue-50"
                        >
                          Open Chat
                          <Send className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                    <h3 className="text-xl font-semibold text-slate-900">
                      Monthly Action Plan
                    </h3>
                    <div className="mt-5 space-y-3">
                      {nextActions.map((action) => (
                        <Link
                          key={action.title}
                          href={action.href}
                          className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-blue-200 hover:bg-blue-50"
                        >
                          <span className="mt-0.5 rounded-xl bg-white p-2 text-blue-600">
                            {action.icon}
                          </span>
                          <span>
                            <span className="block text-sm font-semibold text-slate-900">
                              {action.title}
                            </span>
                            <span className="mt-1 block text-xs leading-5 text-slate-500">
                              {action.detail}
                            </span>
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <MiniMetric
                      label="Paid Records"
                      value={String(paidPaymentCount)}
                      detail="Confirmed payments"
                    />
                    <MiniMetric
                      label="Resolved Repairs"
                      value={String(resolvedMaintenanceCount)}
                      detail="Closed service items"
                    />
                  </div>
                </div>
              </section>

              <section className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-3">
                <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">
                  <h3 className="text-2xl font-semibold text-slate-900">
                    Your Home & Lease Summary
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    A clear overview of your property and lease details.
                  </p>

                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    <InfoCard icon={<Building2 className="h-5 w-5" />} label="Property" value={user?.tenant?.property?.name || user?.tenant?.property?.code || "Not assigned"} />
                    <InfoCard icon={<MapPin className="h-5 w-5" />} label="Address" value={[user?.tenant?.property?.addressLine1, user?.tenant?.property?.city, user?.tenant?.property?.state, user?.tenant?.property?.postalCode].filter(Boolean).join(", ") || "No address available"} />
                    <InfoCard icon={<CalendarDays className="h-5 w-5" />} label="Lease Period" value={`${formatDate(currentLease?.startDate || user?.tenant?.leaseStartDate)} → ${formatDate(currentLease?.endDate || user?.tenant?.leaseEndDate)}`} />
                    <InfoCard icon={<ShieldCheck className="h-5 w-5" />} label="Occupancy Status" value={user?.tenant?.property?.occupancyStatus || user?.tenant?.unit?.occupancyStatus || "N/A"} />
                    <InfoCard icon={<Layers3 className="h-5 w-5" />} label="Floor / Beds / Baths" value={`Floor ${user?.tenant?.property?.floor ?? user?.tenant?.unit?.floor ?? "—"} • ${user?.tenant?.property?.bedrooms ?? user?.tenant?.unit?.bedrooms ?? "—"} bed • ${user?.tenant?.property?.bathrooms ?? user?.tenant?.unit?.bathrooms ?? "—"} bath`} />
                    <InfoCard icon={<ClipboardCheck className="h-5 w-5" />} label="Last Payment" value={latestPayment ? `${formatMoney(latestPayment.amount)} • ${formatDate(latestPayment.paymentDate)}` : "No payment yet"} />
                    <InfoCard icon={<TimerReset className="h-5 w-5" />} label="Lease Countdown" value={leaseDaysRemaining === null ? "Not set" : leaseDaysRemaining >= 0 ? `${leaseDaysRemaining} day${leaseDaysRemaining === 1 ? "" : "s"} remaining` : "Lease date passed"} />
                  </div>
                </div>

                <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-2xl font-semibold text-slate-900">
                    Contact Profile
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Your account identity and contact info.
                  </p>

                  <div className="mt-6 space-y-4">
                    <ProfileRow icon={<UserCircle2 className="h-5 w-5 text-slate-400" />} label="Full Name" value={fullName} />
                    <ProfileRow icon={<Mail className="h-5 w-5 text-slate-400" />} label="Email" value={user?.tenant?.email || user?.email || "N/A"} />
                    <ProfileRow icon={<Phone className="h-5 w-5 text-slate-400" />} label="Phone" value={user?.tenant?.phone || "N/A"} />
                  </div>
                </div>
              </section>

              <section className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
                <DashboardList
                  title="Recent Payments"
                  subtitle="Latest recorded transactions on your account."
                  href="/tenant/payments"
                  empty="No payment records found yet."
                >
                  {payments.slice(0, 4).map((payment) => (
                    <div key={payment.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="font-semibold text-slate-900">{formatMoney(payment.amount)}</p>
                          <p className="mt-1 text-sm text-slate-500">{formatDate(payment.paymentDate)} • {payment.paymentMethod}</p>
                        </div>
                        <span className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${getPaymentBadge(payment.status)}`}>
                          {payment.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </DashboardList>

                <DashboardList
                  title="Maintenance Requests"
                  subtitle="Follow the progress of your service requests."
                  href="/tenant/maintenance"
                  empty="No maintenance requests found."
                >
                  {maintenance.slice(0, 4).map((item) => (
                    <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="font-semibold text-slate-900">{item.title}</p>
                          <p className="mt-1 text-sm text-slate-500">{item.category || "GENERAL"} • {formatDate(item.createdAt)}</p>
                        </div>
                        <span className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${getMaintenanceBadge(item.status)}`}>
                          {item.status || "OPEN"}
                        </span>
                      </div>
                    </div>
                  ))}
                </DashboardList>
              </section>

              <section className="mt-8 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-2xl font-semibold text-slate-900">
                      Your Documents
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Access lease documents, notices, and other shared files.
                    </p>
                  </div>

                  <Link href="/tenant/documents" className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700">
                    Open documents
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {documents.length === 0 ? (
                    <div className="md:col-span-2 xl:col-span-3">
                      <EmptyState text="No documents available yet." />
                    </div>
                  ) : (
                    documents.slice(0, 6).map((doc) => (
                      <div key={doc.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-5 transition hover:-translate-y-0.5 hover:shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-slate-900">{doc.documentName}</p>
                            <p className="mt-1 text-sm text-slate-500">{doc.type}</p>
                          </div>

                          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                            {formatDate(doc.createdAt)}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>
          </main>
        </div>
      </div>

      <TenantAIWidget />
    </>
  );
}

function PasswordInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </label>
      <input
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
        placeholder={placeholder}
      />
    </div>
  );
}

function TenantSidebarContent({
  initials,
  fullName,
  email,
  onLogout,
  onClose,
  mobile = false,
}: {
  initials: string;
  fullName: string;
  email: string;
  onLogout: () => void;
  onClose?: () => void;
  mobile?: boolean;
}) {
  return (
    <>
      <div>
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">The House Hub</h1>
            <p className="mt-1 text-sm text-blue-100/70">
              Premium Tenant Workspace
            </p>
          </div>

          {mobile && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl bg-white/10 p-2 text-white hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        <div className="px-5 py-5">
          <div className="rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/15 text-lg font-bold text-white">
                {initials}
              </div>
              <div>
                <p className="text-base font-semibold">{fullName}</p>
                <p className="text-sm text-blue-100/70">{email}</p>
              </div>
            </div>
          </div>
        </div>

        <nav className="px-4 pb-6">
          <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-widest text-blue-200/50">
            Tenant Menu
          </p>

          <div className="space-y-2" onClick={onClose}>
            <SidebarItem label="Overview" icon={<Home size={18} />} active href="/tenant" />
            <SidebarItem label="Payments" icon={<CreditCard size={18} />} href="/tenant/payments" />
            <SidebarItem label="Maintenance" icon={<Wrench size={18} />} href="/tenant/maintenance" />
            <SidebarItem label="Documents" icon={<FileText size={18} />} href="/tenant/documents" />
            <SidebarItem label="AI Assistant" icon={<Sparkles size={18} />} href="/tenant/chatbot" />
            <TenantNav label="Contact Landlord" href="/tenant/contact" icon={<MessageCircle size={18} />} />
            <SidebarItem label="Notifications" icon={<Bell size={18} />} href="/tenant/notifications" />
            <TenantNav label="Settings" href="/tenant/settings" icon={<Settings size={18} />} />
          </div>
        </nav>
      </div>

      <div className="border-t border-white/10 px-6 py-6">
        <button
          onClick={onLogout}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200/20 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-100 transition hover:bg-red-500/20"
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </>
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

function TenantNav({
  label,
  href,
  icon,
  active = false,
}: {
  label: string;
  href: string;
  icon: ReactNode;
  active?: boolean;
}) {
  return (
    <Link href={href}>
      <div
        className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${
          active
            ? "bg-white/15 text-white"
            : "text-blue-100/80 hover:bg-white/10 hover:text-white"
        }`}
      >
        {icon}
        {label}
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
  icon: ReactNode;
  accent: "blue" | "emerald" | "amber" | "indigo";
}) {
  const accentMap = {
    blue: "from-blue-500 to-blue-600",
    emerald: "from-emerald-500 to-emerald-600",
    amber: "from-amber-500 to-orange-500",
    indigo: "from-indigo-500 to-violet-500",
  };

  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className={`h-2 w-16 rounded-full bg-gradient-to-r ${accentMap[accent]}`} />
        <div className="rounded-2xl bg-slate-50 p-3 text-slate-500">
          {icon}
        </div>
      </div>

      <p className="mt-5 text-sm font-medium text-slate-500">{title}</p>
      <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
        {value}
      </p>
      <p className="mt-3 text-sm text-slate-500">{subtitle}</p>
    </div>
  );
}

function InfoCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-white p-2 text-slate-500">{icon}</div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {label}
          </p>
          <p className="mt-1 text-sm font-medium text-slate-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

function ChatPrompt({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
      {text}
    </div>
  );
}

function MiniMetric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-3 text-3xl font-bold text-slate-950">{value}</p>
      <p className="mt-2 text-xs text-slate-500">{detail}</p>
    </div>
  );
}

function ProfileRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-4">
      {icon}
      <div>
        <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
        <p className="font-medium text-slate-900">{value}</p>
      </div>
    </div>
  );
}

function DashboardList({
  title,
  subtitle,
  href,
  empty,
  children,
}: {
  title: string;
  subtitle: string;
  href: string;
  empty: string;
  children: ReactNode;
}) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children);

  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl font-semibold text-slate-900">{title}</h3>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        </div>

        <Link href={href} className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700">
          View all
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="mt-6 space-y-4">
        {hasChildren ? children : <EmptyState text={empty} />}
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-center text-sm text-slate-500">
      {text}
    </div>
  );
}
