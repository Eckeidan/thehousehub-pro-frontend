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
  CheckCircle2,
  AlertTriangle,
  Clock3,
  Info,
  Mail,
  ShieldCheck,
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
    property?: {
      id: string;
      code?: string | null;
      name?: string | null;
    } | null;
    unit?: {
      id: string;
      unitCode?: string | null;
      unitName?: string | null;
    } | null;
  } | null;
};

type TenantNotification = {
  id: string;
  tenantId: string;
  title: string;
  message: string;
  type: "INFO" | "SUCCESS" | "WARNING" | "ALERT";
  category: "PAYMENT" | "MAINTENANCE" | "DOCUMENT" | "LEASE" | "SYSTEM";
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
};

function formatDate(value?: string | null) {
  if (!value) return "Not set";
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(value?: string | null) {
  if (!value) return "Not set";
  return new Date(value).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
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

function getTypeStyles(type: TenantNotification["type"]) {
  switch (type) {
    case "SUCCESS":
      return {
        badge: "bg-emerald-100 text-emerald-700 border border-emerald-200",
        box: "bg-emerald-50 text-emerald-600",
        icon: <CheckCircle2 className="h-5 w-5" />,
      };
    case "WARNING":
      return {
        badge: "bg-amber-100 text-amber-700 border border-amber-200",
        box: "bg-amber-50 text-amber-600",
        icon: <Clock3 className="h-5 w-5" />,
      };
    case "ALERT":
      return {
        badge: "bg-rose-100 text-rose-700 border border-rose-200",
        box: "bg-rose-50 text-rose-600",
        icon: <AlertTriangle className="h-5 w-5" />,
      };
    default:
      return {
        badge: "bg-blue-100 text-blue-700 border border-blue-200",
        box: "bg-blue-50 text-blue-600",
        icon: <Info className="h-5 w-5" />,
      };
  }
}

function getCategoryStyles(category: TenantNotification["category"]) {
  switch (category) {
    case "PAYMENT":
      return "bg-emerald-50 text-emerald-700 border border-emerald-200";
    case "MAINTENANCE":
      return "bg-amber-50 text-amber-700 border border-amber-200";
    case "DOCUMENT":
      return "bg-violet-50 text-violet-700 border border-violet-200";
    case "LEASE":
      return "bg-cyan-50 text-cyan-700 border border-cyan-200";
    case "SYSTEM":
      return "bg-slate-100 text-slate-700 border border-slate-200";
    default:
      return "bg-slate-100 text-slate-700 border border-slate-200";
  }
}

export default function TenantNotificationsPage() {
  const router = useRouter();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loading, setLoading] = useState(true);

  const [user, setUser] = useState<AuthUser | null>(null);
  const [notifications, setNotifications] = useState<TenantNotification[]>([]);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"ALL" | "UNREAD" | "READ">("ALL");

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
      loadNotificationsData();
    }
  }, [checkingAuth]);

  async function loadNotificationsData() {
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

      const notificationsRes = await fetch(`${API_URL}/api/tenant/notifications`, {
        headers: {
          Authorization: `Bearer ${token || ""}`,
        },
        cache: "no-store",
      });

      const notificationsData = await notificationsRes.json().catch(() => null);

      if (notificationsRes.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        router.replace("/");
        return;
      }

      if (!notificationsRes.ok) {
        throw new Error(
          notificationsData?.error || "Failed to load tenant notifications"
        );
      }

      setNotifications(Array.isArray(notificationsData) ? notificationsData : []);
    } catch (err: any) {
      console.error("Tenant notifications load error:", err);
      setError(err?.message || "Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  }

  async function markAsRead(id: string) {
    try {
      const token = localStorage.getItem("token");

      const res = await fetch(`${API_URL}/api/tenant/notifications/${id}/read`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token || ""}`,
        },
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "Failed to mark notification as read");
      }

      setNotifications((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, isRead: true } : item
        )
      );
    } catch (err) {
      console.error("markAsRead error:", err);
    }
  }

  async function markAllAsRead() {
    try {
      const token = localStorage.getItem("token");

      const res = await fetch(`${API_URL}/api/tenant/notifications/read-all`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token || ""}`,
        },
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "Failed to mark all notifications as read");
      }

      setNotifications((prev) =>
        prev.map((item) => ({ ...item, isRead: true }))
      );
    } catch (err) {
      console.error("markAllAsRead error:", err);
    }
  }

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.replace("/");
  }

  const filteredNotifications = useMemo(() => {
    const q = search.toLowerCase().trim();

    return notifications.filter((item) => {
      const matchesSearch =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.message.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.type.toLowerCase().includes(q);

      const matchesFilter =
        filter === "ALL" ||
        (filter === "READ" && item.isRead) ||
        (filter === "UNREAD" && !item.isRead);

      return matchesSearch && matchesFilter;
    });
  }, [notifications, search, filter]);

  const fullName =
    user?.fullName ||
    user?.name ||
    `${user?.tenant?.firstName || ""} ${user?.tenant?.lastName || ""}`.trim() ||
    "Tenant";

  const initials = getInitials(fullName);

  const totalNotifications = notifications.length;
  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const readCount = notifications.filter((n) => n.isRead).length;
  const alertCount = notifications.filter((n) => n.type === "ALERT").length;

  const latestNotification = notifications.length > 0 ? notifications[0] : null;

  if (checkingAuth || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4f7fb]">
        <div className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-white px-8 py-6 shadow-xl text-slate-700">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading notifications...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4f7fb] p-6">
        <div className="w-full max-w-xl rounded-3xl border border-rose-200 bg-white p-8 shadow-xl">
          <h2 className="text-2xl font-bold text-rose-600">
            Unable to load notifications
          </h2>
          <p className="mt-3 text-slate-600">{error}</p>
          <button
            onClick={loadNotificationsData}
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
                <SidebarItem label="Overview" icon={<Home size={18} />} href="/tenant" />
                <SidebarItem label="Payments" icon={<CreditCard size={18} />} href="/tenant/payments" />
                <SidebarItem label="Maintenance" icon={<Wrench size={18} />} href="/tenant/maintenance" />
                <SidebarItem label="Documents" icon={<FileText size={18} />} href="/tenant/documents" />
                <SidebarItem label="Notifications" icon={<Bell size={18} />} active href="/tenant/notifications" />
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

                <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
                  <Sparkles className="h-4 w-4" />
                  Notification Center
                </div>

                <h2 className="mt-4 text-4xl font-bold tracking-tight text-slate-900">
                  Notifications
                </h2>
                <p className="mt-3 max-w-3xl text-base leading-7 text-slate-500">
                  Stay updated with important tenant account alerts, lease reminders,
                  payment confirmations, document sharing, and maintenance activity.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={loadNotificationsData}
                  className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  Refresh
                </button>

                <button
                  onClick={markAllAsRead}
                  className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
                >
                  Mark all as read
                </button>
              </div>
            </div>
          </div>

          <div className="p-6 md:p-8">
            <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
              <KpiCard
                title="Total Notifications"
                value={String(totalNotifications)}
                subtitle="All recent updates"
                icon={<Bell className="h-5 w-5" />}
                accent="blue"
              />
              <KpiCard
                title="Unread"
                value={String(unreadCount)}
                subtitle="Need your attention"
                icon={<Mail className="h-5 w-5" />}
                accent="amber"
              />
              <KpiCard
                title="Read"
                value={String(readCount)}
                subtitle="Already reviewed"
                icon={<CheckCircle2 className="h-5 w-5" />}
                accent="emerald"
              />
              <KpiCard
                title="Alerts"
                value={String(alertCount)}
                subtitle="Important notices"
                icon={<AlertTriangle className="h-5 w-5" />}
                accent="rose"
              />
            </section>

            <section className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-3">
              <div className="xl:col-span-2 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="text-2xl font-semibold text-slate-900">
                      Recent Notifications
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Review your latest alerts and activity updates.
                    </p>
                  </div>

                  <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row">
                    <div className="relative w-full md:w-72">
                      <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search notifications..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white"
                      />
                    </div>

                    <select
                      value={filter}
                      onChange={(e) =>
                        setFilter(e.target.value as "ALL" | "UNREAD" | "READ")
                      }
                      className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white"
                    >
                      <option value="ALL">All</option>
                      <option value="UNREAD">Unread</option>
                      <option value="READ">Read</option>
                    </select>
                  </div>
                </div>

                <div className="mt-6 space-y-5">
                  {filteredNotifications.length === 0 ? (
                    <EmptyState text="No notifications found." />
                  ) : (
                    filteredNotifications.map((item) => {
                      const typeStyles = getTypeStyles(item.type);

                      return (
                        <div
                          key={item.id}
                          className={`rounded-3xl border p-6 transition hover:border-slate-300 hover:bg-white ${
                            item.isRead
                              ? "border-slate-200 bg-slate-50"
                              : "border-blue-200 bg-blue-50/40"
                          }`}
                        >
                          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                            <div className="flex flex-1 gap-4">
                              <div
                                className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl shadow-sm ${typeStyles.box}`}
                              >
                                {typeStyles.icon}
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h4 className="break-words text-xl font-semibold text-slate-900">
                                    {item.title}
                                  </h4>

                                  <span
                                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${typeStyles.badge}`}
                                  >
                                    {item.type}
                                  </span>

                                  <span
                                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getCategoryStyles(
                                      item.category
                                    )}`}
                                  >
                                    {item.category}
                                  </span>

                                  {!item.isRead && (
                                    <span className="inline-flex rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">
                                      New
                                    </span>
                                  )}
                                </div>

                                <p className="mt-3 break-words text-sm leading-7 text-slate-600">
                                  {item.message}
                                </p>

                                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                  <InfoPill
                                    icon={<CalendarDays className="h-4 w-4" />}
                                    text={`Date: ${formatDate(item.createdAt)}`}
                                  />
                                  <InfoPill
                                    icon={<Clock3 className="h-4 w-4" />}
                                    text={`Time: ${formatDateTime(item.createdAt)}`}
                                  />
                                  <InfoPill
                                    icon={<ShieldCheck className="h-4 w-4" />}
                                    text={item.isRead ? "Read" : "Unread"}
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="flex shrink-0 flex-wrap items-center gap-3 xl:flex-col xl:items-end">
                              {!item.isRead ? (
                                <button
                                  onClick={() => markAsRead(item.id)}
                                  className="inline-flex min-w-[160px] items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
                                >
                                  <CheckCircle2 className="h-4 w-4" />
                                  Mark as read
                                </button>
                              ) : (
                                <div className="inline-flex min-w-[160px] items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 shadow-sm">
                                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                  Reviewed
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-2xl font-semibold text-slate-900">
                    Notification Summary
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Overview of your communication flow.
                  </p>

                  <div className="mt-6 space-y-4">
                    <SummaryRow label="Tenant" value={fullName} />
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
                    <SummaryRow label="Unread" value={String(unreadCount)} />
                    <SummaryRow label="Read" value={String(readCount)} />
                    <SummaryRow label="Alerts" value={String(alertCount)} />
                  </div>
                </div>

                <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-2xl font-semibold text-slate-900">
                    Latest Notification
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Most recent account update.
                  </p>

                  {latestNotification ? (
                    <div className="mt-6 rounded-3xl bg-gradient-to-r from-blue-600 to-indigo-600 p-5 text-white">
                      <p className="text-sm text-blue-100">Title</p>
                      <p className="mt-1 text-2xl font-bold">
                        {latestNotification.title}
                      </p>

                      <div className="mt-5 space-y-2 text-sm text-blue-100">
                        <p>Type: {latestNotification.type}</p>
                        <p>Category: {latestNotification.category}</p>
                        <p>Date: {formatDate(latestNotification.createdAt)}</p>
                        <p>Status: {latestNotification.isRead ? "Read" : "Unread"}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-6">
                      <EmptyState text="No notification available yet." />
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
                    <QuickLink href="/tenant/payments" label="Open Payments" />
                    <QuickLink href="/tenant/documents" label="Open Documents" />
                  </div>
                </div>
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
        <div className={`h-2 w-16 rounded-full bg-gradient-to-r ${accentMap[accent]}`} />
        <div className="rounded-2xl bg-slate-50 p-3 text-slate-500">{icon}</div>
      </div>

      <p className="mt-5 text-sm font-medium text-slate-500">{title}</p>
      <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">{value}</p>
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
      <span className="text-right text-sm font-semibold text-slate-900">{value}</span>
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
    <div className="flex min-h-[72px] items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
      <span className="shrink-0 text-slate-400">{icon}</span>
      <span className="leading-6 break-words">{text}</span>
    </div>
  );
}