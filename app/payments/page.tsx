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
  Plus,
  Search,
  RefreshCw,
  Wrench,
  Home,
  Trash2,
  X,
  AlertCircle,
  CheckCircle2,
  LogOut,
  Loader2,
  ShieldCheck,
  Eye,
} from "lucide-react";

type StoredUser = {
  id?: string;
  fullName?: string;
  name?: string;
  email?: string;
  role?: string;
};

type Payment = {
  id: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  status: string;
  reference?: string | null;
  notes?: string | null;
  lease: {
    id: string;
    tenant?: {
      firstName: string;
      lastName: string;
    } | null;
    unit?: {
      unitCode: string;
      unitName?: string | null;
    } | null;
    property?: {
      code: string;
      name?: string | null;
    } | null;
  };
};

type NotificationState = {
  open: boolean;
  type: "success" | "error";
  title: string;
  message: string;
};

const API_BASE = "http://localhost:4000/api";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount || 0);
}

function formatDate(dateString: string) {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString();
}

function getStatusClasses(status: string) {
  switch (status) {
    case "PAID":
      return "bg-emerald-100 text-emerald-700";
    case "PARTIAL":
      return "bg-amber-100 text-amber-700";
    case "FAILED":
      return "bg-red-100 text-red-700";
    case "PENDING":
      return "bg-slate-100 text-slate-700";
    case "REFUNDED":
      return "bg-purple-100 text-purple-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export default function PaymentsPage() {
  const router = useRouter();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [user, setUser] = useState<StoredUser | null>(null);

  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [paymentToDelete, setPaymentToDelete] = useState<Payment | null>(null);

  const [notification, setNotification] = useState<NotificationState>({
    open: false,
    type: "error",
    title: "",
    message: "",
  });

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
      console.error("Payments auth error:", error);
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      router.replace("/");
    }
  }, [router]);

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

  useEffect(() => {
    if (!notification.open) return;

    const timer = setTimeout(() => {
      setNotification((prev) => ({ ...prev, open: false }));
    }, 4000);

    return () => clearTimeout(timer);
  }, [notification.open]);

  async function fetchPayments() {
    try {
      setLoading(true);

      const token = localStorage.getItem("token");

      const res = await fetch(`${API_BASE}/payments`, {
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${token || ""}`,
        },
      });

      if (res.status === 401) {
        handleUnauthorized();
        return;
      }

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "Failed to fetch payments.");
      }

      setPayments(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error("Failed to fetch payments:", error);
      setPayments([]);
      showNotification(
        "error",
        "Unable to load payments",
        error?.message ||
          "Payments could not be loaded. Please refresh and try again."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (checkingAuth) return;
    fetchPayments();
  }, [checkingAuth]);

  async function confirmDeletePayment() {
    if (!paymentToDelete) return;

    try {
      setDeletingId(paymentToDelete.id);

      const token = localStorage.getItem("token");

      const res = await fetch(`${API_BASE}/payments/${paymentToDelete.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token || ""}`,
        },
      });

      if (res.status === 401) {
        handleUnauthorized();
        return;
      }

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        showNotification(
          "error",
          "Unable to delete payment",
          data?.error || "Failed to delete payment."
        );
        return;
      }

      setPayments((prev) =>
        prev.filter((item) => item.id !== paymentToDelete.id)
      );
      setPaymentToDelete(null);

      showNotification(
        "success",
        "Payment deleted",
        "The payment has been deleted successfully."
      );
    } catch (error: any) {
      console.error("Failed to delete payment:", error);
      showNotification(
        "error",
        "Unable to delete payment",
        error?.message || "Failed to delete payment."
      );
    } finally {
      setDeletingId(null);
    }
  }

  const filteredPayments = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return payments;

    return payments.filter((payment) => {
      const tenantName =
        `${payment.lease?.tenant?.firstName || ""} ${
          payment.lease?.tenant?.lastName || ""
        }`.toLowerCase();
      const unitCode = payment.lease?.unit?.unitCode?.toLowerCase() || "";
      const propertyCode = payment.lease?.property?.code?.toLowerCase() || "";
      const paymentMethod = payment.paymentMethod?.toLowerCase() || "";
      const status = payment.status?.toLowerCase() || "";
      const reference = payment.reference?.toLowerCase() || "";

      return (
        tenantName.includes(q) ||
        unitCode.includes(q) ||
        propertyCode.includes(q) ||
        paymentMethod.includes(q) ||
        status.includes(q) ||
        reference.includes(q)
      );
    });
  }, [payments, search]);

  const totalCollected = useMemo(() => {
    return payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  }, [payments]);

  const totalPaid = useMemo(() => {
    return payments.filter((payment) => payment.status === "PAID").length;
  }, [payments]);

  const totalPending = useMemo(() => {
    return payments.filter(
      (payment) => payment.status === "PENDING" || payment.status === "PARTIAL"
    ).length;
  }, [payments]);

  const totalFailed = useMemo(() => {
    return payments.filter((payment) => payment.status === "FAILED").length;
  }, [payments]);

  const isError = notification.type === "error";

  const deleteTenantName = paymentToDelete?.lease?.tenant
    ? `${paymentToDelete.lease.tenant.firstName} ${paymentToDelete.lease.tenant.lastName}`
    : "this tenant";

  const deleteUnitCode = paymentToDelete?.lease?.unit?.unitCode || "this unit";

  const initials =
    (user?.fullName || user?.name || "User")
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "US";

  const normalizedRole = String(user?.role || "").trim().toUpperCase();
  const isSuperAdmin = normalizedRole === "OWNER";
  const canEdit = normalizedRole === "ADMIN";

  const displayRole =
    normalizedRole === "OWNER"
      ? "Super Admin"
      : normalizedRole === "ADMIN"
      ? "Admin"
      : "User";

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
        <div className="fixed right-6 top-6 z-[110] w-full max-w-md animate-[slideIn_.25s_ease-out]">
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

            <div
              className={`h-1 w-full overflow-hidden rounded-b-3xl ${
                isError ? "bg-red-100" : "bg-emerald-100"
              }`}
            >
              <div
                className={`h-full w-full origin-left animate-[shrinkBar_4s_linear_forwards] ${
                  isError ? "bg-red-500" : "bg-emerald-500"
                }`}
              />
            </div>
          </div>
        </div>
      )}

      {paymentToDelete && canEdit && (
        <div className="fixed inset-0 z-[105] flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-[28px] bg-white p-6 shadow-2xl md:p-8">
            <div className="flex flex-col gap-5 md:flex-row md:items-start">
              <div className="flex h-20 w-20 items-center justify-center rounded-[24px] bg-red-50 text-red-600">
                <Trash2 className="h-8 w-8" />
              </div>

              <div className="flex-1">
                <h3 className="text-3xl font-bold tracking-tight text-slate-900">
                  Delete Payment
                </h3>

                <p className="mt-4 max-w-xl text-lg leading-9 text-slate-500">
                  Are you sure you want to delete the payment for{" "}
                  <span className="font-semibold text-slate-800">
                    {deleteTenantName}
                  </span>{" "}
                  on{" "}
                  <span className="font-semibold text-slate-800">
                    {deleteUnitCode}
                  </span>
                  ? This action cannot be undone.
                </p>

                <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  Amount:{" "}
                  <span className="font-semibold text-slate-900">
                    {formatCurrency(paymentToDelete.amount)}
                  </span>
                </div>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setPaymentToDelete(null)}
                    disabled={deletingId === paymentToDelete.id}
                    className="rounded-2xl border border-slate-300 bg-white px-6 py-3 text-lg font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={confirmDeletePayment}
                    disabled={deletingId === paymentToDelete.id}
                    className="rounded-2xl bg-red-600 px-6 py-3 text-lg font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {deletingId === paymentToDelete.id
                      ? "Deleting..."
                      : "Delete Payment"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-12px) translateX(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0) translateX(0);
          }
        }

        @keyframes shrinkBar {
          from {
            transform: scaleX(1);
          }
          to {
            transform: scaleX(0);
          }
        }
      `}</style>

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
              active
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
                Payments
              </h2>
              <p className="mt-3 text-xl text-slate-500">
                Track rent collections, transactions, and payment status.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={fetchPayments}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>

              {canEdit && (
                <Link
                  href="/payments/new"
                  className="inline-flex items-center gap-2 rounded-2xl bg-[#1f3270] px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-[#19295d]"
                >
                  <Plus className="h-4 w-4" />
                  Add Payment
                </Link>
              )}

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

          {isSuperAdmin && (
            <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-700">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <p className="font-semibold">Read-only Super Admin mode</p>
                  <p className="mt-1">
                    You can review all payments and financial activity, but only
                    Admin can create or delete payment records.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="mb-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[22px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-6 h-3 w-24 rounded-full bg-blue-500" />
              <p className="text-lg text-slate-500">Total Collected</p>
              <h3 className="mt-4 text-4xl font-bold text-slate-900">
                {formatCurrency(totalCollected)}
              </h3>
              <p className="mt-4 text-lg text-slate-400">
                All registered payments
              </p>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-6 h-3 w-24 rounded-full bg-emerald-500" />
              <p className="text-lg text-slate-500">Paid Transactions</p>
              <h3 className="mt-4 text-4xl font-bold text-slate-900">
                {totalPaid}
              </h3>
              <p className="mt-4 text-lg text-slate-400">Completed payments</p>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-6 h-3 w-24 rounded-full bg-amber-500" />
              <p className="text-lg text-slate-500">Pending / Partial</p>
              <h3 className="mt-4 text-4xl font-bold text-slate-900">
                {totalPending}
              </h3>
              <p className="mt-4 text-lg text-slate-400">
                Waiting for completion
              </p>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-6 h-3 w-24 rounded-full bg-red-500" />
              <p className="text-lg text-slate-500">Failed</p>
              <h3 className="mt-4 text-4xl font-bold text-slate-900">
                {totalFailed}
              </h3>
              <p className="mt-4 text-lg text-slate-400">
                Unsuccessful transactions
              </p>
            </div>
          </div>

          <div className="mb-8 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by tenant, unit, property, method, status, or reference..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-4 pl-12 pr-4 text-[15px] text-slate-700 outline-none transition focus:border-[#1f3270] focus:bg-white"
              />
            </div>
          </div>

          <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Tenant
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Property / Unit
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Amount
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Date
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Method
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Reference
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-6 py-14 text-center text-sm text-slate-500"
                      >
                        Loading payments...
                      </td>
                    </tr>
                  ) : filteredPayments.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-6 py-14 text-center text-sm text-slate-500"
                      >
                        No payments found.
                      </td>
                    </tr>
                  ) : (
                    filteredPayments.map((payment) => (
                      <tr
                        key={payment.id}
                        className="border-t border-slate-100 hover:bg-slate-50/80"
                      >
                        <td className="px-6 py-5">
                          <div className="text-[15px] font-semibold text-slate-900">
                            {payment.lease?.tenant
                              ? `${payment.lease.tenant.firstName} ${payment.lease.tenant.lastName}`
                              : "No tenant"}
                          </div>
                        </td>

                        <td className="px-6 py-5">
                          <div className="text-[15px] font-semibold text-slate-900">
                            {payment.lease?.property?.code || "-"}
                          </div>
                          <div className="mt-1 text-sm text-slate-500">
                            {payment.lease?.unit?.unitCode || "-"}
                          </div>
                        </td>

                        <td className="px-6 py-5 text-[15px] font-semibold text-slate-900">
                          {formatCurrency(payment.amount)}
                        </td>

                        <td className="px-6 py-5 text-[15px] text-slate-600">
                          {formatDate(payment.paymentDate)}
                        </td>

                        <td className="px-6 py-5 text-[15px] text-slate-600">
                          {payment.paymentMethod}
                        </td>

                        <td className="px-6 py-5">
                          <span
                            className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold ${getStatusClasses(
                              payment.status
                            )}`}
                          >
                            {payment.status}
                          </span>
                        </td>

                        <td className="px-6 py-5 text-[15px] text-slate-600">
                          {payment.reference || "-"}
                        </td>

                        <td className="px-6 py-5 text-right">
  <div className="flex justify-end gap-2">
    <Link
      href={`/payments/${payment.id}`}
      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
    >
      <Eye className="h-4 w-4" />
      View
    </Link>

    {canEdit ? (
      <button
        type="button"
        onClick={() => setPaymentToDelete(payment)}
        disabled={deletingId === payment.id}
        className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Trash2 className="h-4 w-4" />
        Delete
      </button>
    ) : (
      <span className="inline-flex rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-500">
        Read only
      </span>
    )}
  </div>
</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
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