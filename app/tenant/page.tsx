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
  UserCircle2,
  MapPin,
  CalendarDays,
  BadgeCheck,
  Wallet,
  Clock3,
  ArrowRight,
  Loader2,
  Building2,
  Phone,
  Mail,
  Sparkles,
  ShieldCheck,
  DoorOpen,
  Layers3,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

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
    phone?: string | null;
    leaseStartDate?: string | null;
    leaseEndDate?: string | null;
    leaseStatus?: string | null;
    property?: {
      id: string;
      name?: string | null;
      code?: string | null;
      addressLine1?: string | null;
      city?: string | null;
      country?: string | null;
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
  lease?: {
    tenant?: {
      firstName?: string;
      lastName?: string;
    } | null;
  } | null;
};

type MaintenanceItem = {
  id: string;
  requestNumber?: string;
  title: string;
  category?: string;
  priority?: string;
  status?: string;
  createdAt?: string;
  tenant?: {
    id?: string;
  } | null;
};

type TenantDocument = {
  id: string;
  documentName: string;
  type: string;
  fileUrl: string;
  createdAt: string;
  accessibleToTenant?: boolean;
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
  switch (status) {
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
  switch (status) {
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
  switch (status) {
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
    if (!checkingAuth) {
      loadTenantPortal();
    }
  }, [checkingAuth]);

  async function loadTenantPortal() {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("token");

      const meRes = await fetch(`${API_URL}/api/auth/me`, {
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

      const tenantId = currentUser?.tenant?.id;
      if (!tenantId) {
        setPayments([]);
        setMaintenance([]);
        setDocuments([]);
        return;
      }

      const [paymentsRes, maintenanceRes, documentsRes] = await Promise.all([
        fetch(`${API_URL}/payments`, { cache: "no-store" }),
        fetch(`${API_URL}/api/maintenance`, { cache: "no-store" }),
        fetch(`${API_URL}/documents`, { cache: "no-store" }),
      ]);

      const paymentsData = await paymentsRes.json().catch(() => []);
      const maintenanceData = await maintenanceRes.json().catch(() => []);
      const documentsData = await documentsRes.json().catch(() => []);

      const tenantPayments = Array.isArray(paymentsData)
        ? paymentsData.filter((item: any) => {
            const fullName = `${currentUser?.tenant?.firstName || ""} ${currentUser?.tenant?.lastName || ""}`.trim();
            const leaseFullName = `${item?.lease?.tenant?.firstName || ""} ${item?.lease?.tenant?.lastName || ""}`.trim();
            return fullName && leaseFullName && fullName === leaseFullName;
          })
        : [];

      const tenantMaintenance = Array.isArray(maintenanceData)
        ? maintenanceData.filter((item: any) => item?.tenant?.id === tenantId)
        : [];

      const tenantDocuments = Array.isArray(documentsData)
        ? documentsData.filter(
            (item: any) =>
              item?.tenant?.id === tenantId || item?.accessibleToTenant === true
          )
        : [];

      setPayments(tenantPayments);
      setMaintenance(tenantMaintenance);
      setDocuments(tenantDocuments);
    } catch (err: any) {
      console.error("Tenant portal load error:", err);
      setError(err?.message || "Failed to load tenant portal.");
    } finally {
      setLoading(false);
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
    currentLease?.rentAmount ?? user?.tenant?.unit?.monthlyRent ?? 0;

  const paidPayments = useMemo(
    () => payments.filter((p) => p.status === "PAID").length,
    [payments]
  );

  const pendingMaintenance = useMemo(
    () =>
      maintenance.filter(
        (m) => m.status === "OPEN" || m.status === "IN_PROGRESS"
      ).length,
    [maintenance]
  );

  const latestPayment = payments.length > 0 ? payments[0] : null;

  if (checkingAuth || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4f7fb]">
        <div className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-white px-8 py-6 shadow-xl text-slate-700">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading tenant workspace...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4f7fb] p-6">
        <div className="w-full max-w-xl rounded-3xl border border-rose-200 bg-white p-8 shadow-xl">
          <h2 className="text-2xl font-bold text-rose-600">Unable to load portal</h2>
          <p className="mt-3 text-slate-600">{error}</p>
          <button
            onClick={loadTenantPortal}
            className="mt-6 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f7fb] text-slate-900">
      <div className="flex min-h-screen">
        <aside className="hidden w-80 shrink-0 flex-col justify-between bg-gradient-to-b from-[#102a67] via-[#173d8e] to-[#0f1f45] text-white shadow-2xl lg:flex">
          <div>
            <div className="border-b border-white/10 px-8 py-8">
              <h1 className="text-3xl font-bold tracking-tight">The House Hub</h1>
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
                <SidebarItem label="Overview" icon={<Home size={18} />} active href="/tenant" />
                <SidebarItem label="Payments" icon={<CreditCard size={18} />} href="/tenant/payments" />
                <SidebarItem label="Maintenance" icon={<Wrench size={18} />} href="/tenant/maintenance" />
                <SidebarItem label="Documents" icon={<FileText size={18} />} href="/tenant/documents" />
                <SidebarItem label="Notifications" icon={<Bell size={18} />} href="/tenant/notifications" />
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
                <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
                  <Sparkles className="h-4 w-4" />
                  Tenant Experience
                </div>

                <h2 className="mt-4 text-4xl font-bold tracking-tight text-slate-900">
                  Welcome back, {user?.tenant?.firstName || "Tenant"}
                </h2>
                <p className="mt-3 max-w-3xl text-base leading-7 text-slate-500">
                  Manage your home, payments, service requests, and important documents
                  from one modern tenant dashboard.
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
            <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
              <KpiCard
                title="Monthly Rent"
                value={formatMoney(monthlyRent)}
                subtitle="Current rental amount"
                icon={<Wallet className="h-5 w-5" />}
                accent="blue"
              />
              <KpiCard
                title="Paid Payments"
                value={String(paidPayments)}
                subtitle="Successful rent records"
                icon={<BadgeCheck className="h-5 w-5" />}
                accent="emerald"
              />
              <KpiCard
                title="Open Requests"
                value={String(pendingMaintenance)}
                subtitle="Pending maintenance issues"
                icon={<Wrench className="h-5 w-5" />}
                accent="amber"
              />
              <KpiCard
                title="Available Documents"
                value={String(documents.length)}
                subtitle="Files accessible to you"
                icon={<FileText className="h-5 w-5" />}
                accent="indigo"
              />
            </section>

            <section className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-3">
              <div className="xl:col-span-2 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-semibold text-slate-900">
                      Your Home & Lease Summary
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      A clear overview of your property, unit, and lease details.
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <InfoCard
                    icon={<Building2 className="h-5 w-5" />}
                    label="Property"
                    value={
                      user?.tenant?.property?.name ||
                      user?.tenant?.property?.code ||
                      "Not assigned"
                    }
                  />
                  <InfoCard
                    icon={<DoorOpen className="h-5 w-5" />}
                    label="Unit"
                    value={
                      user?.tenant?.unit?.unitCode
                        ? `${user.tenant.unit.unitCode}${
                            user?.tenant?.unit?.unitName
                              ? ` — ${user.tenant.unit.unitName}`
                              : ""
                          }`
                        : "No unit assigned"
                    }
                  />
                  <InfoCard
                    icon={<MapPin className="h-5 w-5" />}
                    label="Address"
                    value={user?.tenant?.property?.addressLine1 || "No address available"}
                  />
                  <InfoCard
                    icon={<CalendarDays className="h-5 w-5" />}
                    label="Lease Period"
                    value={`${formatDate(
                      currentLease?.startDate || user?.tenant?.leaseStartDate
                    )} → ${formatDate(
                      currentLease?.endDate || user?.tenant?.leaseEndDate
                    )}`}
                  />
                  <InfoCard
                    icon={<ShieldCheck className="h-5 w-5" />}
                    label="Occupancy Status"
                    value={user?.tenant?.unit?.occupancyStatus || "N/A"}
                  />
                  <InfoCard
                    icon={<Layers3 className="h-5 w-5" />}
                    label="Floor / Beds / Baths"
                    value={`Floor ${user?.tenant?.unit?.floor ?? "—"} • ${
                      user?.tenant?.unit?.bedrooms ?? "—"
                    } bed • ${user?.tenant?.unit?.bathrooms ?? "—"} bath`}
                  />
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
                  <ProfileRow
                    icon={<UserCircle2 className="h-5 w-5 text-slate-400" />}
                    label="Full Name"
                    value={fullName}
                  />
                  <ProfileRow
                    icon={<Mail className="h-5 w-5 text-slate-400" />}
                    label="Email"
                    value={user?.tenant?.email || user?.email || "N/A"}
                  />
                  <ProfileRow
                    icon={<Phone className="h-5 w-5 text-slate-400" />}
                    label="Phone"
                    value={user?.tenant?.phone || "N/A"}
                  />
                </div>
              </div>
            </section>

            <section className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
              <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-semibold text-slate-900">
                      Recent Payments
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Latest recorded transactions on your account.
                    </p>
                  </div>

                  <Link
                    href="/tenant/payments"
                    className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
                  >
                    View all
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>

                <div className="mt-6 space-y-4">
                  {payments.length === 0 ? (
                    <EmptyState text="No payment records found yet." />
                  ) : (
                    payments.slice(0, 4).map((payment) => (
                      <div
                        key={payment.id}
                        className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
                      >
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div>
                            <p className="font-semibold text-slate-900">
                              {formatMoney(payment.amount)}
                            </p>
                            <p className="mt-1 text-sm text-slate-500">
                              {formatDate(payment.paymentDate)} • {payment.paymentMethod}
                            </p>
                          </div>

                          <span
                            className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${getPaymentBadge(
                              payment.status
                            )}`}
                          >
                            {payment.status}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {latestPayment && (
                  <div className="mt-6 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-5 text-white">
                    <p className="text-sm text-blue-100">Latest payment</p>
                    <p className="mt-1 text-2xl font-bold">
                      {formatMoney(latestPayment.amount)}
                    </p>
                    <p className="mt-1 text-sm text-blue-100">
                      {formatDate(latestPayment.paymentDate)}
                    </p>
                  </div>
                )}
              </div>

              <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-semibold text-slate-900">
                      Maintenance Requests
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Follow the progress of your service requests.
                    </p>
                  </div>

                  <Link
                    href="/tenant/maintenance"
                    className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
                  >
                    View all
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>

                <div className="mt-6 space-y-4">
                  {maintenance.length === 0 ? (
                    <EmptyState text="No maintenance requests found." />
                  ) : (
                    maintenance.slice(0, 4).map((item) => (
                      <div
                        key={item.id}
                        className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
                      >
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div>
                            <p className="font-semibold text-slate-900">{item.title}</p>
                            <p className="mt-1 text-sm text-slate-500">
                              {item.category || "GENERAL"} • {formatDate(item.createdAt)}
                            </p>
                          </div>

                          <span
                            className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${getMaintenanceBadge(
                              item.status
                            )}`}
                          >
                            {item.status || "OPEN"}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>

            <section className="mt-8 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-semibold text-slate-900">
                    Your Documents
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Access lease documents, notices, and other shared files.
                  </p>
                </div>

                <Link
                  href="/tenant/documents"
                  className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
                >
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
                    <div
                      key={doc.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-5 transition hover:-translate-y-0.5 hover:shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-900">
                            {doc.documentName}
                          </p>
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
        <div className="rounded-2xl bg-slate-50 p-3 text-slate-500">{icon}</div>
      </div>

      <p className="mt-5 text-sm font-medium text-slate-500">{title}</p>
      <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">{value}</p>
      <p className="mt-3 text-sm text-slate-500">{subtitle}</p>
    </div>
  );
}

function InfoCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
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

function ProfileRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
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

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-center text-sm text-slate-500">
      {text}
    </div>
  );
}