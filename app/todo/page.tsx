"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  ExternalLink,
  FileText,
  Loader2,
  RefreshCw,
  Wrench,
  XCircle,
} from "lucide-react";
import AdminShell from "@/components/AdminShell";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type StoredUser = {
  id?: string;
  fullName?: string;
  name?: string;
  email?: string;
  role?: string;
  organizationId?: string;
};

type PaymentApproval = {
  id: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  status: string;
  reference?: string | null;
  notes?: string | null;
  proofImageUrl?: string | null;
  proofFileName?: string | null;
  createdAt?: string;
  lease?: {
    tenant?: {
      firstName?: string | null;
      lastName?: string | null;
      email?: string | null;
      phone?: string | null;
    } | null;
    property?: {
      name?: string | null;
      code?: string | null;
      addressLine1?: string | null;
      city?: string | null;
      state?: string | null;
    } | null;
  } | null;
};

type MaintenanceTodo = {
  id: string;
  requestNumber: string;
  title: string;
  description?: string | null;
  category: string;
  priority: string;
  status: string;
  createdAt?: string;
  preferredDate?: string | null;
  locationNote?: string | null;
  tenant?: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
  property?: {
    name?: string | null;
    code?: string | null;
    addressLine1?: string | null;
    city?: string | null;
    state?: string | null;
  } | null;
  unit?: {
    unitCode?: string | null;
    unitName?: string | null;
  } | null;
};

function formatMoney(value?: number | string | null) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(value?: string | null) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function proofUrl(value?: string | null) {
  if (!value) return "";
  if (value.startsWith("http")) return value;
  return `${API_BASE}${value}`;
}

function formatLabel(value?: string | null) {
  return value ? value.replaceAll("_", " ") : "N/A";
}

function priorityBadge(priority?: string | null) {
  const normalized = String(priority || "").toUpperCase();

  if (normalized === "URGENT" || normalized === "HIGH") {
    return "bg-rose-100 text-rose-700";
  }

  if (normalized === "MEDIUM") {
    return "bg-blue-100 text-blue-700";
  }

  return "bg-slate-100 text-slate-600";
}

function statusBadge(status?: string | null) {
  const normalized = String(status || "").toUpperCase();

  if (normalized === "OPEN") {
    return "bg-amber-100 text-amber-700";
  }

  if (normalized === "IN_PROGRESS") {
    return "bg-blue-100 text-blue-700";
  }

  return "bg-slate-100 text-slate-600";
}

