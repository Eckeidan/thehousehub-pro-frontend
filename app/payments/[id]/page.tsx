"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Loader2,
  Eye,
  CalendarDays,
  Building2,
  Home,
  User,
  Wallet,
  FileText,
  ShieldCheck,
  X,
  Download,
  ImageIcon,
  ExternalLink,
} from "lucide-react";

type StoredUser = {
  id?: string;
  fullName?: string;
  name?: string;
  email?: string;
  role?: string;
};

type PaymentDetail = {
  id: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  status: string;
  reference?: string | null;
  notes?: string | null;
  createdAt?: string | null;
  proofImageUrl?: string | null;
  proofFileName?: string | null;
  proofMimeType?: string | null;
  lease?: {
    id: string;
    rentAmount?: number | null;
    monthlyRent?: number | null;
    tenant?: {
      id?: string;
      firstName?: string | null;
      lastName?: string | null;
      email?: string | null;
    } | null;
    unit?: {
      id?: string;
      unitCode?: string | null;
      unitName?: string | null;
    } | null;
    property?: {
      id?: string;
      code?: string | null;
      name?: string | null;
    } | null;
  } | null;
};

type NotificationState = {
  open: boolean;
  type: "success" | "error";
  title: string;
  message: string;
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL
    ? `${process.env.NEXT_PUBLIC_API_URL}/api`
    : "http://localhost:4000/api";

const BACKEND_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

function formatCurrency(amount?: number | null) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(amount || 0));
}

