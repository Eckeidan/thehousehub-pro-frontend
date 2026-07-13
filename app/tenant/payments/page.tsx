"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  Copy,
  CreditCard,
  FileText,
  Home,
  Loader2,
  UploadCloud,
  Wallet,
  X,
} from "lucide-react";
import TenantAIWidget from "@/components/TenantAIWidget";
import {
  formatMoney,
  formatRentDueDay,
  normalizeTenantPaymentSettings,
  type TenantPaymentSettings,
} from "@/lib/paymentSettingsContract";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type Payment = {
  id: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  status: string;
  reference?: string | null;
  notes?: string | null;
  proofImageUrl?: string | null;
  proofFileName?: string | null;
};

export default function TenantPaymentsPage() {
  const router = useRouter();

  const [settings, setSettings] = useState<TenantPaymentSettings | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [rentAmount, setRentAmount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    amount: "",
    paymentMethod: "BANK_TRANSFER",
    reference: "",
    notes: "",
    proof: null as File | null,
  });

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("token");
      const rawUser = localStorage.getItem("user");

      if (!token || !rawUser) {
        router.replace("/");
        return;
      }

      const user = JSON.parse(rawUser);
      if (String(user?.role || "").toLowerCase() !== "tenant") {
        router.replace("/dashboard");
        return;
      }

      const [settingsRes, meRes, paymentsRes] = await Promise.all([
        fetch(`${API_BASE}/api/settings`, {
          cache: "no-store",
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE}/api/auth/me`, {
          cache: "no-store",
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE}/api/payments/tenant-history`, {
          cache: "no-store",
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (
        settingsRes.status === 401 ||
        meRes.status === 401 ||
        paymentsRes.status === 401
      ) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        router.replace("/");
        return;
      }

      const settingsData = await settingsRes.json().catch(() => null);
      const meData = await meRes.json().catch(() => null);
      const paymentsData = await paymentsRes.json().catch(() => []);

      if (!settingsRes.ok) {
        throw new Error(settingsData?.error || "Failed to load settings");
      }

      setSettings(normalizeTenantPaymentSettings(settingsData));
      setPayments(Array.isArray(paymentsData) ? paymentsData : []);

      const tenant = meData?.user?.tenant;
      const activeLease = Array.isArray(tenant?.leases)
        ? tenant.leases.find(
            (lease: any) => String(lease?.status || "").toUpperCase() === "ACTIVE"
          ) || tenant.leases[0]
        : null;

      const rent =
        Number(activeLease?.rentAmount) ||
        Number(tenant?.monthlyRent) ||
        Number(tenant?.property?.monthlyRent) ||
        0;

      setRentAmount(rent);

      setForm((prev) => ({
        ...prev,
        amount: rent ? String(rent) : "",
      }));
    } catch (err: any) {
      console.error("Tenant payments load error:", err);
      setError(err?.message || "Failed to load payment information.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [router]);

  async function copyText(label: string, value?: string | null) {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopied(label);
    setTimeout(() => setCopied(""), 2000);
  }

  async function submitPayment(e: React.FormEvent) {
    e.preventDefault();

    try {
      setSubmitting(true);
      setError("");
      setSuccess("");

      const token = localStorage.getItem("token");

      if (!form.amount || Number(form.amount) <= 0) {
        throw new Error("Please enter a valid amount.");
      }

      const body = new FormData();
      body.append("amount", form.amount);
      body.append("paymentMethod", form.paymentMethod);
      body.append("reference", form.reference);
      body.append("notes", form.notes);

      if (form.proof) {
        body.append("proof", form.proof);
      }

      const res = await fetch(`${API_BASE}/api/payments/tenant-initiate`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token || ""}`,
        },
        body,
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "Failed to submit payment.");
      }

      setSuccess("Payment proof submitted successfully. Waiting for admin approval.");
      setModalOpen(false);
      setForm({
        amount: rentAmount ? String(rentAmount) : "",
        paymentMethod: "BANK_TRANSFER",
        reference: "",
        notes: "",
        proof: null,
      });

      await loadData();
    } catch (err: any) {
      setError(err?.message || "Failed to submit payment.");
    } finally {
      setSubmitting(false);
    }
  }

  const brandColor = settings?.primaryColor || "#1f3270";
  const currency = settings?.currency || "USD";
  const dueDay = Number(settings?.rentDueDay || 1);
  const lateFee = Number(settings?.lateFeeAmount || 0);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
        <div className="flex items-center gap-3 rounded-3xl bg-white px-8 py-6 text-slate-700 shadow-xl">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading payment information...
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="min-h-screen bg-slate-100 px-4 py-6 md:px-6 md:py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/tenant"
            className="inline-flex w-fit items-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>

          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex w-fit items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
          >
            <UploadCloud className="h-4 w-4" />
            I Have Paid
          </button>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {success}
          </div>
        )}

        <div
          className="overflow-hidden rounded-[32px] text-white shadow-2xl"
          style={{ background: `linear-gradient(135deg, ${brandColor}, #0f172a)` }}
        >
          <div className="p-6 md:p-10">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-white/70 md:text-sm">
                  Payment Center
                </p>
                <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">
                  Pay your rent securely
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-white/75">
                  Use the payment details below. After payment, submit your proof
                  so the admin can validate it.
                </p>
              </div>

              {settings?.logoUrl ? (
                <div className="w-fit rounded-3xl bg-white/95 p-4">
                  <img
                    src={settings.logoUrl}
                    alt="Company logo"
                    className="max-h-20 max-w-40 object-contain"
                  />
                </div>
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white/15">
                  <Wallet className="h-9 w-9" />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Card title="Payment Details" icon={<Building2 className="h-5 w-5" />}>
              <div className="grid gap-4 md:grid-cols-2">
                <InfoBox
                  label="Bank / Payment Method"
                  value={settings?.bankName || "Not configured"}
                  onCopy={() => copyText("bankName", settings?.bankName)}
                  copied={copied === "bankName"}
                />

                <InfoBox
                  label="Account Name"
                  value={settings?.bankAccountName || "Not configured"}
                  onCopy={() =>
                    copyText("bankAccountName", settings?.bankAccountName)
                  }
                  copied={copied === "bankAccountName"}
                />

                <InfoBox
                  label="Account / Routing / Zelle / CashApp"
                  value={settings?.bankAccountNumber || "Not configured"}
                  onCopy={() =>
                    copyText("bankAccountNumber", settings?.bankAccountNumber)
                  }
                  copied={copied === "bankAccountNumber"}
                  wide
                />
              </div>
            </Card>

            <Card title="Payment Instructions" icon={<FileText className="h-5 w-5" />}>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-7 text-slate-700">
                {settings?.paymentInstructions ||
                  "Payment instructions have not been configured yet. Please contact your property manager."}
              </div>
              <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-800">
                After making your manual payment, upload proof from this page.
                The payment appears as approved only after management validates it.
              </div>
            </Card>

            <Card title="Payment History" icon={<CreditCard className="h-5 w-5" />}>
              {payments.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                  No payment submitted yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-bold text-slate-900">
                            {formatMoney(Number(payment.amount || 0), currency)}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {new Date(payment.paymentDate).toLocaleDateString()} •{" "}
                            {payment.paymentMethod}
                          </p>
                        </div>

                        <span
                          className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${
                            payment.status === "PAID"
                              ? "bg-emerald-100 text-emerald-700"
                              : payment.status === "PENDING"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {payment.status}
                        </span>
                      </div>

                      {payment.reference && (
                        <p className="mt-3 text-sm text-slate-600">
                          Ref: <span className="font-semibold">{payment.reference}</span>
                        </p>
                      )}

                      {payment.proofImageUrl && (
                        <a
                          href={payment.proofImageUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-3 inline-flex text-sm font-semibold text-blue-600 hover:underline"
                        >
                          View proof
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <div className="space-y-6">
            <SummaryCard
              icon={<Home className="h-5 w-5" />}
              title="Monthly Rent"
              label="Amount due"
              value={formatMoney(rentAmount, currency)}
              color="green"
            />

            <SummaryCard
              icon={<CalendarDays className="h-5 w-5" />}
              title="Due Date"
              label="Rent due every month"
              value={formatRentDueDay(dueDay, "short")}
              sub="Configured by your landlord"
              color="amber"
            />

            <SummaryCard
              icon={<AlertTriangle className="h-5 w-5" />}
              title="Late Fee"
              label="Late payment fee"
              value={formatMoney(lateFee, currency)}
              color="red"
            />

            <Card title="Support" icon={<CreditCard className="h-5 w-5" />}>
              <p className="text-sm leading-7 text-slate-600">
                Questions about your payment? Contact:
              </p>
              <p className="mt-3 break-all rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800">
                {settings?.supportEmail || settings?.email || "Not configured"}
              </p>
            </Card>
          </div>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-[28px] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Submit Payment Proof
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Admin will review and approve your payment.
                </p>
              </div>

              <button
                onClick={() => setModalOpen(false)}
                className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={submitPayment} className="space-y-4 p-5">
              <Input
                label="Amount"
                type="number"
                value={form.amount}
                onChange={(v) => setForm((p) => ({ ...p, amount: v }))}
              />

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Payment Method
                </label>
                <select
                  value={form.paymentMethod}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, paymentMethod: e.target.value }))
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none focus:border-blue-500 focus:bg-white"
                >
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="MOBILE_MONEY">Mobile Money</option>
                  <option value="CARD">Card</option>
                  <option value="CHECK">Check</option>
                  <option value="CASH">Cash</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <Input
                label="Reference"
                value={form.reference}
                onChange={(v) => setForm((p) => ({ ...p, reference: v }))}
                placeholder="Transaction ID, Zelle ref, MoMo ref..."
              />

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Proof Screenshot / Receipt
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      proof: e.target.files?.[0] || null,
                    }))
                  }
                  className="w-full rounded-2xl border border-dashed border-emerald-300 bg-emerald-50 px-4 py-4 text-sm text-slate-700 file:mr-4 file:rounded-xl file:border-0 file:bg-emerald-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:bg-emerald-100"
                />
                <p className="mt-2 text-xs text-slate-500">
                  Accepted files: JPG, PNG, WEBP, PDF. Max size: 10MB.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Notes
                </label>
                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="Optional note..."
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <UploadCloud className="h-4 w-4" />
                    Submit Payment Proof
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>

    <TenantAIWidget />
        </>
  );
}

function Card({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <div className="mb-5 flex items-center gap-3">
        <div className="rounded-2xl bg-blue-100 p-3 text-blue-600">{icon}</div>
        <h2 className="text-xl font-bold text-slate-900">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function SummaryCard({
  icon,
  title,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  label: string;
  value: string;
  sub?: string;
  color: "green" | "amber" | "red";
}) {
  const colors = {
    green: "bg-green-100 text-green-600 bg-green-50 text-green-800",
    amber: "bg-amber-100 text-amber-600 bg-slate-50 text-slate-900",
    red: "bg-red-100 text-red-600 bg-red-50 text-red-700",
  };

  const iconClass =
    color === "green"
      ? "bg-green-100 text-green-600"
      : color === "amber"
      ? "bg-amber-100 text-amber-600"
      : "bg-red-100 text-red-600";

  const boxClass =
    color === "green"
      ? "bg-green-50 text-green-800"
      : color === "amber"
      ? "bg-slate-50 text-slate-900"
      : "bg-red-50 text-red-700";

  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <div className="mb-5 flex items-center gap-3">
        <div className={`rounded-2xl p-3 ${iconClass}`}>{icon}</div>
        <h2 className="text-xl font-bold text-slate-900">{title}</h2>
      </div>

      <div className={`rounded-3xl p-5 text-center ${boxClass}`}>
        <p className="text-sm font-semibold uppercase tracking-wide">{label}</p>
        <p className="mt-3 text-4xl font-black">{value}</p>
        {sub && <p className="mt-2 text-sm opacity-70">{sub}</p>}
      </div>
    </div>
  );
}

function InfoBox({
  label,
  value,
  onCopy,
  copied,
  wide = false,
}: {
  label: string;
  value: string;
  onCopy: () => void;
  copied: boolean;
  wide?: boolean;
}) {
  const isConfigured = value !== "Not configured";

  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-slate-50 p-4 ${
        wide ? "md:col-span-2" : ""
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="break-all text-sm font-bold text-slate-900">{value}</p>

        <button
          type="button"
          onClick={onCopy}
          disabled={!isConfigured}
          className="shrink-0 rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label={`Copy ${label}`}
        >
          {copied ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none focus:border-blue-500 focus:bg-white"
      />
    </div>
  );
}
