"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Home,
  Wallet,
  Wrench,
  FileText,
  Bell,
  MessageCircle,
  Settings,
  LogOut,
  Send,
  Loader2,
  Mail,
  Phone,
  MapPin,
} from "lucide-react";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type User = {
  fullName?: string;
  name?: string;
  email?: string;
  role?: string;
};

type ContactInfo = {
  landlord?: {
    fullName?: string;
    email?: string;
    phone?: string;
    office?: string;
  };
  property?: {
    name?: string;
    ownerName?: string;
    addressLine1?: string;
    city?: string;
    state?: string;
    country?: string;
  };
  unit?: {
    unitCode?: string;
    unitName?: string;
  };
};

export default function TenantContactPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingInfo, setLoadingInfo] = useState(true);

  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [contactInfo, setContactInfo] = useState<ContactInfo | null>(null);

  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userRaw = localStorage.getItem("user");

    if (!token || !userRaw) {
      router.replace("/");
      return;
    }

    try {
      const parsedUser = JSON.parse(userRaw);
      const role = String(parsedUser?.role || "").toLowerCase();

      if (role !== "tenant") {
        router.replace("/dashboard");
        return;
      }

      setUser(parsedUser);
      setChecking(false);
    } catch {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      router.replace("/");
    }
  }, [router]);

  useEffect(() => {
    if (!checking) {
      fetchContactInfo();
    }
  }, [checking]);

  async function fetchContactInfo() {
  try {
    setLoadingInfo(true);

    const token = localStorage.getItem("token");

    const res = await fetch(`${API_BASE}/api/tenant/contact`, {
      method: "GET",
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${token || ""}`,
      },
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      console.warn("Landlord info unavailable:", data);

      setContactInfo({
        landlord: {
          fullName: "Property Management",
          email: "support@thehousehub.app",
          phone: "Available in property settings",
          office: "Property management office",
        },
        property: {},
        unit: {},
      });

      return;
    }

    setContactInfo(data);
  } catch (err) {
    console.warn("Contact info fallback used:", err);

    setContactInfo({
      landlord: {
        fullName: "Property Management",
        email: "support@thehousehub.app",
        phone: "Available in property settings",
        office: "Property management office",
      },
      property: {},
      unit: {},
    });
  } finally {
    setLoadingInfo(false);
  }
}

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!subject.trim()) {
      setError("Please enter a subject.");
      return;
    }

    if (!message.trim()) {
      setError("Please enter your message.");
      return;
    }

    try {
      setLoading(true);

      const token = localStorage.getItem("token");

      const res = await fetch(`${API_BASE}/api/tenant/contact`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token || ""}`,
        },
        body: JSON.stringify({
          subject: subject.trim(),
          message: message.trim(),
        }),
      });

      const data = await res.json().catch(() => null);

      if (res.status === 401) {
        setError(
          "Session rejected by backend. Please login again using the same backend."
        );
        return;
      }

      if (!res.ok) {
        throw new Error(data?.error || "Failed to send message");
      }

      setSuccess("Your message has been sent successfully.");
      setSubject("");
      setMessage("");
    } catch (err: any) {
      setError(err?.message || "Failed to send message.");
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.replace("/");
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="rounded-2xl bg-white px-6 py-4 shadow">
          Checking session...
        </div>
      </div>
    );
  }

  const landlord = contactInfo?.landlord;
  const property = contactInfo?.property;
  const unit = contactInfo?.unit;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="flex min-h-screen">
        <aside className="fixed inset-y-0 left-0 hidden w-72 bg-gradient-to-b from-blue-950 via-blue-900 to-slate-900 text-white lg:flex lg:flex-col">
          <div className="border-b border-white/10 px-6 py-7">
            <h1 className="text-3xl font-bold">The House Hub</h1>
            <p className="mt-2 text-sm text-blue-100/70">Tenant Portal</p>
          </div>

          <nav className="flex-1 px-4 py-6">
            <div className="space-y-2">
              <TenantNav label="Overview" href="/tenant" icon={<Home size={18} />} />
              <TenantNav label="Payments" href="/tenant/payments" icon={<Wallet size={18} />} />
              <TenantNav label="Maintenance" href="/tenant/maintenance" icon={<Wrench size={18} />} />
              <TenantNav label="Documents" href="/tenant/documents" icon={<FileText size={18} />} />
              <TenantNav label="Notifications" href="/tenant/notifications" icon={<Bell size={18} />} />
              <TenantNav label="Contact Landlord" href="/tenant/contact" icon={<MessageCircle size={18} />} active />
              <TenantNav label="Settings" href="/tenant/settings" icon={<Settings size={18} />} />
            </div>
          </nav>

          <div className="border-t border-white/10 px-6 py-5">
            <p className="text-sm font-semibold">
              {user?.fullName || user?.name || "Tenant"}
            </p>
            <p className="text-xs text-blue-100/70">{user?.email}</p>

            <button
              onClick={logout}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200 hover:bg-red-500/20"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </aside>

        <main className="flex-1 lg:ml-72">
          <header className="border-b border-slate-200 bg-white px-6 py-6 md:px-8">
            <div>
              <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-blue-700">
                Contact Center
              </span>
              <h2 className="mt-3 text-3xl font-bold">Contact Landlord</h2>
              <p className="mt-1 text-slate-500">
                Send a message about your lease, payments, documents, or property.
              </p>
            </div>
          </header>

          <div className="grid gap-6 p-6 md:grid-cols-3 md:p-8">
            <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 md:col-span-2">
              <h3 className="text-xl font-bold">Send Message</h3>
              <p className="mt-1 text-sm text-slate-500">
                Your message will be saved in the communication history for the property management team.
              </p>

              {error && (
                <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {error}
                </div>
              )}

              {success && (
                <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {success}
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Subject
                  </label>
                  <input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Example: Question about my payment"
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Message
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={7}
                    placeholder="Write your message here..."
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-2xl bg-blue-700 px-6 py-3 font-semibold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <Send size={18} />
                  )}
                  {loading ? "Sending..." : "Send Message"}
                </button>
              </form>
            </section>

            <aside className="space-y-5">
              <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                <h3 className="text-lg font-bold">Landlord / Management</h3>

                {loadingInfo ? (
                  <div className="mt-5 flex items-center gap-2 text-sm text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading contact information...
                  </div>
                ) : (
                  <div className="mt-5 space-y-4 text-sm">
                    <div className="flex gap-3">
                      <MessageCircle className="h-5 w-5 text-blue-700" />
                      <div>
                        <p className="font-semibold">Name</p>
                        <p className="text-slate-500">
                          {landlord?.fullName || property?.ownerName || "Property Management"}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <Mail className="h-5 w-5 text-blue-700" />
                      <div>
                        <p className="font-semibold">Email</p>
                        <p className="text-slate-500">
                          {landlord?.email || "support@thehousehub.app"}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <Phone className="h-5 w-5 text-blue-700" />
                      <div>
                        <p className="font-semibold">Phone</p>
                        <p className="text-slate-500">
                          {landlord?.phone || "Available in property settings"}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <MapPin className="h-5 w-5 text-blue-700" />
                      <div>
                        <p className="font-semibold">Office / Property</p>
                        <p className="text-slate-500">
                          {landlord?.office ||
                            property?.addressLine1 ||
                            "Property management office"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                <h3 className="text-lg font-bold">Your Unit</h3>
                <div className="mt-4 space-y-2 text-sm text-slate-600">
                  <p>
                    <span className="font-semibold text-slate-800">Property:</span>{" "}
                    {property?.name || property?.addressLine1 || "Not available"}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-800">Unit:</span>{" "}
                    {unit?.unitName || unit?.unitCode || "Not available"}
                  </p>
                </div>
              </div>

              <div className="rounded-3xl border border-blue-100 bg-blue-50 p-6 text-sm text-blue-800">
                <p className="font-bold">Important</p>
                <p className="mt-2">
                  For urgent repairs, please submit a maintenance request from the Maintenance page.
                </p>
              </div>
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
}

function TenantNav({
  label,
  href,
  icon,
  active = false,
}: {
  label: string;
  href: string;
  icon: React.ReactNode;
  active?: boolean;
}) {
  return (
    <Link href={href}>
      <div
        className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${
          active
            ? "bg-white/15 text-white"
            : "text-blue-100/80 hover:bg-white/10 hover:text-white"
        }`}
      >
        {icon}
        {label}
      </div>
    </Link>
  );
}