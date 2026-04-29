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
  User,
  Mail,
  Phone,
  Shield,
  Save,
  Loader2,
} from "lucide-react";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type StoredUser = {
  id?: string;
  fullName?: string;
  name?: string;
  email?: string;
  role?: string;
};

export default function TenantSettingsPage() {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [user, setUser] = useState<StoredUser | null>(null);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [maintenanceAlerts, setMaintenanceAlerts] = useState(true);
  const [paymentReminders, setPaymentReminders] = useState(true);

  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);

  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userRaw = localStorage.getItem("user");

    if (!token || !userRaw) {
      router.replace("/");
      return;
    }

    try {
      const parsedUser: StoredUser = JSON.parse(userRaw);
      const role = String(parsedUser?.role || "").toLowerCase();

      if (role !== "tenant") {
        router.replace("/dashboard");
        return;
      }

      setUser(parsedUser);
      setFullName(parsedUser.fullName || parsedUser.name || "");
      setEmail(parsedUser.email || "");
      setChecking(false);
    } catch {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      router.replace("/");
    }
  }, [router]);

  async function handleProfileSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!fullName.trim()) {
      setError("Full name is required.");
      return;
    }

    try {
      setLoadingProfile(true);

      const token = localStorage.getItem("token");

      const res = await fetch(`${API_BASE}/api/tenant/settings/profile`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token || ""}`,
        },
        body: JSON.stringify({
          fullName: fullName.trim(),
          phone: phone.trim() || null,
          emailNotifications,
          smsNotifications,
          maintenanceAlerts,
          paymentReminders,
        }),
      });

      const data = await res.json().catch(() => null);

      if (res.status === 401) {
        setError("Session rejected. Please login again.");
        return;
      }

      if (!res.ok) {
        throw new Error(data?.error || "Failed to update profile.");
      }

      const updatedUser = {
        ...(user || {}),
        fullName: fullName.trim(),
        email,
      };

      localStorage.setItem("user", JSON.stringify(updatedUser));
      setUser(updatedUser);
      setSuccess("Profile settings updated successfully.");
    } catch (err: any) {
      setError(err?.message || "Failed to update profile.");
    } finally {
      setLoadingProfile(false);
    }
  }

  async function handlePasswordSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("Please fill all password fields.");
      return;
    }

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }

    try {
      setLoadingPassword(true);

      const token = localStorage.getItem("token");

      const res = await fetch(`${API_BASE}/api/tenant/settings/password`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token || ""}`,
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await res.json().catch(() => null);

      if (res.status === 401) {
        setError("Session rejected. Please login again.");
        return;
      }

      if (!res.ok) {
        throw new Error(data?.error || "Failed to change password.");
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccess("Password changed successfully.");
    } catch (err: any) {
      setError(err?.message || "Failed to change password.");
    } finally {
      setLoadingPassword(false);
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
              <TenantNav label="Contact Landlord" href="/tenant/contact" icon={<MessageCircle size={18} />} />
              <TenantNav label="Settings" href="/tenant/settings" icon={<Settings size={18} />} active />
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
            <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-blue-700">
              Account Center
            </span>
            <h2 className="mt-3 text-3xl font-bold">Tenant Settings</h2>
            <p className="mt-1 text-slate-500">
              Manage your profile, password, and notification preferences.
            </p>
          </header>

          <div className="p-6 md:p-8">
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

            <div className="grid gap-6 lg:grid-cols-3">
              <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 lg:col-span-2">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-blue-50 p-3 text-blue-700">
                    <User size={22} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Profile Information</h3>
                    <p className="text-sm text-slate-500">
                      Update your contact information.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleProfileSubmit} className="mt-6 space-y-5">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Full Name
                    </label>
                    <input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
                      <input
                        value={email}
                        disabled
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 pl-12 text-slate-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Phone
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
                      <input
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="Enter your phone number"
                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 pl-12 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Toggle label="Email Notifications" value={emailNotifications} onChange={setEmailNotifications} />
                    <Toggle label="SMS Notifications" value={smsNotifications} onChange={setSmsNotifications} />
                    <Toggle label="Maintenance Alerts" value={maintenanceAlerts} onChange={setMaintenanceAlerts} />
                    <Toggle label="Payment Reminders" value={paymentReminders} onChange={setPaymentReminders} />
                  </div>

                  <button
                    type="submit"
                    disabled={loadingProfile}
                    className="inline-flex items-center gap-2 rounded-2xl bg-blue-700 px-6 py-3 font-semibold text-white shadow-lg shadow-blue-200 hover:bg-blue-800 disabled:opacity-60"
                  >
                    {loadingProfile ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                    {loadingProfile ? "Saving..." : "Save Profile"}
                  </button>
                </form>
              </section>

              <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
                    <Shield size={22} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Password</h3>
                    <p className="text-sm text-slate-500">
                      Change your account password.
                    </p>
                  </div>
                </div>

                <form onSubmit={handlePasswordSubmit} className="mt-6 space-y-4">
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Current password"
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />

                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="New password"
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />

                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />

                  <button
                    type="submit"
                    disabled={loadingPassword}
                    className="w-full rounded-2xl bg-slate-900 px-5 py-3 font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                  >
                    {loadingPassword ? "Updating..." : "Change Password"}
                  </button>
                </form>
              </section>
            </div>
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

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
        value
          ? "border-blue-200 bg-blue-50 text-blue-700"
          : "border-slate-200 bg-slate-50 text-slate-500"
      }`}
    >
      <span>{label}</span>
      <span
        className={`h-5 w-10 rounded-full p-0.5 transition ${
          value ? "bg-blue-600" : "bg-slate-300"
        }`}
      >
        <span
          className={`block h-4 w-4 rounded-full bg-white transition ${
            value ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </span>
    </button>
  );
}