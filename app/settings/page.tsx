"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  Building2,
  Users,
  Wallet,
  FileText,
  Brain,
  Settings,
  Wrench,
  Home,
  Bell,
  Shield,
  Database,
  Save,
  FileCheck,
  X,
  AlertCircle,
  CheckCircle2,
  LogOut,
  Loader2,
  UserPlus,
  Mail,
  Lock,
  UserCog,
} from "lucide-react";
import { useRouter } from "next/navigation";

const API_BASE = "http://localhost:4000/api";

type StoredUser = {
  id?: string;
  fullName?: string;
  name?: string;
  email?: string;
  role?: string;
};

type AppUser = {
  id: string;
  fullName?: string | null;
  name?: string | null;
  email: string;
  role: string;
  isActive?: boolean;
  createdAt?: string;
};

type NotificationState = {
  open: boolean;
  type: "success" | "error";
  title: string;
  message: string;
};

export default function SettingsPage() {
  const router = useRouter();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [user, setUser] = useState<StoredUser | null>(null);

  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [timezone, setTimezone] = useState("UTC");
  const [tenantAccessDefault, setTenantAccessDefault] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [maintenanceAlerts, setMaintenanceAlerts] = useState(true);
  const [leaseReminders, setLeaseReminders] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [usersLoading, setUsersLoading] = useState(false);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [creatingUser, setCreatingUser] = useState(false);

  const [newUserForm, setNewUserForm] = useState({
    fullName: "",
    email: "",
    password: "",
    role: "ADMIN",
  });

  const [notification, setNotification] = useState<NotificationState>({
    open: false,
    type: "error",
    title: "",
    message: "",
  });

  const normalizedRole = String(user?.role || "").trim().toUpperCase();
  const isSuperAdmin = normalizedRole === "OWNER";
  const canEditSettings = normalizedRole === "ADMIN";

  const displayRole =
    normalizedRole === "OWNER"
      ? "Super Admin"
      : normalizedRole === "ADMIN"
      ? "Admin"
      : "User";

  const initials =
    (user?.fullName || user?.name || "User")
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "US";

  function showNotification(
    type: "success" | "error",
    title: string,
    message: string
  ) {
    setNotification({ open: true, type, title, message });
  }

  const handleUnauthorized = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.replace("/");
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/";
  };

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

      if (role === "tenant") {
        router.replace("/tenant");
        return;
      }

      setUser(parsedUser);
      setCheckingAuth(false);
    } catch (error) {
      console.error("Settings auth error:", error);
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      router.replace("/");
    }
  }, [router]);

  useEffect(() => {
    if (!notification.open) return;
    const timer = setTimeout(() => {
      setNotification((prev) => ({ ...prev, open: false }));
    }, 4000);
    return () => clearTimeout(timer);
  }, [notification.open]);

  async function fetchSettings() {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      const res = await fetch(`${API_BASE}/settings`, {
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${token || ""}`,
        },
      });

      if (res.status === 401) {
        handleUnauthorized();
        return;
      }

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "Failed to load settings");
      }

      setCompanyName(data?.companyName || "");
      setEmail(data?.email || "");
      setCurrency(data?.currency || "USD");
      setTimezone(data?.timezone || "UTC");
      setTenantAccessDefault(Boolean(data?.tenantAccessDefault));
      setNotifications(Boolean(data?.notifications));
      setMaintenanceAlerts(Boolean(data?.maintenanceAlerts));
      setLeaseReminders(Boolean(data?.leaseReminders));
    } catch (error: any) {
      showNotification(
        "error",
        "Unable to load settings",
        error?.message || "Failed to load settings"
      );
    } finally {
      setLoading(false);
    }
  }

  async function fetchUsers() {
    if (!isSuperAdmin) return;

    try {
      setUsersLoading(true);
      const token = localStorage.getItem("token");

      const res = await fetch(`${API_BASE}/users`, {
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${token || ""}`,
        },
      });

      if (res.status === 401) {
        handleUnauthorized();
        return;
      }

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "Failed to load users");
      }

      setUsers(Array.isArray(data) ? data : []);
    } catch (error: any) {
      showNotification(
        "error",
        "Unable to load users",
        error?.message || "Failed to load users"
      );
    } finally {
      setUsersLoading(false);
    }
  }

  useEffect(() => {
    if (checkingAuth) return;
    fetchSettings();
  }, [checkingAuth]);

  useEffect(() => {
    if (checkingAuth || !isSuperAdmin) return;
    fetchUsers();
  }, [checkingAuth, isSuperAdmin]);

  async function handleSave() {
    if (!canEditSettings) {
      showNotification(
        "error",
        "Read-only access",
        "Only Admin can modify operational settings."
      );
      return;
    }

    try {
      setSaving(true);
      const token = localStorage.getItem("token");

      const res = await fetch(`${API_BASE}/settings`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token || ""}`,
        },
        body: JSON.stringify({
          companyName,
          email,
          currency,
          timezone,
          tenantAccessDefault,
          notifications,
          maintenanceAlerts,
          leaseReminders,
        }),
      });

      if (res.status === 401) {
        handleUnauthorized();
        return;
      }

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "Failed to save settings");
      }

      showNotification(
        "success",
        "Settings saved",
        "Your settings have been updated successfully."
      );
    } catch (error: any) {
      showNotification(
        "error",
        "Unable to save settings",
        error?.message || "Failed to save settings"
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();

    if (!isSuperAdmin) {
      showNotification(
        "error",
        "Access denied",
        "Only the Super Admin can create Admin and Owner accounts."
      );
      return;
    }

    if (
      !newUserForm.fullName.trim() ||
      !newUserForm.email.trim() ||
      !newUserForm.password.trim()
    ) {
      showNotification(
        "error",
        "Missing information",
        "Full name, email and password are required."
      );
      return;
    }

    if (newUserForm.password.trim().length < 6) {
      showNotification(
        "error",
        "Weak password",
        "Password must be at least 6 characters."
      );
      return;
    }

    try {
      setCreatingUser(true);
      const token = localStorage.getItem("token");

      const res = await fetch(`${API_BASE}/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token || ""}`,
        },
        body: JSON.stringify({
          fullName: newUserForm.fullName.trim(),
          email: newUserForm.email.trim(),
          password: newUserForm.password,
          role: newUserForm.role,
        }),
      });

      if (res.status === 401) {
        handleUnauthorized();
        return;
      }

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "Failed to create user");
      }

      setNewUserForm({
        fullName: "",
        email: "",
        password: "",
        role: "ADMIN",
      });

      showNotification(
        "success",
        "User created",
        `${data?.fullName || "New user"} has been created successfully.`
      );

      await fetchUsers();
    } catch (error: any) {
      showNotification(
        "error",
        "Unable to create user",
        error?.message || "Failed to create user"
      );
    } finally {
      setCreatingUser(false);
    }
  }

  const isError = notification.type === "error";

  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => {
      const roleA = String(a.role || "").toUpperCase();
      const roleB = String(b.role || "").toUpperCase();

      const order: Record<string, number> = {
        OWNER: 1,
        ADMIN: 2,
        TENANT: 3,
      };

      const roleCompare = (order[roleA] || 99) - (order[roleB] || 99);
      if (roleCompare !== 0) return roleCompare;

      const nameA = String(a.fullName || a.name || "").toLowerCase();
      const nameB = String(b.fullName || b.name || "").toLowerCase();

      return nameA.localeCompare(nameB);
    });
  }, [users]);

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-8">
        <div className="rounded-3xl border border-slate-200 bg-white px-8 py-6 shadow-xl text-slate-700">
          <div className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Checking session...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-300">
      {notification.open && (
        <div className="fixed right-6 top-6 z-[110] w-full max-w-md">
          <div
            className={`rounded-3xl border bg-white shadow-2xl ${
              isError ? "border-red-200" : "border-emerald-200"
            }`}
          >
            <div className="flex items-start gap-3 p-5">
              <div
                className={`mt-0.5 rounded-full p-2 ${
                  isError
                    ? "bg-red-100 text-red-600"
                    : "bg-emerald-100 text-emerald-600"
                }`}
              >
                {isError ? (
                  <AlertCircle className="h-5 w-5" />
                ) : (
                  <CheckCircle2 className="h-5 w-5" />
                )}
              </div>

              <div className="flex-1">
                <p
                  className={`text-sm font-semibold ${
                    isError ? "text-red-700" : "text-emerald-700"
                  }`}
                >
                  {notification.title}
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  {notification.message}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setNotification((prev) => ({ ...prev, open: false }))
                }
                className="rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 lg:flex lg:flex-col bg-gradient-to-b from-blue-950 via-blue-900 to-slate-900 text-white shadow-2xl">
        <div className="border-b border-white/10 px-6 py-7">
          <h1 className="text-3xl font-bold tracking-tight">PropertyOS</h1>
          <p className="mt-2 text-sm text-blue-100/70">
            Smart Property Management
          </p>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-6">
          <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-widest text-blue-200/50">
            Main Menu
          </p>

          <div className="space-y-2">
            <SidebarItem
              label="Dashboard"
              icon={<LayoutDashboard size={18} />}
              href="/dashboard"
            />
            <SidebarItem
              label="Properties"
              icon={<Building2 size={18} />}
              href="/properties"
            />
            <SidebarItem
              label="Tenants"
              icon={<Users size={18} />}
              href="/tenants"
            />
            <SidebarItem
              label="Units"
              icon={<Home size={18} />}
              href="/units"
            />
            <SidebarItem
              label="Maintenance"
              icon={<Wrench size={18} />}
              href="/maintenance"
            />
            <SidebarItem
              label="Financials"
              icon={<Wallet size={18} />}
              href="/payments"
            />
            <SidebarItem
              label="Documents"
              icon={<FileText size={18} />}
              href="/documents"
            />
            <SidebarItem
              label="AI Insights"
              icon={<Brain size={18} />}
              href="/insights"
            />
            <SidebarItem
              label="Settings"
              icon={<Settings size={18} />}
              active
              href="/settings"
            />
          </div>
        </nav>

        <div className="border-t border-white/10 px-6 py-5">
          <p className="text-xs uppercase tracking-widest text-blue-200/50">
            Current Role
          </p>
          <p className="mt-2 font-semibold">{displayRole}</p>

          <div className="mt-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 px-3 py-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-500 text-sm font-bold text-white">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">
                {user?.fullName || user?.name || "User"}
              </p>
              <p className="text-xs text-blue-100/80">{displayRole}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-200 transition hover:bg-red-500/20 hover:text-white"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </aside>

      <main className="min-h-screen px-4 py-6 lg:pl-[352px] lg:pr-7">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <h2 className="text-4xl font-bold tracking-tight text-slate-900">
                Settings
              </h2>
              <p className="mt-3 text-xl text-slate-500">
                Configure company details, system preferences, and security.
              </p>
            </div>

            <button
              onClick={handleSave}
              disabled={!canEditSettings || saving || loading}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#1f3270] px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-[#19295d] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save Settings"}
            </button>
          </div>

          {isSuperAdmin && (
            <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-700">
              Super Admin mode: you can review all settings and manage Admin /
              Owner accounts, but operational settings are read-only.
            </div>
          )}

          <div className="grid gap-6 xl:grid-cols-3">
            <div className="space-y-6 xl:col-span-2">
              <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-6 flex items-center gap-3">
                  <div className="rounded-2xl bg-blue-100 p-3 text-blue-600">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900">
                      Company Profile
                    </h3>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <input
                    type="text"
                    value={companyName}
                    disabled={!canEditSettings}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Company Name"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700 outline-none transition disabled:cursor-not-allowed disabled:opacity-70 focus:border-[#1f3270] focus:bg-white"
                  />
                  <input
                    type="email"
                    value={email}
                    disabled={!canEditSettings}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Company Email"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700 outline-none transition disabled:cursor-not-allowed disabled:opacity-70 focus:border-[#1f3270] focus:bg-white"
                  />
                </div>
              </div>

              <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-6 flex items-center gap-3">
                  <div className="rounded-2xl bg-purple-100 p-3 text-purple-600">
                    <Settings className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900">
                      System Preferences
                    </h3>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <select
                    value={currency}
                    disabled={!canEditSettings}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700 outline-none transition disabled:cursor-not-allowed disabled:opacity-70 focus:border-[#1f3270] focus:bg-white"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="CDF">CDF</option>
                  </select>

                  <select
                    value={timezone}
                    disabled={!canEditSettings}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700 outline-none transition disabled:cursor-not-allowed disabled:opacity-70 focus:border-[#1f3270] focus:bg-white"
                  >
                    <option value="UTC">UTC</option>
                    <option value="Africa/Kinshasa">Africa/Kinshasa</option>
                    <option value="America/New_York">America/New_York</option>
                  </select>
                </div>
              </div>

              <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-6 flex items-center gap-3">
                  <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-600">
                    <FileCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900">
                      Document Settings
                    </h3>
                  </div>
                </div>

                <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <input
                    type="checkbox"
                    checked={tenantAccessDefault}
                    disabled={!canEditSettings}
                    onChange={() =>
                      setTenantAccessDefault(!tenantAccessDefault)
                    }
                    className="h-4 w-4"
                  />
                  <span className="text-sm font-medium text-slate-700">
                    Allow tenant access by default
                  </span>
                </label>
              </div>

              {isSuperAdmin && (
                <>
                  <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="mb-6 flex items-center gap-3">
                      <div className="rounded-2xl bg-indigo-100 p-3 text-indigo-600">
                        <UserPlus className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-slate-900">
                          Super Admin — Create Accounts
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                          Only the Super Admin can create Admin and Owner
                          accounts.
                        </p>
                      </div>
                    </div>

                    <form
                      onSubmit={handleCreateUser}
                      className="grid gap-4 md:grid-cols-2"
                    >
                      <input
                        type="text"
                        value={newUserForm.fullName}
                        onChange={(e) =>
                          setNewUserForm((prev) => ({
                            ...prev,
                            fullName: e.target.value,
                          }))
                        }
                        placeholder="Full Name"
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700 outline-none transition focus:border-[#1f3270] focus:bg-white"
                      />

                      <select
                        value={newUserForm.role}
                        onChange={(e) =>
                          setNewUserForm((prev) => ({
                            ...prev,
                            role: e.target.value,
                          }))
                        }
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700 outline-none transition focus:border-[#1f3270] focus:bg-white"
                      >
                        <option value="ADMIN">Admin</option>
                        <option value="OWNER">Owner</option>
                      </select>

                      <div className="relative">
                        <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          type="email"
                          value={newUserForm.email}
                          onChange={(e) =>
                            setNewUserForm((prev) => ({
                              ...prev,
                              email: e.target.value,
                            }))
                          }
                          placeholder="Email"
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-4 pl-11 pr-4 text-sm text-slate-700 outline-none transition focus:border-[#1f3270] focus:bg-white"
                        />
                      </div>

                      <div className="relative">
                        <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          type="password"
                          value={newUserForm.password}
                          onChange={(e) =>
                            setNewUserForm((prev) => ({
                              ...prev,
                              password: e.target.value,
                            }))
                          }
                          placeholder="Password"
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-4 pl-11 pr-4 text-sm text-slate-700 outline-none transition focus:border-[#1f3270] focus:bg-white"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <button
                          type="submit"
                          disabled={creatingUser}
                          className="inline-flex items-center gap-2 rounded-2xl bg-[#1f3270] px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-[#19295d] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <UserPlus className="h-4 w-4" />
                          {creatingUser ? "Creating..." : "Create Account"}
                        </button>
                      </div>
                    </form>
                  </div>

                  <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="mb-6 flex items-center gap-3">
                      <div className="rounded-2xl bg-sky-100 p-3 text-sky-600">
                        <UserCog className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-slate-900">
                          User Management
                        </h3>
                      </div>
                    </div>

                    {usersLoading ? (
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                        Loading users...
                      </div>
                    ) : sortedUsers.length === 0 ? (
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                        No users found.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {sortedUsers.map((account) => {
                          const accountRole = String(
                            account.role || ""
                          ).toUpperCase();

                          const badgeClass =
                            accountRole === "OWNER"
                              ? "bg-purple-100 text-purple-700"
                              : accountRole === "ADMIN"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-slate-100 text-slate-700";

                          return (
                            <div
                              key={account.id}
                              className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 md:flex-row md:items-center md:justify-between"
                            >
                              <div>
                                <p className="font-semibold text-slate-900">
                                  {account.fullName ||
                                    account.name ||
                                    "Unnamed user"}
                                </p>
                                <p className="text-sm text-slate-500">
                                  {account.email}
                                </p>
                              </div>

                              <div className="flex items-center gap-3">
                                <span
                                  className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${badgeClass}`}
                                >
                                  {accountRole === "OWNER"
                                    ? "SUPER ADMIN"
                                    : accountRole}
                                </span>
                                <span
                                  className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                                    account.isActive === false
                                      ? "bg-red-100 text-red-700"
                                      : "bg-emerald-100 text-emerald-700"
                                  }`}
                                >
                                  {account.isActive === false
                                    ? "Inactive"
                                    : "Active"}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="space-y-6">
              <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-6 flex items-center gap-3">
                  <div className="rounded-2xl bg-amber-100 p-3 text-amber-600">
                    <Bell className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900">
                      Notifications
                    </h3>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                    <span className="text-sm font-medium text-slate-700">
                      Enable email notifications
                    </span>
                    <input
                      type="checkbox"
                      checked={notifications}
                      disabled={!canEditSettings}
                      onChange={() => setNotifications(!notifications)}
                      className="h-4 w-4"
                    />
                  </label>

                  <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                    <span className="text-sm font-medium text-slate-700">
                      Maintenance alerts
                    </span>
                    <input
                      type="checkbox"
                      checked={maintenanceAlerts}
                      disabled={!canEditSettings}
                      onChange={() => setMaintenanceAlerts(!maintenanceAlerts)}
                      className="h-4 w-4"
                    />
                  </label>

                  <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                    <span className="text-sm font-medium text-slate-700">
                      Lease reminders
                    </span>
                    <input
                      type="checkbox"
                      checked={leaseReminders}
                      disabled={!canEditSettings}
                      onChange={() => setLeaseReminders(!leaseReminders)}
                      className="h-4 w-4"
                    />
                  </label>
                </div>
              </div>

              <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-6 flex items-center gap-3">
                  <div className="rounded-2xl bg-red-100 p-3 text-red-600">
                    <Shield className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900">
                      Security
                    </h3>
                  </div>
                </div>

                <button className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
                  Change Password
                </button>
              </div>

              <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-6 flex items-center gap-3">
                  <div className="rounded-2xl bg-green-100 p-3 text-green-600">
                    <Database className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900">
                      System Info
                    </h3>
                  </div>
                </div>

                <div className="space-y-4">
                  <StatusRow label="API Server" value="Online" color="green" />
                  <StatusRow label="Database" value="Connected" color="green" />
                  <StatusRow label="Version" value="v1.0" color="blue" />
                  <StatusRow
                    label="Environment"
                    value="Production"
                    color="amber"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function StatusRow({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: "green" | "blue" | "amber";
}) {
  const colorClasses =
    color === "green"
      ? "bg-emerald-100 text-emerald-700"
      : color === "blue"
      ? "bg-blue-100 text-blue-700"
      : "bg-amber-100 text-amber-700";

  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
      <span className="text-sm text-slate-600">{label}</span>
      <span
        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${colorClasses}`}
      >
        {value}
      </span>
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
  icon: ReactNode;
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