export default function AdminTodoPage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [user, setUser] = useState<StoredUser | null>(null);
  const [payments, setPayments] = useState<PaymentApproval[]>([]);
  const [maintenanceRequests, setMaintenanceRequests] = useState<MaintenanceTodo[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [successTone, setSuccessTone] = useState<"approved" | "rejected">(
    "approved"
  );

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userRaw = localStorage.getItem("user");

    if (!token || !userRaw) {
      router.replace("/");
      return;
    }

    try {
      const parsedUser: StoredUser = JSON.parse(userRaw);
      const role = String(parsedUser?.role || "").trim().toUpperCase();

      if (role === "TENANT") {
        router.replace("/tenant");
        return;
      }

      setUser(parsedUser);
      setCheckingAuth(false);
    } catch (authError) {
      console.error("To-do auth error:", authError);
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      router.replace("/");
    }
  }, [router]);

  async function loadApprovals() {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("token");
      const [paymentsRes, maintenanceRes] = await Promise.all([
        fetch(`${API_BASE}/api/payments/todos`, {
          cache: "no-store",
          headers: { Authorization: `Bearer ${token || ""}` },
        }),
        fetch(`${API_BASE}/api/maintenance/todos`, {
          cache: "no-store",
          headers: { Authorization: `Bearer ${token || ""}` },
        }),
      ]);

      if (paymentsRes.status === 401 || maintenanceRes.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        router.replace("/");
        return;
      }

      const [paymentsData, maintenanceData] = await Promise.all([
        paymentsRes.json().catch(() => null),
        maintenanceRes.json().catch(() => null),
      ]);

      if (!paymentsRes.ok) {
        throw new Error(paymentsData?.error || "Failed to load payment approvals.");
      }

      if (!maintenanceRes.ok) {
        throw new Error(
          maintenanceData?.error || "Failed to load maintenance approvals."
        );
      }

      setPayments(Array.isArray(paymentsData?.payments) ? paymentsData.payments : []);
      setMaintenanceRequests(
        Array.isArray(maintenanceData?.requests) ? maintenanceData.requests : []
      );
    } catch (err: any) {
      console.error("To-do load error:", err);
      setError(err?.message || "Failed to load approvals.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!checkingAuth) loadApprovals();
  }, [checkingAuth]);

  async function updatePaymentStatus(paymentId: string, status: "PAID" | "FAILED") {
    try {
      setActionId(paymentId);
      setError("");
      setSuccess("");
      setSuccessTone(status === "PAID" ? "approved" : "rejected");

      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/payments/${paymentId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token || ""}`,
        },
        body: JSON.stringify({ status }),
      });

      if (res.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        router.replace("/");
        return;
      }

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "Failed to update payment.");
      }

      setPayments((current) => current.filter((payment) => payment.id !== paymentId));
      setSuccessTone(status === "PAID" ? "approved" : "rejected");
      setSuccess(status === "PAID" ? "Payment approved." : "Payment rejected.");
    } catch (err: any) {
      console.error("Payment approval action error:", err);
      setError(err?.message || "Failed to update payment.");
    } finally {
      setActionId(null);
    }
  }

  const totalPending = payments.length + maintenanceRequests.length;
  const maintenanceCount = maintenanceRequests.length;
  const urgentMaintenanceCount = maintenanceRequests.filter((request) =>
    ["URGENT", "HIGH"].includes(String(request.priority || "").toUpperCase())
  ).length;
  const pendingVolume = useMemo(
    () => payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
    [payments]
  );

  return (
    <AdminShell
      user={user}
      activeItem="todo"
      title="To Do"
      subtitle="Review tenant payment submissions and open maintenance requests."
      actions={
        <button
          type="button"
          onClick={loadApprovals}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      }
    >
      <div className="mx-auto max-w-7xl space-y-6">
        {(error || success) && (
          <div
            className={`rounded-2xl border px-4 py-3 text-sm ${
              error
                ? "border-rose-200 bg-rose-50 text-rose-700"
                : successTone === "rejected"
                ? "border-amber-200 bg-amber-50 text-amber-800"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            {error || success}
          </div>
        )}

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Pending Approvals"
            value={String(totalPending)}
            detail="Payments and maintenance"
            icon={<ClipboardList className="h-5 w-5" />}
          />
          <MetricCard
            label="Pending Volume"
            value={formatMoney(pendingVolume)}
            detail="Awaiting admin validation"
            icon={<CreditCard className="h-5 w-5" />}
          />
          <MetricCard
            label="Open Maintenance"
            value={String(maintenanceCount)}
            detail={
              urgentMaintenanceCount > 0
                ? `${urgentMaintenanceCount} high priority`
                : "Tenant-submitted requests"
            }
            icon={<Wrench className="h-5 w-5" />}
          />
          <MetricCard
            label="Approval Rule"
            value="Manual"
            detail="Tenant proof must be verified"
            icon={<AlertTriangle className="h-5 w-5" />}
          />
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-950 dark:text-white">
                Maintenance Review Queue
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Tenant-submitted issues that need admin follow-up.
              </p>
            </div>
            <Link
              href="/maintenance"
              className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700"
            >
              Open maintenance center
              <ExternalLink className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-5">
            {loading ? (
              <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-5 py-12 text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Loading maintenance requests...
              </div>
            ) : maintenanceRequests.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-12 text-center dark:border-white/10 dark:bg-white/5">
                <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
                <p className="mt-3 text-lg font-bold text-slate-950 dark:text-white">
                  No maintenance follow-up
                </p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  New tenant maintenance submissions will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {maintenanceRequests.map((request) => {
                  const tenantName =
                    `${request.tenant?.firstName || ""} ${
                      request.tenant?.lastName || ""
                    }`.trim() ||
                    request.tenant?.email ||
                    "Tenant";
                  const propertyName =
                    request.property?.name ||
                    request.property?.code ||
                    "Assigned property";
                  const propertyAddress = [
                    request.property?.addressLine1,
                    request.property?.city,
                    request.property?.state,
                  ]
                    .filter(Boolean)
                    .join(", ");
                  const unitLabel =
                    request.unit?.unitCode || request.unit?.unitName || "N/A";

                  return (
                    <article
                      key={request.id}
                      className="rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-slate-900/70"
                    >
                      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_auto]">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-3">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-bold ${statusBadge(
                                request.status
                              )}`}
                            >
                              {formatLabel(request.status)}
                            </span>
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-bold ${priorityBadge(
                                request.priority
                              )}`}
                            >
                              {formatLabel(request.priority)}
                            </span>
                            <span className="text-sm text-slate-500 dark:text-slate-400">
                              Submitted {formatDate(request.createdAt)}
                            </span>
                          </div>

                          <h3 className="mt-4 break-words text-lg font-black text-slate-950 dark:text-white">
                            {request.title}
                          </h3>
                          <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
                            Request #: {request.requestNumber}
                          </p>
                          <p className="mt-3 max-w-4xl whitespace-pre-line break-words text-sm leading-6 text-slate-600 dark:text-slate-300">
                            {request.description || "No description provided."}
                          </p>

                          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                            <InfoBlock label="Tenant" value={tenantName} />
                            <InfoBlock label="Property" value={propertyName} />
                            <InfoBlock label="Category" value={formatLabel(request.category)} />
                            <InfoBlock label="Unit" value={unitLabel} />
                          </div>

                          <div className="mt-4 grid gap-4 md:grid-cols-3">
                            <InfoBlock
                              label="Location"
                              value={request.locationNote || propertyAddress || "N/A"}
                            />
                            <InfoBlock
                              label="Preferred Date"
                              value={formatDate(request.preferredDate)}
                            />
                            <InfoBlock
                              label="Admin Action"
                              value="Review and assign contractor"
                            />
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 xl:w-48">
                          <Link
                            href={`/maintenance/${request.id}`}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-700"
                          >
                            Open Request
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                          <Link
                            href="/maintenance"
                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                          >
                            <Wrench className="h-4 w-4" />
                            Work Queue
                          </Link>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-950 dark:text-white">
                Payment Approval Queue
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Approve only after confirming the bank deposit or uploaded receipt.
              </p>
            </div>
            <Link
              href="/payments"
              className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700"
            >
              Open all payments
              <ExternalLink className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-5">
            {loading ? (
              <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-5 py-12 text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Loading approvals...
              </div>
            ) : payments.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-12 text-center dark:border-white/10 dark:bg-white/5">
                <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
                <p className="mt-3 text-lg font-bold text-slate-950 dark:text-white">
                  Nothing to approve
                </p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  New tenant bank-deposit submissions will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {payments.map((payment) => {
                  const tenantName =
                    `${payment.lease?.tenant?.firstName || ""} ${
                      payment.lease?.tenant?.lastName || ""
                    }`.trim() || "Tenant";
                  const propertyName =
                    payment.lease?.property?.name ||
                    payment.lease?.property?.code ||
                    "Assigned property";
                  const isBusy = actionId === payment.id;
                  const fileUrl = proofUrl(payment.proofImageUrl);

                  return (
                    <article
                      key={payment.id}
                      className="rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-slate-900/70"
                    >
                      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_auto]">
                        <div>
                          <div className="flex flex-wrap items-center gap-3">
                            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">
                              PENDING APPROVAL
                            </span>
                            <span className="text-sm text-slate-500 dark:text-slate-400">
                              Submitted {formatDate(payment.createdAt)}
                            </span>
                          </div>

                          <div className="mt-4 grid gap-4 md:grid-cols-4">
                            <InfoBlock label="Tenant" value={tenantName} />
                            <InfoBlock label="Property" value={propertyName} />
                            <InfoBlock label="Amount" value={formatMoney(payment.amount)} />
                            <InfoBlock label="Method" value={payment.paymentMethod} />
                          </div>

                          <div className="mt-4 grid gap-4 md:grid-cols-3">
                            <InfoBlock label="Payment Date" value={formatDate(payment.paymentDate)} />
                            <InfoBlock label="Reference" value={payment.reference || "N/A"} />
                            <InfoBlock label="Proof" value={payment.proofFileName || "No file name"} />
                          </div>

                          {payment.notes && (
                            <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                              <span className="font-semibold text-slate-900 dark:text-white">
                                Tenant note:
                              </span>{" "}
                              {payment.notes}
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col gap-2 xl:w-44">
                          {fileUrl && (
                            <a
                              href={fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                            >
                              <FileText className="h-4 w-4" />
                              View Proof
                            </a>
                          )}

                          <button
                            type="button"
                            onClick={() => updatePaymentStatus(payment.id, "PAID")}
                            disabled={isBusy}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isBusy ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4" />
                            )}
                            Approve
                          </button>

                          <button
                            type="button"
                            onClick={() => updatePaymentStatus(payment.id, "FAILED")}
                            disabled={isBusy}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <XCircle className="h-4 w-4" />
                            Reject
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </AdminShell>
  );
}

function MetricCard({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {label}
          </p>
          <p className="mt-3 text-3xl font-black text-slate-950 dark:text-white">
            {value}
          </p>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            {detail}
          </p>
        </div>
        <div className="rounded-2xl bg-blue-50 p-3 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300">
          {icon}
        </div>
      </div>
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-semibold text-slate-950 dark:text-white">
        {value}
      </p>
    </div>
  );
}
