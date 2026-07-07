"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  Building2,
  Clock3,
  Globe2,
  Laptop,
  Loader2,
  Search,
  ShieldCheck,
  Users,
  Wifi,
} from "lucide-react";
import SuperOwnerShell from "@/components/SuperOwnerShell";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type StoredUser = {
  id?: string;
  fullName?: string;
  email?: string;
  role?: string;
};

type PermissionsResponse = {
  accessAll: boolean;
  permissions: string[];
};

type OnlineUser = {
  userId: string;
  fullName: string;
  email: string;
  role: string;
  isActive: boolean;
  organization?: {
    id: string;
    name: string;
    email?: string | null;
    companyName?: string | null;
  } | null;
  lastActivityAt: string;
  lastAction: string;
  lastPath: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  device: {
    browser: string;
    os: string;
  };
  approximateLocation: {
    label: string;
    precision: string;
  };
};

type OnlineResponse = {
  windowMinutes: number;
  generatedAt: string;
  stats: {
    onlineUsers: number;
    onlineAdmins: number;
    onlineTenants: number;
  };
  users: OnlineUser[];
  admins: OnlineUser[];
  tenants: OnlineUser[];
};

function formatDate(value?: string | null) {
  if (!value) return "N/A";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function minutesAgo(value?: string | null) {
  if (!value) return "N/A";
  const diff = Math.max(0, Date.now() - new Date(value).getTime());
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes === 1) return "1 minute ago";
  return `${minutes} minutes ago`;
}

function plainAction(action: string) {
  const method = action.split(" ")[0]?.toUpperCase();
  const path = action.split(" ")[1] || action;
  const resource = path.split("/").filter(Boolean)[1] || "system";

  if (method === "POST") return `Created or submitted ${resource}`;
  if (method === "PATCH" || method === "PUT") return `Updated ${resource}`;
  if (method === "DELETE") return `Deleted ${resource}`;
  return action;
}

