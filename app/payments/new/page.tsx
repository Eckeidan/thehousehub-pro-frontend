"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  Building2,
  Users,
  Wallet,
  FileText,
  Brain,
  Settings,
  Plus,
  ArrowLeft,
  Wrench,
  Home,
  X,
  AlertCircle,
  CheckCircle2,
  LogOut,
  Loader2,
} from "lucide-react";
import { useRouter } from "next/navigation";

type StoredUser = {
  id?: string;
  fullName?: string;
  name?: string;
  email?: string;
  role?: string;
};

type NotificationState = {
  open: boolean;
  type: "success" | "error";
  title: string;
  message: string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function NewPaymentPage() {
  const router = useRouter();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [user, setUser] = useState<StoredUser | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [notification, setNotification] = useState<NotificationState>({
    open: false,
    type: "error",
    title: "",
    message: "",
  });

  const [form, setForm] = useState({
    amount: "",
    paymentDate: new Date().toISOString().split("T")[0],
    paymentMethod: "CASH",
    status: "PAID",
    reference: "",
    notes: "",
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

      if (role === "owner") {
        router.replace("/payments");
        return;
      }

      setUser(parsedUser);
      setCheckingAuth(false);
    } catch (error) {
      console.error("New payment auth error:", error);
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      router.replace("/");
    }
  }, [router]);

  useEffect(() => {
    if (!notification.open) return;

    const timer = setTimeout(() => {
      setNotification((prev) => ({ ...prev, open: false }));
    }, 5000);

    return () => clearTimeout(timer);
  }, [notification.open]);

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setNotification((prev) => ({ ...prev, open: false }));

    if (!form.amount || !form.paymentDate) {
      showNotification(
        "error",
        "Missing required fields",
        "Amount and payment date are required."
      );
      return;
    }

    try {
      setSubmitting(true);

      const token = localStorage.getItem("token");

      const res = await fetch(`${API_BASE}/api/payments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token || ""}`,
        },
        body: JSON.stringify({
          amount: Number(form.amount),
          paymentDate: form.paymentDate,
          paymentMethod: form.paymentMethod,
          status: form.status,
          reference: form.reference || null,
          notes: form.notes || null,
        }),
      });

      if (res.status === 401) {
        handleUnauthorized();
        return;
      }

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        const rawMessage = data?.error || "Failed to create payment";
        showNotification("error", "Unable to save payment", rawMessage);
        return;
      }

      showNotification(
        "success",
        "Payment saved successfully",
        "The payment has been recorded successfully."
      );

      setTimeout(() => {
        router.push("/payments");
      }, 1200);
    } catch (error: any) {
      console.error("Failed to create payment:", error);
      showNotification(
        "error",
        "Unable to save payment",
        error.message || "Failed to create payment"
      );
    } finally {
      setSubmitting(false);
    }
  }

  const isError = notification.type === "error";

  const initials =
    (user?.fullName || user?.name || "User")
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "US";

  const rawRole = String(user?.role || "").trim().toUpperCase();
  const displayRole = rawRole === "ADMIN" ? "Admin" : "User";

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
    <div className="min-h-screen bg-[#eef2f7]">
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
                className={`h-full w-full origin-left animate-[shrinkBar_5s_linear_forwards] ${
                  isError ? "bg-red-500" : "bg-emerald-500"
                }`}
              />
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

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 lg:flex lg:flex-col bg-gradient-to-b from-blue-950 via-blue-900 to-slate-900 text-white shadow-2xl">
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
              href="/payments"
              active
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
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">
                {user?.fullName || user?.name || "User"}
              </p>
              <p className="truncate text-xs text-blue-100/70">
                {user?.email || displayRole}
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-200 transition hover:bg-red-500/20 hover:text-white"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </aside>

      <main className="min-h-screen px-6 py-8 lg:pl-[352px] lg:pr-10">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8">
            <div className="mb-4">
              <Link
                href="/payments"
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Payments
              </Link>
            </div>

            <h2 className="text-5xl font-bold tracking-tight text-slate-900">
              New Payment
            </h2>
            <p className="mt-3 text-xl text-slate-500">
              Record a payment manually.
            </p>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Amount
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.amount}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, amount: e.target.value }))
                    }
                    placeholder="Enter payment amount"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-[15px] text-slate-700 outline-none transition focus:border-[#1f3270] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Payment Date
                  </label>
                  <input
                    type="date"
                    value={form.paymentDate}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        paymentDate: e.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-[15px] text-slate-700 outline-none transition focus:border-[#1f3270] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Payment Method
                  </label>
                  <select
                    value={form.paymentMethod}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        paymentMethod: e.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-[15px] text-slate-700 outline-none transition focus:border-[#1f3270] focus:bg-white"
                  >
                    <option value="CASH">Cash</option>
                    <option value="MOBILE_MONEY">Mobile Money</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="CARD">Card</option>
                    <option value="CHECK">Check</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Status
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, status: e.target.value }))
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-[15px] text-slate-700 outline-none transition focus:border-[#1f3270] focus:bg-white"
                  >
                    <option value="PAID">Paid</option>
                    <option value="PARTIAL">Partial</option>
                    <option value="PENDING">Pending</option>
                    <option value="FAILED">Failed</option>
                    <option value="REFUNDED">Refunded</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Reference
                  </label>
                  <input
                    type="text"
                    value={form.reference}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        reference: e.target.value,
                      }))
                    }
                    placeholder="Transaction ID or internal reference"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-[15px] text-slate-700 outline-none transition focus:border-[#1f3270] focus:bg-white"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Notes
                  </label>
                  <textarea
                    value={form.notes}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, notes: e.target.value }))
                    }
                    placeholder="Add internal notes for this payment"
                    rows={5}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-[15px] text-slate-700 outline-none transition focus:border-[#1f3270] focus:bg-white"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-2xl bg-[#1f3270] px-6 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-[#19295d] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Plus className="h-4 w-4" />
                  {submitting ? "Saving..." : "Create Payment"}
                </button>

                <Link
                  href="/payments"
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-3 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  Cancel
                </Link>
              </div>
            </form>
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