function formatDate(dateString?: string | null) {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getStatusClasses(status?: string | null) {
  switch (String(status || "").toUpperCase()) {
    case "PAID":
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "PARTIAL":
      return "bg-amber-100 text-amber-700 border-amber-200";
    case "FAILED":
      return "bg-red-100 text-red-700 border-red-200";
    case "PENDING":
      return "bg-slate-100 text-slate-700 border-slate-200";
    case "REFUNDED":
      return "bg-purple-100 text-purple-700 border-purple-200";
    case "OVERDUE":
      return "bg-rose-100 text-rose-700 border-rose-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

function buildProofUrl(proofImageUrl?: string | null) {
  if (!proofImageUrl) return null;
  if (proofImageUrl.startsWith("http://") || proofImageUrl.startsWith("https://")) {
    return proofImageUrl;
  }
  return `${BACKEND_BASE}${proofImageUrl}`;
}

export default function PaymentDetailPage() {
  const router = useRouter();
  const params = useParams();

  const paymentId =
    typeof params?.id === "string"
      ? params.id
      : Array.isArray(params?.id)
      ? params.id[0]
      : "";

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [user, setUser] = useState<StoredUser | null>(null);
  const [payment, setPayment] = useState<PaymentDetail | null>(null);

  const [notification, setNotification] = useState<NotificationState>({
    open: false,
    type: "success",
    title: "",
    message: "",
  });

  const normalizedRole = String(user?.role || "").trim().toUpperCase();
  const canApprove = normalizedRole === "ADMIN";
  const isOwner = normalizedRole === "OWNER";

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

  function handleUnauthorized() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.replace("/");
  }

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
      console.error("Payment detail auth error:", error);
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

  async function fetchPayment() {
    if (!paymentId) {
      showNotification("error", "Invalid payment", "Payment ID is missing.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const token = localStorage.getItem("token");

      const res = await fetch(`${API_BASE}/payments/${paymentId}`, {
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
        throw new Error(data?.error || "Failed to load payment.");
      }

      setPayment(data);
    } catch (error: any) {
      console.error("Failed to fetch payment:", error);
      showNotification(
        "error",
        "Unable to load payment",
        error?.message || "Failed to load payment."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (checkingAuth || !paymentId) return;
    fetchPayment();
  }, [checkingAuth, paymentId]);

  async function updatePaymentStatus(nextStatus: "PAID" | "FAILED") {
    if (!payment) return;

    try {
      setActionLoading(true);

      const token = localStorage.getItem("token");

      const res = await fetch(`${API_BASE}/payments/${payment.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token || ""}`,
        },
        body: JSON.stringify({
          status: nextStatus,
        }),
      });

      if (res.status === 401) {
        handleUnauthorized();
        return;
      }

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "Failed to update payment status.");
      }

      setPayment(data);

      showNotification(
        "success",
        nextStatus === "PAID" ? "Payment approved" : "Payment marked failed",
        nextStatus === "PAID"
          ? "The payment was approved successfully."
          : "The payment was marked as failed."
      );
    } catch (error: any) {
      console.error("Failed to update payment:", error);
      showNotification(
        "error",
        "Unable to update payment",
        error?.message || "Failed to update payment."
      );
    } finally {
      setActionLoading(false);
    }
  }

  const leaseRent = useMemo(() => {
    return Number(payment?.lease?.rentAmount || payment?.lease?.monthlyRent || 0);
  }, [payment]);

  const proofUrl = buildProofUrl(payment?.proofImageUrl);

  const proofMime = String(payment?.proofMimeType || "").toLowerCase();
  const isProofImage = proofMime.startsWith("image/");
  const isProofPdf = proofMime === "application/pdf";

  if (checkingAuth || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-white px-8 py-6 shadow-xl text-slate-700">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading payment detail...
        </div>
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 md:p-8">
        <div className="mx-auto max-w-3xl rounded-[28px] border border-slate-200 bg-white p-8 shadow-sm">
          <Link
            href="/payments"
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Payments
          </Link>

          <h1 className="mt-6 text-3xl font-bold text-slate-900">
            Payment not found
          </h1>
          <p className="mt-3 text-slate-600">
            The requested payment could not be loaded or no longer exists.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8">
      {notification.open && (
        <div className="fixed right-6 top-6 z-[120] w-full max-w-md">
          <div
            className={`overflow-hidden rounded-3xl border bg-white shadow-2xl ${
              notification.type === "success"
                ? "border-emerald-200"
                : "border-red-200"
            }`}
          >
            <div className="flex items-start gap-3 p-5">
              <div
                className={`mt-0.5 rounded-full p-2 ${
                  notification.type === "success"
                    ? "bg-emerald-100 text-emerald-600"
                    : "bg-red-100 text-red-600"
                }`}
              >
                {notification.type === "success" ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <AlertCircle className="h-5 w-5" />
                )}
              </div>

              <div className="flex-1">
                <p
                  className={`text-sm font-semibold ${
                    notification.type === "success"
                      ? "text-emerald-700"
                      : "text-red-700"
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

      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <Link
              href="/payments"
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Payments
            </Link>

            <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-900">
              Payment Detail
            </h1>
            <p className="mt-2 text-slate-500">
              Review and validate tenant payment activity.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {canApprove && payment.status === "PENDING" && (
              <>
                <button
                  onClick={() => updatePaymentStatus("PAID")}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Approve Payment
                </button>

                <button
                  onClick={() => updatePaymentStatus("FAILED")}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-2 rounded-2xl bg-red-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-60"
                >
                  <XCircle className="h-4 w-4" />
                  Mark Failed
                </button>
              </>
            )}

            {isOwner && (
              <div className="inline-flex items-center rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">
                Read-only mode
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2 space-y-6">
            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-sm text-slate-500">Amount</p>
                  <h2 className="mt-2 text-4xl font-bold text-slate-900">
                    {formatCurrency(payment.amount)}
                  </h2>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <span
                      className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold ${getStatusClasses(
                        payment.status
                      )}`}
                    >
                      {payment.status || "-"}
                    </span>

                    <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
                      {payment.paymentMethod || "-"}
                    </span>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  Payment ID:{" "}
                  <span className="font-semibold text-slate-900">
                    {payment.id}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <DetailCard
                icon={<User className="h-5 w-5" />}
                label="Tenant"
                value={
                  payment.lease?.tenant
                    ? `${payment.lease.tenant.firstName || ""} ${
                        payment.lease.tenant.lastName || ""
                      }`.trim()
                    : "No tenant"
                }
              />
              <DetailCard
                icon={<CalendarDays className="h-5 w-5" />}
                label="Payment Date"
                value={formatDate(payment.paymentDate)}
              />
              <DetailCard
                icon={<Building2 className="h-5 w-5" />}
                label="Property"
                value={
                  payment.lease?.property?.code ||
                  payment.lease?.property?.name ||
                  "-"
                }
              />
              <DetailCard
                icon={<Home className="h-5 w-5" />}
                label="Unit"
                value={
                  payment.lease?.unit?.unitCode ||
                  payment.lease?.unit?.unitName ||
                  "-"
                }
              />
              <DetailCard
                icon={<Wallet className="h-5 w-5" />}
                label="Lease Rent"
                value={formatCurrency(leaseRent)}
              />
              <DetailCard
                icon={<FileText className="h-5 w-5" />}
                label="Reference"
                value={payment.reference || "-"}
              />
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-xl font-semibold text-slate-900">Notes</h3>
              <p className="mt-4 whitespace-pre-line break-words text-sm leading-7 text-slate-600">
                {payment.notes || "No notes provided."}
              </p>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-xl font-semibold text-slate-900">
                Proof of Payment
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                Uploaded receipt, transfer slip, or payment evidence.
              </p>

              {proofUrl ? (
                <div className="mt-6 space-y-4">
                  <div className="flex flex-wrap gap-3">
                    <a
                      href={proofUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Open Proof
                    </a>

                    <a
                      href={proofUrl}
                      download={payment.proofFileName || undefined}
                      className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </a>
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">
                      File:{" "}
                      <span className="font-semibold text-slate-900">
                        {payment.proofFileName || "Uploaded proof"}
                      </span>
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Type:{" "}
                      <span className="font-semibold text-slate-900">
                        {payment.proofMimeType || "-"}
                      </span>
                    </p>
                  </div>

                  {isProofImage ? (
                    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
                      <img
                        src={proofUrl}
                        alt="Payment proof"
                        className="max-h-[520px] w-full object-contain bg-slate-50"
                      />
                    </div>
                  ) : isProofPdf ? (
                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                      <div className="flex items-center gap-3 text-slate-700">
                        <FileText className="h-6 w-6" />
                        <div>
                          <p className="font-semibold text-slate-900">
                            PDF proof uploaded
                          </p>
                          <p className="text-sm text-slate-500">
                            Use Open Proof to review the document.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                      <div className="flex items-center gap-3 text-slate-700">
                        <ImageIcon className="h-6 w-6" />
                        <div>
                          <p className="font-semibold text-slate-900">
                            Proof file uploaded
                          </p>
                          <p className="text-sm text-slate-500">
                            Use Open Proof to review the file.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-center text-sm text-slate-500">
                  No proof of payment uploaded.
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-xl font-semibold text-slate-900">
                Payment Status
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                Review the current payment lifecycle.
              </p>

              <div className="mt-6 space-y-4">
                <StatusRow label="Current Status" value={payment.status || "-"} />
                <StatusRow label="Method" value={payment.paymentMethod || "-"} />
                <StatusRow label="Created" value={formatDate(payment.createdAt)} />
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-xl font-semibold text-slate-900">
                Admin Actions
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                Approve or reject tenant-submitted payments.
              </p>

              <div className="mt-6 space-y-3">
                {canApprove ? (
                  payment.status === "PENDING" ? (
                    <>
                      <button
                        onClick={() => updatePaymentStatus("PAID")}
                        disabled={actionLoading}
                        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Approve Payment
                      </button>

                      <button
                        onClick={() => updatePaymentStatus("FAILED")}
                        disabled={actionLoading}
                        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
                      >
                        <XCircle className="h-4 w-4" />
                        Mark Failed
                      </button>
                    </>
                  ) : (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                      This payment is already processed.
                    </div>
                  )
                ) : (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-700">
                    Only Admin can approve or reject payments.
                  </div>
                )}

                <Link
                  href="/payments"
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  <Eye className="h-4 w-4" />
                  Back to list
                </Link>
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Validation workflow
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Tenant-initiated payments should remain pending until an
                    admin confirms receipt. Once approved, the status becomes
                    PAID.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="rounded-2xl bg-slate-100 p-3 text-slate-600">{icon}</div>
        <div className="min-w-0">
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-2 break-words text-base font-semibold text-slate-900">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

function StatusRow({
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