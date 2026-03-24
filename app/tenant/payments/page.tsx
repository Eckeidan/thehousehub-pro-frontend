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
  Search,
  CalendarDays,
  Building2,
  CheckCircle2,
  Clock3,
  AlertTriangle,
  Wallet,
  Receipt,
  Landmark,
  SendHorizonal,
  X,
  Paperclip,
} from "lucide-react";

const BACKEND_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const API_BASE = `${BACKEND_BASE}/api`;

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

type TenantPayment = {
  id: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  status: string;
  reference?: string | null;
  notes?: string | null;
  createdAt?: string;
  proofImageUrl?: string | null;
  proofFileName?: string | null;
  proofMimeType?: string | null;
  lease?: {
    id: string;
    tenant?: {
      id?: string;
      firstName?: string;
      lastName?: string;
    } | null;
    unit?: {
      unitCode?: string;
      unitName?: string | null;
    } | null;
    property?: {
      code?: string;
      name?: string | null;
    } | null;
    rentAmount?: number;
    monthlyRent?: number;
  } | null;
};

type ActiveLeaseSummary = {
  lease: {
    id: string;
    rentAmount?: number | null;
    monthlyRent?: number | null;
    property?: {
      id?: string;
      code?: string | null;
      name?: string | null;
    } | null;
    unit?: {
      id?: string;
      unitCode?: string | null;
      unitName?: string | null;
    } | null;
  } | null;
  monthlyRent: number;
};

type NotificationState = {
  open: boolean;
  type: "success" | "error";
  title: string;
  message: string;
};

function formatDate(value?: string | null) {
  if (!value) return "Not set";
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatCurrency(amount?: number | string | null) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(amount || 0));
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

function getStatusClasses(status?: string | null) {
  switch (String(status || "").toUpperCase()) {
    case "PAID":
      return "bg-emerald-100 text-emerald-700 border border-emerald-200";
    case "PARTIAL":
      return "bg-amber-100 text-amber-700 border border-amber-200";
    case "PENDING":
      return "bg-slate-100 text-slate-700 border border-slate-200";
    case "OVERDUE":
      return "bg-rose-100 text-rose-700 border border-rose-200";
    case "FAILED":
      return "bg-red-100 text-red-700 border border-red-200";
    case "WAIVED":
      return "bg-violet-100 text-violet-700 border border-violet-200";
    default:
      return "bg-slate-100 text-slate-700 border border-slate-200";
  }
}

function getMethodClasses(method?: string | null) {
  switch (String(method || "").toUpperCase()) {
    case "CASH":
      return "bg-emerald-50 text-emerald-700 border border-emerald-200";
    case "BANK_TRANSFER":
      return "bg-blue-50 text-blue-700 border border-blue-200";
    case "MOBILE_MONEY":
      return "bg-cyan-50 text-cyan-700 border border-cyan-200";
    case "CARD":
      return "bg-violet-50 text-violet-700 border border-violet-200";
    case "CHECK":
      return "bg-amber-50 text-amber-700 border border-amber-200";
    default:
      return "bg-slate-50 text-slate-700 border border-slate-200";
  }
}

function isCurrentMonth(dateString?: string | null) {
  if (!dateString) return false;

  const d = new Date(dateString);
  const now = new Date();

  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth()
  );
}

function countsTowardMonthlyTotal(status?: string | null) {
  const normalized = String(status || "").toUpperCase();
  return ["PAID", "PENDING", "PARTIAL"].includes(normalized);
}

