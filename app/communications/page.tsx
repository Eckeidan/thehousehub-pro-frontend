"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  MessageCircle,
  Search,
  Inbox,
  Send,
  Loader2,
  Building,
  Home,
  RefreshCw,
  Paperclip,
  X,
} from "lucide-react";
import AdminShell from "@/components/AdminShell";
import MessageAttachments, {
  type MessageAttachment,
} from "@/components/MessageAttachments";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type StoredUser = {
  fullName?: string;
  name?: string;
  email?: string;
  role?: string;
  organizationId?: string;
};

type InboxMessage = {
  id: string;
  tenantId: string | null;
  subject?: string | null;
  messageSummary: string;
  direction: string;
  sentAt?: string;
  senderName?: string | null;
  attachments?: MessageAttachment[] | null;
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

type TenantDirectoryItem = {
  id: string;
  tenantId: string;
  fullName?: string | null;
  email?: string | null;
  phone?: string | null;
  property?: {
    id?: string;
    name?: string | null;
    addressLine1?: string | null;
  } | null;
  lastMessage?: ThreadMessage | null;
};

type ThreadMessage = {
  id: string;
  subject?: string | null;
  messageSummary: string;
  direction: "INBOUND" | "OUTBOUND" | string;
  senderName?: string | null;
  receiverName?: string | null;
  sentAt: string;
  attachments?: MessageAttachment[] | null;
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

function mergeConversationRows(
  messages: InboxMessage[],
  tenants: TenantDirectoryItem[]
) {
  const byTenant = new Map<string, InboxMessage>();

  for (const message of messages) {
    if (!message.tenantId || byTenant.has(message.tenantId)) continue;
    byTenant.set(message.tenantId, message);
  }

  for (const tenant of tenants) {
    if (!tenant.tenantId || byTenant.has(tenant.tenantId)) continue;

    byTenant.set(tenant.tenantId, {
      id: `tenant-${tenant.tenantId}`,
      tenantId: tenant.tenantId,
      messageSummary: tenant.lastMessage?.messageSummary || "Start a conversation",
      direction: tenant.lastMessage?.direction || "INTERNAL",
      sentAt: tenant.lastMessage?.sentAt,
      senderName: tenant.fullName || tenant.email || "Tenant",
      attachments: tenant.lastMessage?.attachments || [],
      tenant: {
        id: tenant.tenantId,
        fullName: tenant.fullName || tenant.email || "Tenant",
        email: tenant.email,
      },
      property: tenant.property
        ? {
            id: tenant.property.id || tenant.tenantId,
            name: tenant.property.name,
            addressLine1: tenant.property.addressLine1,
          }
        : null,
    });
  }

  return Array.from(byTenant.values()).sort((a, b) => {
    const dateA = a.sentAt ? new Date(a.sentAt).getTime() : 0;
    const dateB = b.sentAt ? new Date(b.sentAt).getTime() : 0;
    return dateB - dateA;
  });
}

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
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
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
      const parsedUser: StoredUser = JSON.parse(userRaw);
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
    if (!checkingAuth) fetchInbox();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkingAuth]);

  useEffect(() => {
    if (checkingAuth) return;

    const interval = window.setInterval(() => {
      fetchInbox({ silent: true });
      if (selectedTenantId) {
        openThread(selectedTenantId, { silent: true });
      }
    }, 3000);

    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkingAuth, selectedTenantId]);

  async function fetchInbox(options: { silent?: boolean } = {}) {
    try {
      if (!options.silent) setLoadingInbox(true);
      if (!options.silent) setError("");

      const token = localStorage.getItem("token");

      const [inboxRes, tenantsRes] = await Promise.all([
        fetch(`${API_BASE}/api/communications`, {
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${token || ""}`,
          },
        }),
        fetch(`${API_BASE}/api/communications/tenants`, {
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${token || ""}`,
          },
        }),
      ]);

      const [inboxData, tenantsData] = await Promise.all([
        inboxRes.json().catch(() => null),
        tenantsRes.json().catch(() => null),
      ]);

      if (inboxRes.status === 401 || tenantsRes.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        router.replace("/");
        return;
      }

      if (!inboxRes.ok) {
        throw new Error(inboxData?.error || "Failed to load inbox");
      }

      if (!tenantsRes.ok) {
        throw new Error(tenantsData?.error || "Failed to load tenants");
      }

      const rows = Array.isArray(inboxData?.communications)
        ? inboxData.communications
        : [];
      const tenants = Array.isArray(tenantsData?.tenants)
        ? tenantsData.tenants
        : [];
      const merged = mergeConversationRows(rows, tenants);

      setInbox(merged);

      const firstTenantId = merged.find((m: InboxMessage) => m.tenantId)?.tenantId;

      if (!selectedTenantId && firstTenantId) {
        openThread(firstTenantId, { silent: options.silent });
      }
    } catch (err: any) {
      if (!options.silent) {
        setError(err?.message || "Failed to load inbox.");
      }
    } finally {
      if (!options.silent) setLoadingInbox(false);
    }
  }

  async function openThread(
    tenantId: string,
    options: { silent?: boolean } = {}
  ) {
    try {
      setSelectedTenantId(tenantId);
      if (!options.silent) {
        setLoadingThread(true);
        setError("");
        setSuccess("");
      }

      const token = localStorage.getItem("token");

      const res = await fetch(
        `${API_BASE}/api/communications/thread/${tenantId}`,
        {
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${token || ""}`,
          },
        }
      );

      const data = await res.json().catch(() => null);

      if (res.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        router.replace("/");
        return;
      }

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
      if (!options.silent) {
        setError(err?.message || "Failed to load conversation.");
      }
    } finally {
      if (!options.silent) setLoadingThread(false);
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

    if (!reply.trim() && selectedFiles.length === 0) {
      setError("Please write a reply or attach a file.");
      return;
    }

    try {
      setSending(true);

      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("message", reply.trim());
      selectedFiles.forEach((file) => formData.append("attachments", file));

      const res = await fetch(
        `${API_BASE}/api/communications/thread/${selectedTenantId}/reply`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token || ""}`,
          },
          body: formData,
        }
      );

      const data = await res.json().catch(() => null);

      if (res.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        router.replace("/");
        return;
      }

      if (!res.ok) {
        throw new Error(data?.error || "Failed to send reply");
      }

      if (data?.communication) {
        setThread((current) =>
          current
            ? {
                ...current,
                messages: current.messages.some(
                  (item) => item.id === data.communication.id
                )
                  ? current.messages
                  : [...current.messages, data.communication],
              }
            : current
        );
      }

      setReply("");
      setSelectedFiles([]);
      setSuccess("Reply sent successfully.");
      await openThread(selectedTenantId, { silent: true });
      await fetchInbox({ silent: true });
    } catch (err: any) {
      setError(err?.message || "Failed to send reply.");
    } finally {
      setSending(false);
    }
  }

  function handleAttachmentChange(files: FileList | null) {
    if (!files) return;

    const incoming = Array.from(files);
    const combined = [...selectedFiles, ...incoming].slice(0, 5);
    setSelectedFiles(combined);
    setError("");
  }

  const conversations = useMemo(() => {
    const grouped = new Map<string, InboxMessage>();

    for (const item of inbox) {
      if (!item.tenantId) continue;
      if (!grouped.has(item.tenantId)) grouped.set(item.tenantId, item);
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
    <AdminShell
      user={user}
      activeItem="communications"
      title="Tenant Conversations"
      subtitle="Inbox, conversation thread, and admin replies."
      actions={
        <button
          onClick={() => fetchInbox()}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      }
    >
      <div className="space-y-5">
        <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          <span className="font-semibold">Org ID:</span>{" "}
          <span className="font-mono">
            {user?.organizationId || "No organizationId"}
          </span>
        </div>

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {success}
          </div>
        )}

        <div className="grid min-h-[680px] overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 lg:grid-cols-[360px_1fr]">
          <aside className="border-b border-slate-200 bg-slate-50 lg:border-b-0 lg:border-r">
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

            <div className="max-h-[300px] overflow-y-auto lg:max-h-[610px]">
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
                              {item.sentAt
                                ? new Date(item.sentAt).toLocaleDateString()
                                : "New"}
                            </span>
                          </div>

                          <p className="truncate text-xs text-slate-500">
                            {item.property?.name ||
                              item.property?.addressLine1 ||
                              "Not linked"}
                          </p>

                          <p className="mt-1 truncate text-sm text-slate-600">
                            {item.direction === "OUTBOUND"
                              ? "You: "
                              : item.direction === "INTERNAL"
                              ? ""
                              : ""}
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
                  <h3 className="mt-4 text-xl font-bold">
                    Select a conversation
                  </h3>
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
                <div className="border-b border-slate-200 px-4 py-4 md:px-6">
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

                <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50 p-4 md:p-6">
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
                          className={`flex ${
                            isAdmin ? "justify-end" : "justify-start"
                          }`}
                        >
                          <div
                            className={`max-w-[90%] rounded-3xl px-5 py-3 shadow-sm md:max-w-[75%] ${
                              isAdmin
                                ? "bg-blue-700 text-white"
                                : "bg-white text-slate-800 ring-1 ring-slate-200"
                            }`}
                          >
                            <p className="whitespace-pre-wrap text-sm leading-6">
                              {msg.messageSummary}
                            </p>
                            <MessageAttachments
                              attachments={msg.attachments}
                              align={isAdmin ? "right" : "left"}
                            />
                            <p
                              className={`mt-2 text-[11px] ${
                                isAdmin ? "text-blue-100" : "text-slate-400"
                              }`}
                            >
                              {msg.senderName ||
                                (isAdmin ? "Management" : "Tenant")}{" "}
                              · {new Date(msg.sentAt).toLocaleString()}
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
                  {selectedFiles.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-2">
                      {selectedFiles.map((file, index) => (
                        <span
                          key={`${file.name}-${index}`}
                          className="inline-flex max-w-full items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600"
                        >
                          <span className="max-w-[220px] truncate">
                            {file.name}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedFiles((current) =>
                                current.filter(
                                  (_, fileIndex) => fileIndex !== index
                                )
                              )
                            }
                            className="rounded-full p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                            aria-label="Remove attachment"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <label className="inline-flex h-[52px] w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-slate-100 px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-200 sm:w-14 sm:px-0">
                      <Paperclip className="h-5 w-5" />
                      <span className="sm:hidden">Attach</span>
                      <input
                        type="file"
                        multiple
                        className="hidden"
                        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                        onChange={(event) => {
                          handleAttachmentChange(event.target.files);
                          event.target.value = "";
                        }}
                      />
                    </label>

                    <textarea
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      rows={2}
                      placeholder="Type a message..."
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
      </div>
    </AdminShell>
  );
}
