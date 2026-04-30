"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CreditCard,
  Building2,
  CalendarDays,
  AlertTriangle,
  Copy,
  CheckCircle2,
  Loader2,
  ArrowLeft,
  Wallet,
  FileText,
  Home,
} from "lucide-react";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type Settings = {
  companyName?: string | null;
  email?: string | null;
  logoUrl?: string | null;
  primaryColor?: string | null;
  supportEmail?: string | null;
  bankName?: string | null;
  bankAccountName?: string | null;
  bankAccountNumber?: string | null;
  paymentInstructions?: string | null;
  rentDueDay?: number | null;
  lateFeeAmount?: number | null;
  currency?: string | null;
};

export default function TenantPaymentsPage() {
  const router = useRouter();

  const [settings, setSettings] = useState<Settings | null>(null);
  const [rentAmount, setRentAmount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        const token = localStorage.getItem("token");
        const rawUser = localStorage.getItem("user");

        if (!token || !rawUser) {
          router.replace("/");
          return;
        }

        const user = JSON.parse(rawUser);
        const role = String(user?.role || "").toLowerCase();

        if (role !== "tenant") {
          router.replace("/dashboard");
          return;
        }

        const [settingsRes, meRes] = await Promise.all([
          fetch(`${API_BASE}/api/settings`, {
            cache: "no-store",
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_BASE}/api/auth/me`, {
            cache: "no-store",
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (settingsRes.status === 401 || meRes.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          router.replace("/");
          return;
        }

        const settingsData = await settingsRes.json().catch(() => null);
        const meData = await meRes.json().catch(() => null);

        if (!settingsRes.ok) {
          throw new Error(settingsData?.error || "Failed to load payment settings");
        }

        setSettings(settingsData);

        const tenant = meData?.user?.tenant;
        const activeLease = tenant?.leases?.[0];

        const rent =
          Number(activeLease?.rentAmount) ||
          Number(activeLease?.monthlyRent) ||
          Number(activeLease?.rent) ||
          Number(tenant?.unit?.rent) ||
          Number(tenant?.unit?.monthlyRent) ||
          0;

        setRentAmount(rent);
      } catch (error) {
        console.error("Tenant payment page error:", error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [router]);

  async function copyText(label: string, value?: string | null) {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopied(label);
    setTimeout(() => setCopied(""), 2000);
  }

  const brandColor = settings?.primaryColor || "#1f3270";
  const currency = settings?.currency || "USD";

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

          <span className="w-fit rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm">
            Tenant Payment Portal
          </span>
        </div>

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
                  Use the payment details below to send your rent. Always include
                  your name, property, and unit number in the payment reference.
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
            <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
              <div className="mb-6 flex items-center gap-3">
                <div className="rounded-2xl bg-blue-100 p-3 text-blue-600">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Payment Details
                  </h2>
                  <p className="text-sm text-slate-500">
                    Use these details to complete your rent payment.
                  </p>
                </div>
              </div>

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
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-600">
                  <FileText className="h-5 w-5" />
                </div>
                <h2 className="text-xl font-bold text-slate-900">
                  Payment Instructions
                </h2>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-7 text-slate-700">
                {settings?.paymentInstructions ||
                  "Payment instructions have not been configured yet. Please contact your property manager."}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="rounded-2xl bg-green-100 p-3 text-green-600">
                  <Home className="h-5 w-5" />
                </div>
                <h2 className="text-xl font-bold text-slate-900">
                  Monthly Rent
                </h2>
              </div>

              <div className="rounded-3xl bg-green-50 p-5 text-center">
                <p className="text-sm font-semibold uppercase tracking-wide text-green-600">
                  Amount due
                </p>
                <p className="mt-3 text-4xl font-black text-green-800">
                  {currency} {rentAmount.toFixed(0)}
                </p>
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="rounded-2xl bg-amber-100 p-3 text-amber-600">
                  <CalendarDays className="h-5 w-5" />
                </div>
                <h2 className="text-xl font-bold text-slate-900">Due Date</h2>
              </div>

              <div className="rounded-3xl bg-slate-50 p-5 text-center">
                <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Rent due every month
                </p>
                <p className="mt-3 text-5xl font-black text-slate-900">
                  {settings?.rentDueDay || 1}
                </p>
                <p className="mt-2 text-sm text-slate-500">Day of the month</p>
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="rounded-2xl bg-red-100 p-3 text-red-600">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <h2 className="text-xl font-bold text-slate-900">Late Fee</h2>
              </div>

              <div className="rounded-3xl bg-red-50 p-5 text-center">
                <p className="text-sm font-semibold uppercase tracking-wide text-red-500">
                  Late payment fee
                </p>
                <p className="mt-3 text-4xl font-black text-red-700">
                  {currency} {Number(settings?.lateFeeAmount || 0).toFixed(0)}
                </p>
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="rounded-2xl bg-indigo-100 p-3 text-indigo-600">
                  <CreditCard className="h-5 w-5" />
                </div>
                <h2 className="text-xl font-bold text-slate-900">Support</h2>
              </div>

              <p className="text-sm leading-7 text-slate-600">
                Questions about your payment? Contact:
              </p>

              <p className="mt-3 break-all rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800">
                {settings?.supportEmail || settings?.email || "Not configured"}
              </p>
            </div>
          </div>
        </div>
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
          className="shrink-0 rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-100"
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