export default function TenantPaymentsPage() {
  const router = useRouter();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loading, setLoading] = useState(true);

  const [user, setUser] = useState<AuthUser | null>(null);
  const [payments, setPayments] = useState<TenantPayment[]>([]);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [activeLeaseSummary, setActiveLeaseSummary] =
    useState<ActiveLeaseSummary | null>(null);

  const [notification, setNotification] = useState<NotificationState>({
    open: false,
    type: "success",
    title: "",
    message: "",
  });

  const [paying, setPaying] = useState(false);
  const [proofFile, setProofFile] = useState<File | null>(null);

  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    paymentMethod: "BANK_TRANSFER",
    reference: "",
    notes: "",
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
    if (!notification.open) return;

    const timer = setTimeout(() => {
      setNotification((prev) => ({ ...prev, open: false }));
    }, 4000);

    return () => clearTimeout(timer);
  }, [notification.open]);

  useEffect(() => {
    if (!checkingAuth) {
      loadPaymentsData();
    }
  }, [checkingAuth]);

  async function loadPaymentsData() {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("token");

      const meRes = await fetch(`${API_BASE}/auth/me`, {
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

      const [paymentsRes, summaryRes] = await Promise.all([
        fetch(`${API_BASE}/payments`, {
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${token || ""}`,
          },
        }),
        fetch(`${API_BASE}/payments/tenant-summary`, {
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${token || ""}`,
          },
        }),
      ]);

      const summaryData = await summaryRes.json().catch(() => null);
      if (!summaryRes.ok) {
        throw new Error(summaryData?.error || "Failed to load lease summary.");
      }

      setActiveLeaseSummary(summaryData);

      const paymentsData = await paymentsRes.json().catch(() => []);
      const tenantId = currentUser?.tenant?.id || currentUser?.tenantId;

      const visiblePayments = Array.isArray(paymentsData)
        ? paymentsData.filter((payment: TenantPayment) => {
            return payment?.lease?.tenant?.id === tenantId;
          })
        : [];

      setPayments(visiblePayments);
    } catch (err: any) {
      console.error("Tenant payments load error:", err);
      setError(err?.message || "Failed to load payments.");
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.replace("/");
  }

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

  async function handleInitiatePayment(e: React.FormEvent) {
    e.preventDefault();

    const amount = Number(paymentForm.amount || 0);

    if (!amount || amount <= 0) {
      showNotification(
        "error",
        "Invalid amount",
        "Enter a valid payment amount."
      );
      return;
    }

    if (currentLeaseRent <= 0) {
      showNotification(
        "error",
        "Missing monthly rent",
        "No monthly rent found for your current lease."
      );
      return;
    }

    if (amount > currentMonthRemaining) {
      showNotification(
        "error",
        "Amount too high",
        `You cannot pay more than the remaining balance for this month (${formatCurrency(
          currentMonthRemaining
        )}).`
      );
      return;
    }

    try {
      setPaying(true);

      const token = localStorage.getItem("token");

      const formData = new FormData();
      formData.append("amount", String(amount));
      formData.append("paymentMethod", paymentForm.paymentMethod);
      formData.append("reference", paymentForm.reference);
      formData.append("notes", paymentForm.notes);

      if (proofFile) {
        formData.append("proof", proofFile);
      }

      const res = await fetch(`${API_BASE}/payments/tenant-initiate`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token || ""}`,
        },
        body: formData,
      });

      const data = await res.json().catch(() => null);

      if (res.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        router.replace("/");
        return;
      }

      if (!res.ok) {
        throw new Error(data?.error || "Failed to initiate payment.");
      }

      setPaymentForm({
        amount: "",
        paymentMethod: "BANK_TRANSFER",
        reference: "",
        notes: "",
      });
      setProofFile(null);

      await loadPaymentsData();

      showNotification(
        "success",
        "Payment submitted",
        "Your payment request was submitted successfully and is awaiting confirmation."
      );
    } catch (err: any) {
      console.error("Initiate payment error:", err);
      showNotification(
        "error",
        "Payment failed",
        err?.message || "Unable to submit payment."
      );
    } finally {
      setPaying(false);
    }
  }

  const filteredPayments = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return payments;

    return payments.filter((payment) => {
      const propertyCode = payment.lease?.property?.code?.toLowerCase() || "";
      const propertyName = payment.lease?.property?.name?.toLowerCase() || "";
      const unitCode = payment.lease?.unit?.unitCode?.toLowerCase() || "";
      const unitName = payment.lease?.unit?.unitName?.toLowerCase() || "";
      const method = payment.paymentMethod?.toLowerCase() || "";
      const status = payment.status?.toLowerCase() || "";
      const reference = payment.reference?.toLowerCase() || "";

      return (
        propertyCode.includes(q) ||
        propertyName.includes(q) ||
        unitCode.includes(q) ||
        unitName.includes(q) ||
        method.includes(q) ||
        status.includes(q) ||
        reference.includes(q)
      );
    });
  }, [payments, search]);

  const fullName =
    user?.fullName ||
    user?.name ||
    `${user?.tenant?.firstName || ""} ${user?.tenant?.lastName || ""}`.trim() ||
    "Tenant";

  const initials = getInitials(fullName);

  const totalPayments = payments.length;

  const totalConfirmedPaid = payments
    .filter((payment) => String(payment.status || "").toUpperCase() === "PAID")
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

  const totalCommittedAmount = payments
    .filter((payment) => countsTowardMonthlyTotal(payment.status))
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

  const pendingCount = payments.filter((payment) =>
    ["PENDING", "PARTIAL"].includes(String(payment.status || "").toUpperCase())
  ).length;

  const overdueCount = payments.filter((payment) =>
    ["OVERDUE", "FAILED"].includes(String(payment.status || "").toUpperCase())
  ).length;

  const latestPayment = payments.length > 0 ? payments[0] : null;
  const currentLeaseRent = Number(activeLeaseSummary?.monthlyRent || 0);

  const currentMonthCommitted = payments
    .filter(
      (payment) =>
        isCurrentMonth(payment.paymentDate) &&
        countsTowardMonthlyTotal(payment.status)
    )
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

  const currentMonthRemaining = Math.max(
    currentLeaseRent - currentMonthCommitted,
    0
  );

  const currentMonthStatus =
    currentMonthRemaining <= 0
      ? "PAID"
      : currentMonthCommitted > 0
      ? "PARTIAL"
      : "UNPAID";

  if (checkingAuth || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4f7fb]">
        <div className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-white px-8 py-6 shadow-xl text-slate-700">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading payments...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4f7fb] p-6">
        <div className="w-full max-w-xl rounded-3xl border border-rose-200 bg-white p-8 shadow-xl">
          <h2 className="text-2xl font-bold text-rose-600">
            Unable to load payments
          </h2>
          <p className="mt-3 text-slate-600">{error}</p>
          <button
            onClick={loadPaymentsData}
            className="mt-6 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <style jsx global>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px) translateX(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0) translateX(0);
          }
        }
      `}</style>

      <div className="min-h-screen bg-[#f4f7fb] text-slate-900">
        {notification.open && (
          <div className="fixed right-6 top-6 z-[120] w-full max-w-md animate-[slideIn_.25s_ease-out]">
            <div
              className={`overflow-hidden rounded-3xl border bg-white shadow-2xl ${
                notification.type === "success"
                  ? "border-emerald-200"
                  : "border-rose-200"
              }`}
            >
              <div className="flex items-start gap-3 p-5">
                <div
                  className={`mt-0.5 rounded-full p-2 ${
                    notification.type === "success"
                      ? "bg-emerald-100 text-emerald-600"
                      : "bg-rose-100 text-rose-600"
                  }`}
                >
                  {notification.type === "success" ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <AlertTriangle className="h-5 w-5" />
                  )}
                </div>

                <div className="flex-1">
                  <p
                    className={`text-sm font-semibold ${
                      notification.type === "success"
                        ? "text-emerald-700"
                        : "text-rose-700"
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
                className={`h-1 w-full ${
                  notification.type === "success"
                    ? "bg-emerald-500"
                    : "bg-rose-500"
                }`}
              />
            </div>
          </div>
        )}

        <div className="flex min-h-screen">
          <aside className="hidden w-80 shrink-0 flex-col justify-between bg-gradient-to-b from-[#102a67] via-[#173d8e] to-[#0f1f45] text-white shadow-2xl lg:flex">
            <div>
              <div className="border-b border-white/10 px-8 py-8">
                <h1 className="text-3xl font-bold tracking-tight">
                  The House Hub
                </h1>
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
                  <SidebarItem
                    label="Overview"
                    icon={<Home size={18} />}
                    href="/tenant"
                  />
                  <SidebarItem
                    label="Payments"
                    icon={<CreditCard size={18} />}
                    active
                    href="/tenant/payments"
                  />
                  <SidebarItem
                    label="Maintenance"
                    icon={<Wrench size={18} />}
                    href="/tenant/maintenance"
                  />
                  <SidebarItem
                    label="Documents"
                    icon={<FileText size={18} />}
                    href="/tenant/documents"
                  />
                  <SidebarItem
                    label="Notifications"
                    icon={<Bell size={18} />}
                    href="/tenant/notifications"
                  />
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

                  <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
                    <Sparkles className="h-4 w-4" />
                    Payment Center
                  </div>

                  <h2 className="mt-4 text-4xl font-bold tracking-tight text-slate-900">
                    Payments
                  </h2>
                  <p className="mt-3 max-w-3xl text-base leading-7 text-slate-500">
                    Review your rent payments, billing history, payment methods,
                    and transaction status in one secure place.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={loadPaymentsData}
                    className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                  >
                    Refresh
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6 md:p-8">
              <section className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-3">
                <div className="xl:col-span-2 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
                        <CalendarDays className="h-4 w-4" />
                        Current Month Rent
                      </div>

                      <h3 className="mt-4 text-2xl font-semibold text-slate-900">
                        {formatCurrency(currentLeaseRent)}
                      </h3>
                      <p className="mt-2 text-sm text-slate-500">
                        This is the rent expected for the current month.
                      </p>
                    </div>

                    <div
                      className={`inline-flex rounded-full px-4 py-2 text-sm font-semibold ${
                        currentMonthStatus === "PAID"
                          ? "bg-emerald-100 text-emerald-700"
                          : currentMonthStatus === "PARTIAL"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-rose-100 text-rose-700"
                      }`}
                    >
                      {currentMonthStatus}
                    </div>
                  </div>

                  <div className="mt-6 grid gap-4 md:grid-cols-3">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm text-slate-500">Already committed</p>
                      <p className="mt-2 text-2xl font-bold text-slate-900">
                        {formatCurrency(currentMonthCommitted)}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm text-slate-500">Remaining balance</p>
                      <p className="mt-2 text-2xl font-bold text-slate-900">
                        {formatCurrency(currentMonthRemaining)}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm text-slate-500">Payment rule</p>
                      <p className="mt-2 text-sm font-medium leading-6 text-slate-700">
                        You may pay in installments, but never above the monthly
                        rent total.
                      </p>
                    </div>
                  </div>

                  <form
                    onSubmit={handleInitiatePayment}
                    className="mt-6 space-y-5"
                  >
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">
                          Amount to pay now
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          max={currentMonthRemaining}
                          value={paymentForm.amount}
                          onChange={(e) =>
                            setPaymentForm((prev) => ({
                              ...prev,
                              amount: e.target.value,
                            }))
                          }
                          placeholder="Enter amount"
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white"
                        />
                        <p className="mt-2 text-xs text-slate-500">
                          Max allowed now: {formatCurrency(currentMonthRemaining)}
                        </p>
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">
                          Payment method
                        </label>
                        <select
                          value={paymentForm.paymentMethod}
                          onChange={(e) =>
                            setPaymentForm((prev) => ({
                              ...prev,
                              paymentMethod: e.target.value,
                            }))
                          }
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white"
                        >
                          <option value="BANK_TRANSFER">Bank Transfer</option>
                          <option value="CASH">Cash</option>
                          <option value="CARD">Visa / Card</option>
                        </select>
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">
                          Reference
                        </label>
                        <input
                          type="text"
                          value={paymentForm.reference}
                          onChange={(e) =>
                            setPaymentForm((prev) => ({
                              ...prev,
                              reference: e.target.value,
                            }))
                          }
                          placeholder="Transfer ref / cash note / card ref"
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">
                          Notes
                        </label>
                        <input
                          type="text"
                          value={paymentForm.notes}
                          onChange={(e) =>
                            setPaymentForm((prev) => ({
                              ...prev,
                              notes: e.target.value,
                            }))
                          }
                          placeholder="Optional note"
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="mb-2 block text-sm font-semibold text-slate-700">
                          Proof of payment
                        </label>

                        <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 transition hover:border-blue-400 hover:bg-white">
                          <Paperclip className="h-5 w-5 text-slate-500" />
                          <span className="text-sm text-slate-600">
                            {proofFile
                              ? proofFile.name
                              : "Upload receipt, transfer proof, or payment slip"}
                          </span>
                          <input
                            type="file"
                            accept=".jpg,.jpeg,.png,.webp,.pdf"
                            onChange={(e) => {
                              const file = e.target.files?.[0] || null;
                              setProofFile(file);
                            }}
                            className="hidden"
                          />
                        </label>

                        <p className="mt-2 text-xs text-slate-500">
                          Accepted: JPG, PNG, WEBP, PDF
                        </p>

                        {proofFile && (
                          <button
                            type="button"
                            onClick={() => setProofFile(null)}
                            className="mt-2 text-xs font-medium text-rose-600 hover:text-rose-700"
                          >
                            Remove selected proof
                          </button>
                        )}
                      </div>
                    </div>

                    {paymentForm.paymentMethod === "CARD" && (
                      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-800">
                        Card payment can be prepared here, but real Visa charging
                        must go through a payment gateway such as Stripe,
                        Flutterwave, or Paystack.
                      </div>
                    )}

                    <div className="flex flex-wrap gap-3">
                      <button
                        type="submit"
                        disabled={paying || currentMonthRemaining <= 0}
                        className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <SendHorizonal className="h-4 w-4" />
                        {paying ? "Submitting..." : "Pay this month"}
                      </button>

                      <div className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                        Remaining after this payment cannot go below $0.00
                      </div>
                    </div>
                  </form>
                </div>

                <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-2xl font-semibold text-slate-900">
                    Monthly Summary
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Status of your current rent cycle.
                  </p>

                  <div className="mt-6 space-y-4">
                    <SummaryRow
                      label="Monthly Rent"
                      value={formatCurrency(currentLeaseRent)}
                    />
                    <SummaryRow
                      label="Paid / Reserved"
                      value={formatCurrency(currentMonthCommitted)}
                    />
                    <SummaryRow
                      label="Remaining"
                      value={formatCurrency(currentMonthRemaining)}
                    />
                    <SummaryRow label="Status" value={currentMonthStatus} />
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
                  </div>
                </div>
              </section>

              <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
                <KpiCard
                  title="Total Payments"
                  value={String(totalPayments)}
                  subtitle="Recorded transactions"
                  icon={<Receipt className="h-5 w-5" />}
                  accent="blue"
                />
                <KpiCard
                  title="Committed Total"
                  value={formatCurrency(totalCommittedAmount)}
                  subtitle="Paid + pending + partial"
                  icon={<Wallet className="h-5 w-5" />}
                  accent="emerald"
                />
                <KpiCard
                  title="Pending / Partial"
                  value={String(pendingCount)}
                  subtitle="Awaiting completion"
                  icon={<Clock3 className="h-5 w-5" />}
                  accent="amber"
                />
                <KpiCard
                  title="Overdue / Failed"
                  value={String(overdueCount)}
                  subtitle="Need attention"
                  icon={<AlertTriangle className="h-5 w-5" />}
                  accent="rose"
                />
              </section>

              <section className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-3">
                <div className="xl:col-span-2 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="text-2xl font-semibold text-slate-900">
                        Payment History
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        View all transactions linked to your lease.
                      </p>
                    </div>

                    <div className="relative w-full md:max-w-sm">
                      <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search payments..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white"
                      />
                    </div>
                  </div>

                  <div className="mt-6 space-y-5">
                    {filteredPayments.length === 0 ? (
                      <EmptyState text="No payments found for your account yet." />
                    ) : (
                      filteredPayments.map((payment) => (
                        <div
                          key={payment.id}
                          className="rounded-3xl border border-slate-200 bg-slate-50 p-6 transition hover:border-slate-300 hover:bg-white"
                        >
                          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                            <div className="flex flex-1 gap-4">
                              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-sm">
                                <CreditCard className="h-6 w-6" />
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h4 className="break-words text-xl font-semibold text-slate-900">
                                    {formatCurrency(payment.amount)}
                                  </h4>

                                  <span
                                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(
                                      payment.status
                                    )}`}
                                  >
                                    {payment.status}
                                  </span>

                                  <span
                                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getMethodClasses(
                                      payment.paymentMethod
                                    )}`}
                                  >
                                    {payment.paymentMethod}
                                  </span>
                                </div>

                                <p className="mt-2 text-sm text-slate-500">
                                  {payment.reference
                                    ? `Reference: ${payment.reference}`
                                    : "No reference provided"}
                                </p>

                                <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-4">
                                  <InfoPill
                                    icon={<CalendarDays className="h-4 w-4" />}
                                    text={`Date: ${formatDate(payment.paymentDate)}`}
                                  />
                                  <InfoPill
                                    icon={<Building2 className="h-4 w-4" />}
                                    text={`Property: ${
                                      payment.lease?.property?.code ||
                                      payment.lease?.property?.name ||
                                      "N/A"
                                    }`}
                                  />
                                  <InfoPill
                                    icon={<Home className="h-4 w-4" />}
                                    text={`Unit: ${
                                      payment.lease?.unit?.unitCode ||
                                      payment.lease?.unit?.unitName ||
                                      "N/A"
                                    }`}
                                  />
                                  <InfoPill
                                    icon={<Landmark className="h-4 w-4" />}
                                    text={`Lease rent: ${formatCurrency(
                                      payment.lease?.rentAmount ||
                                        payment.lease?.monthlyRent
                                    )}`}
                                  />
                                </div>

                                {payment.notes ? (
                                  <p className="mt-5 break-words text-sm leading-7 text-slate-600">
                                    {payment.notes}
                                  </p>
                                ) : null}
                              </div>
                            </div>

                            <div className="flex shrink-0 flex-wrap items-center gap-3 xl:flex-col xl:items-end">
                              <div className="inline-flex min-w-[140px] items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 shadow-sm">
                                {String(payment.status || "").toUpperCase() ===
                                "PAID" ? (
                                  <>
                                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                    Completed
                                  </>
                                ) : (
                                  <>
                                    <Clock3 className="h-4 w-4 text-amber-600" />
                                    Processing
                                  </>
                                )}
                              </div>
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
                      Payment Summary
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Overview of your rent payment history.
                    </p>

                    <div className="mt-6 space-y-4">
                      <SummaryRow label="Tenant" value={fullName} />
                      <SummaryRow
                        label="Property"
                        value={
                          activeLeaseSummary?.lease?.property?.name ||
                          activeLeaseSummary?.lease?.property?.code ||
                          user?.tenant?.property?.name ||
                          user?.tenant?.property?.code ||
                          "N/A"
                        }
                      />
                      <SummaryRow
                        label="Unit"
                        value={
                          activeLeaseSummary?.lease?.unit?.unitCode ||
                          activeLeaseSummary?.lease?.unit?.unitName ||
                          user?.tenant?.unit?.unitCode ||
                          user?.tenant?.unit?.unitName ||
                          "N/A"
                        }
                      />
                      <SummaryRow
                        label="Total Payments"
                        value={String(totalPayments)}
                      />
                      <SummaryRow
                        label="Committed Amount"
                        value={formatCurrency(totalCommittedAmount)}
                      />
                      <SummaryRow
                        label="Confirmed Paid"
                        value={formatCurrency(totalConfirmedPaid)}
                      />
                      <SummaryRow
                        label="Pending Items"
                        value={String(pendingCount)}
                      />
                    </div>
                  </div>

                  <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                    <h3 className="text-2xl font-semibold text-slate-900">
                      Latest Payment
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Most recent recorded transaction.
                    </p>

                    {latestPayment ? (
                      <div className="mt-6 rounded-3xl bg-gradient-to-r from-emerald-600 to-teal-600 p-5 text-white">
                        <p className="text-sm text-emerald-100">Amount</p>
                        <p className="mt-1 text-2xl font-bold">
                          {formatCurrency(latestPayment.amount)}
                        </p>

                        <div className="mt-5 space-y-2 text-sm text-emerald-100">
                          <p>Status: {latestPayment.status}</p>
                          <p>Date: {formatDate(latestPayment.paymentDate)}</p>
                          <p>Method: {latestPayment.paymentMethod}</p>
                          <p>
                            Unit:{" "}
                            {latestPayment.lease?.unit?.unitCode ||
                              latestPayment.lease?.unit?.unitName ||
                              "N/A"}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-6">
                        <EmptyState text="No payment available yet." />
                      </div>
                    )}
                  </div>

                  <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                    <div>
                      <h3 className="text-2xl font-semibold text-slate-900">
                        Continue
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        Navigate to another section.
                      </p>
                    </div>

                    <div className="mt-6 space-y-3">
                      <QuickLink href="/tenant" label="Back to Overview" />
                      <QuickLink
                        href="/tenant/documents"
                        label="Open Documents"
                      />
                      <QuickLink
                        href="/tenant/maintenance"
                        label="Open Maintenance"
                      />
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </main>
        </div>
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
        <div
          className={`h-2 w-16 rounded-full bg-gradient-to-r ${accentMap[accent]}`}
        />
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
      <span className="text-right text-sm font-semibold text-slate-900">
        {value}
      </span>
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
    <div className="flex min-h-[76px] items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
      <span className="mt-0.5 shrink-0 text-slate-400">{icon}</span>
      <span className="min-w-0 break-words whitespace-normal leading-6">
        {text}
      </span>
    </div>
  );
}