"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Bot,
  Send,
  Loader2,
  User,
  ArrowLeft,
  Sparkles,
  ShieldCheck,
  Wrench,
} from "lucide-react";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type StoredUser = {
  id?: string;
  fullName?: string;
  name?: string;
  email?: string;
  role?: string;
  tenantId?: string;
  organizationId?: string;
};

type ChatMessage = {
  id: string;
  role: "tenant" | "assistant";
  text: string;
  action?: string;
};

export default function TenantChatbotPage() {
  const router = useRouter();
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [user, setUser] = useState<StoredUser | null>(null);

  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      text:
        "Hello, I am your Tenant AI Assistant. You can ask me about your lease, payments, documents, or report a maintenance issue like: my water is not working.",
    },
  ]);

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

      if (role !== "tenant") {
        router.replace("/dashboard");
        return;
      }

      setUser(parsedUser);
      setCheckingAuth(false);
    } catch (err) {
      console.error("Tenant chatbot auth error:", err);
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      router.replace("/");
    }
  }, [router]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  async function handleSend(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const cleanMessage = message.trim();
    if (!cleanMessage || sending) return;

    setError("");
    setMessage("");

    const tenantMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "tenant",
      text: cleanMessage,
    };

    setMessages((prev) => [...prev, tenantMessage]);

    try {
      setSending(true);

      const token = localStorage.getItem("token");

      const res = await fetch(`${API_BASE}/api/tenant-chatbot/message`, {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token || ""}`,
        },
        body: JSON.stringify({
          message: cleanMessage,
        }),
      });

      if (res.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        router.replace("/");
        return;
      }

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "AI assistant failed to respond.");
      }

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        text: data?.reply || "I have received your message.",
        action: data?.action,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      console.error("Tenant chatbot error:", err);
      setError(err?.message || "Unable to contact AI assistant.");

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text:
            "Sorry, I could not process your request right now. Please try again.",
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-8">
        <div className="rounded-3xl border border-slate-200 bg-white px-8 py-6 text-slate-700 shadow-xl">
          Checking session...
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <header className="mb-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <Link
                href="/tenant"
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>

              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                  <Sparkles className="h-3.5 w-3.5" />
                  Tenant AI Assistant
                </div>

                <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  AI Chatbot
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                  Ask questions or report maintenance issues directly.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
              <div className="flex items-center gap-2 font-semibold text-emerald-700">
                <ShieldCheck className="h-4 w-4" />
                Secured tenant context
              </div>
              <p className="mt-1 font-mono">
                Org: {user?.organizationId || "No organizationId"}
              </p>
            </div>
          </div>
        </header>

        <section className="mb-5 grid gap-4 sm:grid-cols-3">
          <InfoCard
            icon={<Bot className="h-5 w-5" />}
            title="Ask questions"
            text="Lease, rent, payments, documents."
          />
          <InfoCard
            icon={<Wrench className="h-5 w-5" />}
            title="Report issue"
            text="Water, electricity, AC, doors, etc."
          />
          <InfoCard
            icon={<ShieldCheck className="h-5 w-5" />}
            title="Private data"
            text="Only your tenant data is used."
          />
        </section>

        <section className="flex min-h-[600px] flex-1 flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="font-semibold text-slate-900">
              Conversation
            </h2>
            <p className="text-sm text-slate-500">
              Example: “My water is not working in the bathroom.”
            </p>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50 p-4 sm:p-6">
            {messages.map((item) => {
              const isTenant = item.role === "tenant";

              return (
                <div
                  key={item.id}
                  className={`flex ${isTenant ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`flex max-w-[85%] gap-3 sm:max-w-[75%] ${
                      isTenant ? "flex-row-reverse" : ""
                    }`}
                  >
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                        isTenant
                          ? "bg-blue-600 text-white"
                          : "bg-slate-900 text-white"
                      }`}
                    >
                      {isTenant ? (
                        <User className="h-4 w-4" />
                      ) : (
                        <Bot className="h-4 w-4" />
                      )}
                    </div>

                    <div
                      className={`rounded-3xl px-5 py-3 text-sm leading-6 shadow-sm ${
                        isTenant
                          ? "bg-blue-600 text-white"
                          : "border border-slate-200 bg-white text-slate-700"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{item.text}</p>

                      {item.action === "MAINTENANCE_CREATED" && (
                        <div className="mt-3 rounded-2xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                          Maintenance request created successfully.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {sending && (
              <div className="flex justify-start">
                <div className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-white px-5 py-3 text-sm text-slate-500 shadow-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Assistant is thinking...
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {error && (
            <div className="border-t border-red-100 bg-red-50 px-5 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form
            onSubmit={handleSend}
            className="border-t border-slate-200 bg-white p-4"
          >
            <div className="flex flex-col gap-3 sm:flex-row">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={2}
                placeholder="Write your message..."
                className="min-h-[56px] flex-1 resize-none rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />

              <button
                type="submit"
                disabled={sending || !message.trim()}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
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
        </section>
      </div>
    </main>
  );
}

function InfoCard({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="rounded-2xl bg-blue-50 p-3 text-blue-600">
          {icon}
        </div>
        <div>
          <p className="font-semibold text-slate-900">{title}</p>
          <p className="mt-1 text-sm text-slate-500">{text}</p>
        </div>
      </div>
    </div>
  );
}