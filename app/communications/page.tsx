"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
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
  Send,
  Loader2,
  Mail,
  Building,
  User,
} from "lucide-react";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type StoredUser = {
  fullName?: string;
  name?: string;
  email?: string;
  role?: string;
};

type InboxMessage = {
  id: string;
  tenantId: string | null;
  subject?: string | null;
  messageSummary: string;
  direction: string;
  sentAt: string;
  senderName?: string | null;
  tenant?: {
    id: string;
    fullName?: string | null;
    email?: string | null;
  } | null;
  property?: {
    id: string;
    name?: string | null;
    addressLine1?: string | null;
  } | null;
};

type ThreadMessage = {
  id: string;
  subject?: string | null;
  messageSummary: string;
  direction: "INBOUND" | "OUTBOUND" | string;
  senderName?: string | null;
  receiverName?: string | null;
  sentAt: string;
};

type ThreadData = {
  tenant?: {
    id: string;
    fullName?: string;
    email?: string;
    phone?: string;
  };
  property?: {
    name?: string | null;
    addressLine1?: string | null;
    city?: string | null;
    state?: string | null;
  } | null;
  unit?: {
    unitCode?: string | null;
    unitName?: string | null;
  } | null;
  messages: ThreadMessage[];
};

export default function AdminCommunicationsPage() {
  const router = useRouter();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [user, setUser] = useState<StoredUser | null>(null);

  const [inbox, setInbox] = useState<InboxMessage[]>([]);
  const [thread, setThread] = useState<ThreadData | null>(null);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);

  const [loadingInbox, setLoadingInbox] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [sending, setSending] = useState(false);

  const [query, setQuery] = useState("");
  const [reply, setReply] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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
      fetchInbox();
    }
  }, [checkingAuth]);

  async function fetchInbox() {
    try {
      setLoadingInbox(true);
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
        throw new Error(data?.error || "Failed to load inbox");
      }

      const rows = Array.isArray(data?.communications)
        ? data.communications
        : [];

      setInbox(rows);

      const firstTenantId = rows.find((m: InboxMessage) => m.tenantId)?.tenantId;
      if (!selectedTenantId && firstTenantId) {
        openThread(firstTenantId);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load inbox.");
    } finally {
      setLoadingInbox(false);
    }
  }

  async function openThread(tenantId: string) {
    try {
      setSelectedTenantId(tenantId);
      setLoadingThread(true);
      setError("");
      setSuccess("");

      const token = localStorage.getItem("token");

      const res = await fetch(`${API_BASE}/api/communications/thread/${tenantId}`, {
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${token || ""}`,
        },
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "Failed to load conversation");
      }

      setThread({
        tenant: data.tenant,
        property: data.property,
        unit: data.unit,
        messages: Array.isArray(data.messages) ? data.messages : [],
      });
    } catch (err: any) {
      setError(err?.message || "Failed to load conversation.");
    } finally {
      setLoadingThread(false);
    }
  }

  async function sendReply(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!selectedTenantId) {
      setError("Please select a tenant conversation first.");
      return;
    }

    if (!reply.trim()) {
      setError("Please write a reply.");
      return;
    }

    try {
      setSending(true);

      const token = localStorage.getItem("token");

      const res = await fetch(
        `${API_BASE}/api/communications/thread/${selectedTenantId}/reply`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token || ""}`,
          },
          body: JSON.stringify({
            message: reply.trim(),
            subject: thread?.messages?.[0]?.subject || "Management reply",
          }),
        }
      );

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "Failed to send reply");
      }

      setReply("");
      setSuccess("Reply sent successfully.");
      await openThread(selectedTenantId);
      await fetchInbox();
    } catch (err: any) {
      setError(err?.message || "Failed to send reply.");
    } finally {
      setSending(false);
    }
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.replace("/");
  }

  const conversations = useMemo(() => {
    const grouped = new Map<string, InboxMessage>();

    for (const item of inbox) {
      if (!item.tenantId) continue;
      if (!grouped.has(item.tenantId)) {
        grouped.set(item.tenantId, item);
      }
    }

    return Array.from(grouped.values());
  }, [inbox]);

  const filteredConversations = useMemo(() => {
    const value = query.toLowerCase().trim();
    if (!value) return conversations;

    return conversations.filter((item) =>
      [
        item.tenant?.fullName,
        item.tenant?.email,
        item.subject,
        item.messageSummary,
        item.property?.name,
        item.property?.addressLine1,
      ]
        .filter(Boolean)
        .some((text) => String(text).toLowerCase().includes(value))
    );
  }, [conversations, query]);

  const initials =
    (user?.fullName || user?.name || "User")
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "US";

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
                  {user?.fullName || user?.name || "User"}
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
                  Smart Messages
                </span>
                <h2 className="mt-3 text-3xl font-bold tracking-tight">
                  Tenant Conversations
                </h2>
                <p className="mt-1 text-slate-500">
                  Inbox, conversation thread, and admin replies.
                </p>
              </div>

              <button
                onClick={fetchInbox}
                className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
              >
                Refresh
              </button>
            </div>
          </header>

          <section className="p-6 md:p-8">
            {error && (
              <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {success}
              </div>
            )}

            <div className="grid min-h-[680px] overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 lg:grid-cols-[380px_1fr]">
              <aside className="border-r border-slate-200 bg-slate-50">
                <div className="border-b border-slate-200 p-4">
                  <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <Search className="h-5 w-5 text-slate-400" />
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search conversations..."
                      className="w-full bg-transparent text-sm outline-none"
                    />
                  </div>
                </div>

                <div className="max-h-[610px] overflow-y-auto">
                  {loadingInbox ? (
                    <div className="flex items-center gap-2 p-6 text-sm text-slate-500">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading inbox...
                    </div>
                  ) : filteredConversations.length === 0 ? (
                    <div className="p-8 text-center text-sm text-slate-500">
                      <Inbox className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                      No conversations found.
                    </div>
                  ) : (
                    filteredConversations.map((item) => {
                      const active = item.tenantId === selectedTenantId;

                      return (
                        <button
                          key={item.id}
                          onClick={() => item.tenantId && openThread(item.tenantId)}
                          className={`w-full border-b border-slate-200 px-4 py-4 text-left transition ${
                            active ? "bg-blue-50" : "bg-white hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-700 text-sm font-bold text-white">
                              {(item.tenant?.fullName || item.senderName || "T")
                                .slice(0, 2)
                                .toUpperCase()}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex justify-between gap-2">
                                <p className="truncate font-bold text-slate-900">
                                  {item.tenant?.fullName ||
                                    item.senderName ||
                                    "Unknown tenant"}
                                </p>
                                <span className="shrink-0 text-[11px] text-slate-400">
                                  {new Date(item.sentAt).toLocaleDateString()}
                                </span>
                              </div>

                              <p className="truncate text-xs text-slate-500">
                                {item.property?.name ||
                                  item.property?.addressLine1 ||
                                  "Not linked"}
                              </p>

                              <p className="mt-1 truncate text-sm text-slate-600">
                                {item.direction === "OUTBOUND" ? "You: " : ""}
                                {item.messageSummary}
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </aside>

              <div className="flex min-h-[680px] flex-col bg-white">
                {!selectedTenantId ? (
                  <div className="flex flex-1 items-center justify-center p-10 text-center">
                    <div>
                      <MessageCircle className="mx-auto h-14 w-14 text-slate-300" />
                      <h3 className="mt-4 text-xl font-bold">Select a conversation</h3>
                      <p className="mt-2 text-sm text-slate-500">
                        Choose a tenant from the inbox to view the message thread.
                      </p>
                    </div>
                  </div>
                ) : loadingThread ? (
                  <div className="flex flex-1 items-center justify-center gap-2 text-slate-500">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Loading conversation...
                  </div>
                ) : thread ? (
                  <>
                    <div className="border-b border-slate-200 px-6 py-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <h3 className="text-xl font-bold">
                            {thread.tenant?.fullName || "Tenant"}
                          </h3>
                          <p className="text-sm text-slate-500">
                            {thread.tenant?.email || "No email"}
                          </p>
                        </div>

                        <div className="grid gap-2 text-xs text-slate-500 md:text-right">
                          <span>
                            <Building className="mr-1 inline h-3.5 w-3.5" />
                            {thread.property?.name ||
                              thread.property?.addressLine1 ||
                              "Property not linked"}
                          </span>
                          <span>
                            <Home className="mr-1 inline h-3.5 w-3.5" />
                            {thread.unit?.unitName ||
                              thread.unit?.unitCode ||
                              "Unit not linked"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50 p-6">
                      {thread.messages.length === 0 ? (
                        <div className="text-center text-sm text-slate-500">
                          No messages in this thread yet.
                        </div>
                      ) : (
                        thread.messages.map((msg) => {
                          const isAdmin = msg.direction === "OUTBOUND";

                          return (
                            <div
                              key={msg.id}
                              className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}
                            >
                              <div
                                className={`max-w-[75%] rounded-3xl px-5 py-3 shadow-sm ${
                                  isAdmin
                                    ? "bg-blue-700 text-white"
                                    : "bg-white text-slate-800 ring-1 ring-slate-200"
                                }`}
                              >
                                <p className="whitespace-pre-wrap text-sm leading-6">
                                  {msg.messageSummary}
                                </p>
                                <p
                                  className={`mt-2 text-[11px] ${
                                    isAdmin ? "text-blue-100" : "text-slate-400"
                                  }`}
                                >
                                  {msg.senderName || (isAdmin ? "Management" : "Tenant")} ·{" "}
                                  {new Date(msg.sentAt).toLocaleString()}
                                </p>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    <form
                      onSubmit={sendReply}
                      className="border-t border-slate-200 bg-white p-4"
                    >
                      <div className="flex gap-3">
                        <textarea
                          value={reply}
                          onChange={(e) => setReply(e.target.value)}
                          rows={2}
                          placeholder="Write a reply to the tenant..."
                          className="min-h-[52px] flex-1 resize-none rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                        />
                        <button
                          type="submit"
                          disabled={sending}
                          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-700 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-200 hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {sending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                          Send
                        </button>
                      </div>
                    </form>
                  </>
                ) : null}
              </div>
            </div>
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