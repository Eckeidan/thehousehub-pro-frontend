"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Users,
  Home,
  Wrench,
  Wallet,
  FileText,
  Brain,
  Settings,
  LogOut,
  MessageCircle,
  Search,
  Inbox,
  Mail,
  Clock,
  User,
  Building,
  Loader2,
} from "lucide-react";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type StoredUser = {
  fullName?: string;
  name?: string;
  email?: string;
  role?: string;
};

type Communication = {
  id: string;
  type: string;
  direction: string;
  subject?: string | null;
  messageSummary: string;
  relatedTo?: string | null;
  sentAt: string;
  senderName?: string | null;
  receiverName?: string | null;
  tenant?: {
    id: string;
    fullName?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
  property?: {
    id: string;
    name?: string | null;
    addressLine1?: string | null;
    city?: string | null;
    state?: string | null;
  } | null;
};

export default function AdminCommunicationsPage() {
  const router = useRouter();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [user, setUser] = useState<StoredUser | null>(null);
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userRaw = localStorage.getItem("user");

    if (!token || !userRaw) {
      router.replace("/");
      return;
    }

    try {
      const parsedUser = JSON.parse(userRaw);
      const role = String(parsedUser?.role || "").toUpperCase();

      if (!["ADMIN", "OWNER"].includes(role)) {
        router.replace("/");
        return;
      }

      setUser(parsedUser);
      setCheckingAuth(false);
    } catch {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      router.replace("/");
    }
  }, [router]);

  useEffect(() => {
    if (!checkingAuth) {
      fetchCommunications();
    }
  }, [checkingAuth]);

  async function fetchCommunications() {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("token");

      const res = await fetch(`${API_BASE}/api/communications`, {
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${token || ""}`,
        },
      });

      const data = await res.json().catch(() => null);

      if (res.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        router.replace("/");
        return;
      }

      if (!res.ok) {
        throw new Error(data?.error || "Failed to load messages");
      }

      setCommunications(Array.isArray(data?.communications) ? data.communications : []);
    } catch (err: any) {
      setError(err?.message || "Failed to load messages.");
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.replace("/");
  }

  const filtered = useMemo(() => {
    const value = query.toLowerCase().trim();

    if (!value) return communications;

    return communications.filter((item) => {
      return [
        item.subject,
        item.messageSummary,
        item.senderName,
        item.receiverName,
        item.tenant?.fullName,
        item.tenant?.email,
        item.property?.name,
        item.property?.addressLine1,
      ]
        .filter(Boolean)
        .some((text) => String(text).toLowerCase().includes(value));
    });
  }, [communications, query]);

  const initials =
    (user?.fullName || user?.name || "User")
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "US";

  const displayName = user?.fullName || user?.name || "User";

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="rounded-2xl bg-white px-6 py-4 shadow">
          Checking session...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="flex min-h-screen">
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 bg-gradient-to-b from-blue-950 via-blue-900 to-slate-900 text-white shadow-2xl lg:flex lg:flex-col">
          <div className="border-b border-white/10 px-6 py-7">
            <h1 className="text-3xl font-bold tracking-tight">The House Hub</h1>
            <p className="mt-2 text-sm text-blue-100/70">
              Premium property management.
            </p>
          </div>

          <nav className="flex-1 overflow-y-auto px-4 py-6">
            <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-widest text-blue-200/50">
              Main Menu
            </p>

            <div className="space-y-2">
              <SidebarItem label="Dashboard" icon={<LayoutDashboard size={18} />} href="/dashboard" />
              <SidebarItem label="Properties" icon={<Building2 size={18} />} href="/properties" />
              <SidebarItem label="Tenants" icon={<Users size={18} />} href="/tenants" />
              <SidebarItem label="Units" icon={<Home size={18} />} href="/units" />
              <SidebarItem label="Maintenance" icon={<Wrench size={18} />} href="/maintenance" />
              <SidebarItem label="Financials" icon={<Wallet size={18} />} href="/payments" />
              <SidebarItem label="Documents" icon={<FileText size={18} />} href="/documents" />
              <SidebarItem label="Messages" icon={<MessageCircle size={18} />} href="/communications" active />
              <SidebarItem label="AI Insights" icon={<Brain size={18} />} href="/insights" />
              <SidebarItem label="Settings" icon={<Settings size={18} />} href="/settings" />
            </div>
          </nav>

          <div className="border-t border-white/10 px-6 py-5">
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 px-3 py-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">
                  {displayName}
                </p>
                <p className="truncate text-xs text-blue-100/70">
                  {user?.email || "Admin"}
                </p>
              </div>
            </div>

            <button
              onClick={logout}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-200 transition hover:bg-red-500/20 hover:text-white"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </aside>

        <main className="flex-1 lg:ml-72">
          <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
            <div className="flex flex-col gap-5 px-6 py-6 md:flex-row md:items-center md:justify-between md:px-8">
              <div>
                <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-blue-700">
                  Communication Center
                </span>
                <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
                  Tenant Messages
                </h2>
                <p className="mt-1 text-slate-500">
                  Review messages sent by tenants from the tenant portal.
                </p>
              </div>

              <button
                onClick={fetchCommunications}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                Refresh
              </button>
            </div>
          </header>

          <section className="p-6 md:p-8">
            <div className="mb-6 grid gap-4 md:grid-cols-3">
              <StatCard
                icon={<Inbox size={20} />}
                label="Total Messages"
                value={communications.length}
              />
              <StatCard
                icon={<Mail size={20} />}
                label="Inbound"
                value={communications.filter((m) => m.direction === "INBOUND").length}
              />
              <StatCard
                icon={<MessageCircle size={20} />}
                label="Tenant Contacts"
                value={communications.filter((m) => m.relatedTo === "TENANT_CONTACT").length}
              />
            </div>

            <div className="mb-6 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <Search className="h-5 w-5 text-slate-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by tenant, subject, property, or message..."
                  className="w-full bg-transparent text-sm outline-none"
                />
              </div>
            </div>

            {error && (
              <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center rounded-3xl bg-white p-12 shadow-sm ring-1 ring-slate-200">
                <div className="flex items-center gap-3 text-slate-500">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Loading messages...
                </div>
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-3xl bg-white p-12 text-center shadow-sm ring-1 ring-slate-200">
                <Inbox className="mx-auto h-12 w-12 text-slate-300" />
                <h3 className="mt-4 text-lg font-bold text-slate-900">
                  No messages found
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                  Tenant messages will appear here once submitted.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filtered.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-widest text-blue-700">
                            {item.direction}
                          </span>
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-widest text-slate-600">
                            {item.type}
                          </span>
                        </div>

                        <h3 className="mt-3 text-xl font-bold text-slate-900">
                          {item.subject || "No subject"}
                        </h3>

                        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                          {item.messageSummary}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
                        <div className="flex items-center gap-2">
                          <Clock size={16} />
                          {new Date(item.sentAt).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3 border-t border-slate-100 pt-5 md:grid-cols-2">
                      <InfoLine
                        icon={<User size={16} />}
                        label="Tenant"
                        value={
                          item.tenant?.fullName ||
                          item.senderName ||
                          item.tenant?.email ||
                          "Unknown tenant"
                        }
                      />
                      <InfoLine
                        icon={<Mail size={16} />}
                        label="Email"
                        value={item.tenant?.email || "Not available"}
                      />
                      <InfoLine
                        icon={<Building size={16} />}
                        label="Property"
                        value={
                          item.property?.name ||
                          item.property?.addressLine1 ||
                          "Not linked"
                        }
                      />
                      <InfoLine
                        icon={<MessageCircle size={16} />}
                        label="Related To"
                        value={item.relatedTo || "General message"}
                      />
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
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

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <div className="flex items-center justify-between">
        <div className="rounded-2xl bg-blue-50 p-3 text-blue-700">{icon}</div>
        <p className="text-3xl font-bold text-slate-900">{value}</p>
      </div>
      <p className="mt-4 text-sm font-medium text-slate-500">{label}</p>
    </div>
  );
}

function InfoLine({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-slate-50 px-4 py-3">
      <div className="mt-0.5 text-blue-700">{icon}</div>
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
          {label}
        </p>
        <p className="mt-1 text-sm font-semibold text-slate-700">{value}</p>
      </div>
    </div>
  );
}