export default function SuperOwnerOnlinePage() {
  const router = useRouter();
  const [user, setUser] = useState<StoredUser | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [windowMinutes, setWindowMinutes] = useState(15);
  const [permissions, setPermissions] = useState<PermissionsResponse | null>(null);
  const [online, setOnline] = useState<OnlineResponse | null>(null);

  const canReadOnline =
    permissions?.accessAll ||
    permissions?.permissions?.includes("support:read") ||
    permissions?.permissions?.includes("*");

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userRaw = localStorage.getItem("user");

    if (!token || !userRaw) {
      router.replace("/");
      return;
    }

    try {
      const parsedUser: StoredUser = JSON.parse(userRaw);
      if (String(parsedUser.role || "").toUpperCase() !== "SUPER_OWNER") {
        router.replace("/");
        return;
      }
      setUser(parsedUser);
      setCheckingAuth(false);
    } catch {
      router.replace("/");
    }
  }, [router]);

  const apiFetch = useCallback(async <TData,>(path: string): Promise<TData> => {
    const token = localStorage.getItem("token");
    const res = await fetch(`${API_BASE}${path}`, {
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${token || ""}`,
      },
    });

    if (res.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      router.replace("/");
      throw new Error("Unauthorized");
    }

    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error || "Request failed");
    return data as TData;
  }, [router]);

  const loadOnlineUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const permissionsData = await apiFetch<PermissionsResponse>("/api/super-owner/permissions");
      setPermissions(permissionsData);

      if (
        permissionsData.accessAll ||
        permissionsData.permissions.includes("support:read") ||
        permissionsData.permissions.includes("*")
      ) {
        const data = await apiFetch<OnlineResponse>(
          `/api/super-owner/online-users?windowMinutes=${windowMinutes}`
        );
        setOnline(data);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load online users.");
    } finally {
      setLoading(false);
    }
  }, [apiFetch, windowMinutes]);

  useEffect(() => {
    if (checkingAuth) return;
    loadOnlineUsers();
  }, [checkingAuth, loadOnlineUsers]);

  const filteredUsers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const rows = online?.users || [];
    if (!normalized) return rows;

    return rows.filter((item) =>
      [
        item.fullName,
        item.email,
        item.role,
        item.organization?.name || "Platform",
        item.approximateLocation.label,
        item.device.browser,
        item.device.os,
        item.lastAction,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalized)
    );
  }, [online?.users, query]);

  if (checkingAuth || loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
        <Loader2 className="mr-3 h-5 w-5 animate-spin" />
        Loading online users...
      </main>
    );
  }

  return (
    <SuperOwnerShell
      user={user}
      activeItem="online"
      title="Online Users"
      subtitle="Voir les admins et utilisateurs actifs récemment, avec dernière activité, appareil et localisation approximative."
      actions={
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={windowMinutes}
            onChange={(event) => setWindowMinutes(Number(event.target.value))}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-950 outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
          >
            <option value={5}>Last 5 min</option>
            <option value={15}>Last 15 min</option>
            <option value={30}>Last 30 min</option>
            <option value={60}>Last 1 hour</option>
          </select>
          <div className="relative w-full sm:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search online users..."
              className="w-full rounded-2xl border border-slate-200 bg-white px-10 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500"
            />
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        {error && (
          <div className="rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-100">
            {error}
          </div>
        )}

        <section className="grid gap-4 md:grid-cols-4">
          <Metric icon={<Wifi size={18} />} label="Online Users" value={online?.stats.onlineUsers || 0} />
          <Metric icon={<ShieldCheck size={18} />} label="Admins Online" value={online?.stats.onlineAdmins || 0} />
          <Metric icon={<Users size={18} />} label="Tenants Online" value={online?.stats.onlineTenants || 0} />
          <Metric icon={<Clock3 size={18} />} label="Window" value={`${online?.windowMinutes || windowMinutes} min`} />
        </section>

        {!canReadOnline ? (
          <EmptyState title="No support permission" text="Grant support:read to inspect active sessions." />
        ) : (
          <section className="grid gap-6 xl:grid-cols-[0.42fr_0.58fr]">
            <Panel title="Admins Online">
              {(online?.admins || []).length === 0 ? (
                <EmptyState title="No admins online" text="No platform or organization admin activity in this window." />
              ) : (
                (online?.admins || []).map((item) => <OnlineUserCard key={item.userId} item={item} compact />)
              )}
            </Panel>

            <Panel title="All Active Users">
              {filteredUsers.length === 0 ? (
                <EmptyState title="No active users" text="No user matches this search or activity window." />
              ) : (
                filteredUsers.map((item) => <OnlineUserCard key={item.userId} item={item} />)
              )}
            </Panel>
          </section>
        )}

        <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
          Location is approximate. It depends on IP/proxy headers and should be used for support context, not as legal proof of a user&apos;s exact physical position.
        </p>
      </div>
    </SuperOwnerShell>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04] dark:shadow-2xl dark:shadow-black/20">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-300">
        {icon}
      </div>
      <p className="mt-5 text-sm text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-black tracking-tight text-slate-950 dark:text-white">{value}</p>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04] dark:shadow-2xl dark:shadow-black/20">
      <h2 className="text-xl font-black text-slate-950 dark:text-white">{title}</h2>
      <div className="mt-5 space-y-3">{children}</div>
    </section>
  );
}

function OnlineUserCard({ item, compact = false }: { item: OnlineUser; compact?: boolean }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-sm font-black text-white">
              {item.fullName
                .split(" ")
                .map((part) => part[0])
                .join("")
                .slice(0, 2)
                .toUpperCase() || "US"}
            </span>
            <div>
              <p className="font-black text-slate-950 dark:text-white">{item.fullName}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{item.email}</p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Pill icon={<ShieldCheck size={13} />} text={item.role} />
            <Pill icon={<Clock3 size={13} />} text={minutesAgo(item.lastActivityAt)} />
            <Pill icon={<Building2 size={13} />} text={item.organization?.name || "Platform"} />
          </div>
        </div>

        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-100">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Online
        </span>
      </div>

      {!compact && (
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <Info icon={<Activity size={15} />} label="Last action" value={plainAction(item.lastAction)} detail={item.lastPath} />
          <Info icon={<Globe2 size={15} />} label="Approx. location" value={item.approximateLocation.label} detail={item.approximateLocation.precision} />
          <Info icon={<Laptop size={15} />} label="Device" value={`${item.device.browser} on ${item.device.os}`} detail={item.userAgent || "No user agent captured"} />
          <Info icon={<Wifi size={15} />} label="Network" value={item.ipAddress || "No IP captured"} detail={`Last seen ${formatDate(item.lastActivityAt)}`} />
        </div>
      )}
    </article>
  );
}

function Pill({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-600 dark:border-white/10 dark:bg-slate-950/30 dark:text-slate-300">
      {icon}
      {text}
    </span>
  );
}

function Info({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-slate-950/30">
      <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
        {icon}
        {label}
      </p>
      <p className="mt-2 break-words text-sm font-bold text-slate-950 dark:text-white">{value}</p>
      <p className="mt-1 line-clamp-2 break-words text-xs text-slate-500 dark:text-slate-400">{detail}</p>
    </div>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center dark:border-white/10 dark:bg-white/[0.02]">
      <p className="font-bold text-slate-950 dark:text-white">{title}</p>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{text}</p>
    </div>
  );
}
