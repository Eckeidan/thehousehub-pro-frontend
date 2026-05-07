"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  RefreshCw,
  Trash2,
  X,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  Eye,
} from "lucide-react";
import AdminShell from "@/components/AdminShell";

type StoredUser = {
  id?: string;
  fullName?: string;
  name?: string;
  email?: string;
  role?: string;
  organizationId?: string;
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

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

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
    setNotification({ open: true, type, title, message });
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

      const res = await fetch(`${API_BASE}/api/payments`, {
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
        error?.message || "Payments could not be loaded. Please refresh and try again."
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

      const res = await fetch(`${API_BASE}/api/payments/${paymentToDelete.id}`, {
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

      setPayments((prev) => prev.filter((item) => item.id !== paymentToDelete.id));
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
      const tenantName = `${payment.lease?.tenant?.firstName || ""} ${
        payment.lease?.tenant?.lastName || ""
      }`.toLowerCase();

      const unitCode = payment.lease?.unit?.unitCode?.toLowerCase() || "";
      const propertyCode = payment.lease?.property?.code?.toLowerCase() || "";
      const propertyName = payment.lease?.property?.name?.toLowerCase() || "";
      const paymentMethod = payment.paymentMethod?.toLowerCase() || "";
      const status = payment.status?.toLowerCase() || "";
      const reference = payment.reference?.toLowerCase() || "";

      return (
        tenantName.includes(q) ||
        unitCode.includes(q) ||
        propertyCode.includes(q) ||
        propertyName.includes(q) ||
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

  const normalizedRole = String(user?.role || "").trim().toUpperCase();
  const isSuperAdmin = normalizedRole === "OWNER";
  const canEdit = normalizedRole === "ADMIN";

  const isError = notification.type === "error";

  const deleteTenantName = paymentToDelete?.lease?.tenant
    ? `${paymentToDelete.lease.tenant.firstName} ${paymentToDelete.lease.tenant.lastName}`
    : "this tenant";

  const deleteUnitCode = paymentToDelete?.lease?.unit?.unitCode || "this unit";

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-8">
        <div className="rounded-3xl border border-slate-200 bg-white px-8 py-6 text-slate-700 shadow-xl">
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
      activeItem="payments"
      title="Payments"
      subtitle="Track rent collections, transactions, and payment status."
      actions={
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={fetchPayments}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>

          {canEdit && (
            <Link
              href="/payments/new"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Add Payment
            </Link>
          )}
        </div>
      }
    >
      <div className="space-y-6">
        {notification.open && (
          <div className="fixed right-4 top-4 z-[110] w-[calc(100%-2rem)] max-w-md sm:right-6 sm:top-6">
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

        {paymentToDelete && canEdit && (
          <div className="fixed inset-0 z-[105] flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-sm">
            <div className="w-full max-w-2xl rounded-[28px] bg-white p-6 shadow-2xl md:p-8">
              <div className="flex flex-col gap-5 md:flex-row md:items-start">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[22px] bg-red-50 text-red-600 md:h-20 md:w-20">
                  <Trash2 className="h-7 w-7 md:h-8 md:w-8" />
                </div>

                <div className="flex-1">
                  <h3 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
                    Delete Payment
                  </h3>

                  <p className="mt-4 text-sm leading-7 text-slate-500 md:text-lg md:leading-9">
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
                      className="rounded-2xl border border-slate-300 bg-white px-6 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 md:text-base"
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      onClick={confirmDeletePayment}
                      disabled={deletingId === paymentToDelete.id}
                      className="rounded-2xl bg-red-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60 md:text-base"
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

        {isSuperAdmin && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-700">
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

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total Collected"
            value={formatCurrency(totalCollected)}
            subtitle="All registered payments"
            color="blue"
          />
          <StatCard
            title="Paid Transactions"
            value={String(totalPaid)}
            subtitle="Completed payments"
            color="emerald"
          />
          <StatCard
            title="Pending / Partial"
            value={String(totalPending)}
            subtitle="Waiting for completion"
            color="amber"
          />
          <StatCard
            title="Failed"
            value={String(totalFailed)}
            subtitle="Unsuccessful transactions"
            color="red"
          />
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by tenant, unit, property, method, status, or reference..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-4 pl-12 pr-4 text-sm text-slate-700 outline-none transition focus:border-blue-600 focus:bg-white"
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-[1050px]">
              <thead className="bg-slate-50">
                <tr>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Property / Unit</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead align="right">Actions</TableHead>
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
                        <div className="text-sm font-semibold text-slate-900">
                          {payment.lease?.tenant
                            ? `${payment.lease.tenant.firstName} ${payment.lease.tenant.lastName}`
                            : "No tenant"}
                        </div>
                      </td>

                      <td className="px-6 py-5">
                        <div className="text-sm font-semibold text-slate-900">
                          {payment.lease?.property?.code || "-"}
                        </div>
                        <div className="mt-1 text-sm text-slate-500">
                          {payment.lease?.unit?.unitCode || "-"}
                        </div>
                      </td>

                      <td className="px-6 py-5 text-sm font-semibold text-slate-900">
                        {formatCurrency(payment.amount)}
                      </td>

                      <td className="px-6 py-5 text-sm text-slate-600">
                        {formatDate(payment.paymentDate)}
                      </td>

                      <td className="px-6 py-5 text-sm text-slate-600">
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

                      <td className="px-6 py-5 text-sm text-slate-600">
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
    </AdminShell>
  );
}

function TableHead({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      className={`px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  color,
}: {
  title: string;
  value: string;
  subtitle: string;
  color: "blue" | "emerald" | "amber" | "red";
}) {
  const colorMap = {
    blue: "bg-blue-500",
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
    red: "bg-red-500",
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className={`mb-5 h-2 w-20 rounded-full ${colorMap[color]}`} />
      <p className="text-sm text-slate-500">{title}</p>
      <h3 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
        {value}
      </h3>
      <p className="mt-3 text-sm text-slate-400">{subtitle}</p>
    </div>
  );
}