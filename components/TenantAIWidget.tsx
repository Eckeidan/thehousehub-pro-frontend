"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Send, X, Loader2 } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type ChatMessage = {
  role: "bot" | "user";
  text: string;
};

export default function TenantAIWidget() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "bot",
      text: "Hello 👋 I am your tenant assistant. You can ask me about your lease, payments, maintenance issues, or property information.",
    },
  ]);

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open]);

  async function sendMessage() {
    const text = message.trim();
    if (!text || sending) return;

    setMessage("");
    setMessages((prev) => [...prev, { role: "user", text }]);

    try {
      setSending(true);

      const token = localStorage.getItem("token");

      const res = await fetch(`${API_BASE}/api/tenant-chatbot/message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token || ""}`,
        },
        body: JSON.stringify({ message: text }),
      });

      const data = await res.json().catch(() => null);

      if (res.status === 401) {
        throw new Error("Your session has expired. Please login again.");
      }

      if (!res.ok) {
        throw new Error(data?.error || "AI Assistant failed to respond.");
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          text:
            data?.reply ||
            "I received your message, but I could not find enough tenant information to answer clearly.",
        },
      ]);
    } catch (error: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          text:
            error?.message ||
            "Sorry, I could not process your message right now.",
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-[9999] sm:bottom-6 sm:right-6">
      {open && (
        <div className="mb-4 flex h-[560px] w-[380px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between bg-slate-950 px-5 py-4 text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-600">
                <Bot className="h-5 w-5" />
              </div>

              <div>
                <p className="font-bold">Tenant AI Assistant</p>
                <p className="text-xs text-blue-100">Online now</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full bg-blue-600 p-2 text-white transition hover:bg-blue-700"
              title="Close AI Assistant"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50 p-4">
            {messages.map((item, index) => (
              <div
                key={`${item.role}-${index}`}
                className={`flex ${
                  item.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-3xl px-4 py-3 text-sm leading-6 shadow-sm ${
                    item.role === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-white text-slate-700 ring-1 ring-slate-200"
                  }`}
                >
                  {item.text}
                </div>
              </div>
            ))}

            {sending && (
              <div className="flex justify-start">
                <div className="inline-flex items-center gap-2 rounded-3xl bg-white px-4 py-3 text-sm text-slate-500 ring-1 ring-slate-200">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Thinking...
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          <div className="border-t border-slate-200 bg-white p-4">
            <div className="flex items-center gap-3">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Message..."
                rows={1}
                className="min-h-[52px] flex-1 resize-none rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />

              <button
                type="button"
                onClick={sendMessage}
                disabled={sending || !message.trim()}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                title="Send message"
              >
                {sending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="group relative flex justify-end">
        <div className="pointer-events-none absolute bottom-4 right-20 hidden whitespace-nowrap rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white shadow-lg group-hover:block">
          AI Assistant
        </div>

        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-white shadow-2xl transition hover:scale-105 hover:bg-blue-700"
          title="AI Assistant"
        >
          {open ? <X className="h-8 w-8" /> : <Bot className="h-7 w-7" />}
        </button>
      </div>
    </div>
  );
}