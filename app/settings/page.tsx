"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Shield,
  Database,
  Save,
  FileCheck,
  X,
  AlertCircle,
  CheckCircle2,
  Loader2,
  UserPlus,
  Lock,
  UserCog,
  Palette,
  CreditCard,
  Building2,
  Settings,
  ShieldCheck,
} from "lucide-react";
import AdminShell from "@/components/AdminShell";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type StoredUser = {
  id?: string;
  fullName?: string;
  name?: string;
  email?: string;
  role?: string;
  organizationId?: string;
};

type AppUser = {
  id: string;
  fullName?: string | null;
  name?: string | null;
  email: string;
  role: string;
  isActive?: boolean;
  organizationId?: string | null;
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

  const [logoUrl, setLogoUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#1f3270");
  const [supportEmail, setSupportEmail] = useState("");

  const [bankName, setBankName] = useState("");
  const [bankAccountName, setBankAccountName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [paymentInstructions, setPaymentInstructions] = useState("");
  const [rentDueDay, setRentDueDay] = useState(1);
  const [lateFeeAmount, setLateFeeAmount] = useState(0);

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

  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
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

  useEffect(() => {
    if (checkingAuth) return;
    fetchSettings();
  }, [checkingAuth]);

  useEffect(() => {
    if (checkingAuth || !isSuperAdmin) return;
    fetchUsers();
  }, [checkingAuth, isSuperAdmin]);

  async function fetchSettings() {
    try {
      setLoading(true);

      const token = localStorage.getItem("token");

      const res = await fetch(`${API_BASE}/api/settings`, {
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

      setLogoUrl(data?.logoUrl || "");
      setPrimaryColor(data?.primaryColor || "#1f3270");
      setSupportEmail(data?.supportEmail || "");

      setBankName(data?.bankName || "");
      setBankAccountName(data?.bankAccountName || "");
      setBankAccountNumber(data?.bankAccountNumber || "");
      setPaymentInstructions(data?.paymentInstructions || "");
      setRentDueDay(Number(data?.rentDueDay || 1));
      setLateFeeAmount(Number(data?.lateFeeAmount || 0));

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
    try {
      setUsersLoading(true);

      const token = localStorage.getItem("token");

      const res = await fetch(`${API_BASE}/api/users`, {
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

  async function handleSave() {
    if (!canEditSettings) {
      showNotification(
        "error",
        "Read-only access",
        "Only the connected Admin can modify organization settings."
      );
      return;
    }

    try {
      setSaving(true);

      const token = localStorage.getItem("token");

      const res = await fetch(`${API_BASE}/api/settings`, {
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
          logoUrl,
          primaryColor,
          supportEmail,
          bankName,
          bankAccountName,
          bankAccountNumber,
          paymentInstructions,
          rentDueDay,
          lateFeeAmount,
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
        "Your organization settings have been updated successfully."
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
        "Only Super Admin can create Admin and Owner accounts."
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

    try {
      setCreatingUser(true);

      const token = localStorage.getItem("token");

      const res = await fetch(`${API_BASE}/api/users`, {
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

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();

    if (
      !passwordForm.currentPassword.trim() ||
      !passwordForm.newPassword.trim() ||
      !passwordForm.confirmPassword.trim()
    ) {
      showNotification(
        "error",
        "Missing information",
        "Please fill all password fields."
      );
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      showNotification(
        "error",
        "Weak password",
        "New password must be at least 8 characters."
      );
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showNotification(
        "error",
        "Password mismatch",
        "New password and confirmation do not match."
      );
      return;
    }

    try {
      setChangingPassword(true);

      const token = localStorage.getItem("token");

      const res = await fetch(`${API_BASE}/api/auth/change-password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token || ""}`,
        },
        body: JSON.stringify(passwordForm),
      });

      if (res.status === 401) {
        handleUnauthorized();
        return;
      }

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "Failed to change password");
      }

      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

      showNotification(
        "success",
        "Password changed",
        "Your password has been updated successfully."
      );
    } catch (error: any) {
      showNotification(
        "error",
        "Unable to change password",
        error?.message || "Failed to change password"
      );
    } finally {
      setChangingPassword(false);
    }
  }

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

  const isError = notification.type === "error";

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-8">
        <div className="rounded-3xl border border-slate-200 bg-white px-8 py-6 text-slate-700 shadow-xl">
          <div className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Checking session...
          </div>
        </div>
      </div>
    );
  }

  return (
    <AdminShell
      user={user}
      activeItem="settings"
      title="Settings"
      subtitle="Configure organization profile, branding, payment settings, security and system preferences."
      actions={
        <button
          onClick={handleSave}
          disabled={!canEditSettings || saving || loading}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Save className="h-4 w-4" />
          {saving ? "Saving..." : "Save Settings"}
        </button>
      }
    >
      <div className="space-y-6">
        {notification.open && (
          <div className="fixed right-4 top-4 z-[110] w-[calc(100%-2rem)] max-w-md sm:right-6 sm:top-6">
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

        <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-4 text-sm text-blue-700">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">Organization-secured settings</p>
              <p className="mt-1">
                Current Org ID:{" "}
                <span className="font-mono">
                  {user?.organizationId || "No organizationId"}
                </span>
              </p>
            </div>
          </div>
        </div>

        {isSuperAdmin && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-700">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="font-semibold">Read-only Super Admin mode</p>
                <p className="mt-1">
                  You can review organization settings and manage accounts, but
                  operational settings are editable only by the connected Admin.
                </p>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">
            Loading settings...
          </div>
        ) : (
          <div className="grid gap-6 xl:grid-cols-3">
            <div className="space-y-6 xl:col-span-2">
              <SettingsCard
                icon={<Building2 className="h-5 w-5" />}
                title="Company Profile"
                color="blue"
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    value={companyName}
                    disabled={!canEditSettings}
                    onChange={setCompanyName}
                    placeholder="Company Name"
                  />
                  <Input
                    value={email}
                    disabled={!canEditSettings}
                    onChange={setEmail}
                    placeholder="Company Email"
                    type="email"
                  />
                </div>
              </SettingsCard>

              <SettingsCard
                icon={<Palette className="h-5 w-5" />}
                title="Company Branding"
                color="indigo"
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    value={logoUrl}
                    disabled={!canEditSettings}
                    onChange={setLogoUrl}
                    placeholder="Logo URL"
                  />
                  <Input
                    value={supportEmail}
                    disabled={!canEditSettings}
                    onChange={setSupportEmail}
                    placeholder="Support Email"
                    type="email"
                  />

                  <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Primary Brand Color
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={primaryColor}
                        disabled={!canEditSettings}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="h-12 w-16 cursor-pointer rounded-xl border border-slate-200 bg-white"
                      />
                      <input
                        value={primaryColor}
                        disabled={!canEditSettings}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none"
                      />
                    </div>

                    {logoUrl && (
                      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Logo Preview
                        </p>
                        <img
                          src={logoUrl}
                          alt="Company logo"
                          className="max-h-20 max-w-full object-contain"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </SettingsCard>

              <SettingsCard
                icon={<CreditCard className="h-5 w-5" />}
                title="Payment Settings"
                color="emerald"
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    value={bankName}
                    disabled={!canEditSettings}
                    onChange={setBankName}
                    placeholder="Bank Name"
                  />
                  <Input
                    value={bankAccountName}
                    disabled={!canEditSettings}
                    onChange={setBankAccountName}
                    placeholder="Account Name"
                  />
                  <Input
                    value={bankAccountNumber}
                    disabled={!canEditSettings}
                    onChange={setBankAccountNumber}
                    placeholder="Account Number / Routing / Zelle / CashApp"
                  />
                  <Input
                    value={String(rentDueDay)}
                    disabled={!canEditSettings}
                    onChange={(v) => setRentDueDay(Number(v))}
                    placeholder="Rent Due Day"
                    type="number"
                  />
                  <Input
                    value={String(lateFeeAmount)}
                    disabled={!canEditSettings}
                    onChange={(v) => setLateFeeAmount(Number(v))}
                    placeholder="Late Fee Amount"
                    type="number"
                  />

                  <textarea
                    value={paymentInstructions}
                    disabled={!canEditSettings}
                    onChange={(e) => setPaymentInstructions(e.target.value)}
                    placeholder="Payment instructions for tenants..."
                    rows={5}
                    className="md:col-span-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700 outline-none transition disabled:cursor-not-allowed disabled:opacity-70 focus:border-blue-600 focus:bg-white"
                  />
                </div>
              </SettingsCard>

              <SettingsCard
                icon={<Settings className="h-5 w-5" />}
                title="System Preferences"
                color="purple"
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <select
                    value={currency}
                    disabled={!canEditSettings}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700 outline-none transition disabled:cursor-not-allowed disabled:opacity-70 focus:border-blue-600 focus:bg-white"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="CDF">CDF</option>
                  </select>

                  <select
                    value={timezone}
                    disabled={!canEditSettings}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700 outline-none transition disabled:cursor-not-allowed disabled:opacity-70 focus:border-blue-600 focus:bg-white"
                  >
                    <option value="UTC">UTC</option>
                    <option value="Africa/Kinshasa">Africa/Kinshasa</option>
                    <option value="America/New_York">America/New_York</option>
                  </select>
                </div>
              </SettingsCard>

              <SettingsCard
                icon={<FileCheck className="h-5 w-5" />}
                title="Document Settings"
                color="emerald"
              >
                <Toggle
                  label="Allow tenant access by default"
                  checked={tenantAccessDefault}
                  disabled={!canEditSettings}
                  onChange={() =>
                    setTenantAccessDefault(!tenantAccessDefault)
                  }
                />
              </SettingsCard>

              {isSuperAdmin && (
                <>
                  <SettingsCard
                    icon={<UserPlus className="h-5 w-5" />}
                    title="Super Admin — Create Accounts"
                    color="indigo"
                  >
                    <form
                      onSubmit={handleCreateUser}
                      className="grid gap-4 md:grid-cols-2"
                    >
                      <Input
                        value={newUserForm.fullName}
                        onChange={(v) =>
                          setNewUserForm((p) => ({ ...p, fullName: v }))
                        }
                        placeholder="Full Name"
                      />

                      <select
                        value={newUserForm.role}
                        onChange={(e) =>
                          setNewUserForm((p) => ({
                            ...p,
                            role: e.target.value,
                          }))
                        }
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700 outline-none"
                      >
                        <option value="ADMIN">Admin</option>
                        <option value="OWNER">Owner</option>
                      </select>

                      <Input
                        value={newUserForm.email}
                        onChange={(v) =>
                          setNewUserForm((p) => ({ ...p, email: v }))
                        }
                        placeholder="Email"
                        type="email"
                      />

                      <Input
                        value={newUserForm.password}
                        onChange={(v) =>
                          setNewUserForm((p) => ({ ...p, password: v }))
                        }
                        placeholder="Password"
                        type="password"
                      />

                      <div className="md:col-span-2">
                        <button
                          type="submit"
                          disabled={creatingUser}
                          className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <UserPlus className="h-4 w-4" />
                          {creatingUser ? "Creating..." : "Create Account"}
                        </button>
                      </div>
                    </form>
                  </SettingsCard>

                  <SettingsCard
                    icon={<UserCog className="h-5 w-5" />}
                    title="User Management"
                    color="sky"
                  >
                    {usersLoading ? (
                      <EmptyText text="Loading users..." />
                    ) : sortedUsers.length === 0 ? (
                      <EmptyText text="No users found." />
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
                                <p className="mt-1 font-mono text-[11px] text-emerald-600">
                                  Org: {account.organizationId || "-"}
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
                  </SettingsCard>
                </>
              )}
            </div>

            <div className="space-y-6">
              <SettingsCard
                icon={<Bell className="h-5 w-5" />}
                title="Notifications"
                color="amber"
              >
                <div className="space-y-4">
                  <Toggle
                    label="Enable email notifications"
                    checked={notifications}
                    disabled={!canEditSettings}
                    onChange={() => setNotifications(!notifications)}
                  />
                  <Toggle
                    label="Maintenance alerts"
                    checked={maintenanceAlerts}
                    disabled={!canEditSettings}
                    onChange={() =>
                      setMaintenanceAlerts(!maintenanceAlerts)
                    }
                  />
                  <Toggle
                    label="Lease reminders"
                    checked={leaseReminders}
                    disabled={!canEditSettings}
                    onChange={() => setLeaseReminders(!leaseReminders)}
                  />
                </div>
              </SettingsCard>

              <SettingsCard
                icon={<Shield className="h-5 w-5" />}
                title="Security"
                color="rose"
              >
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <Input
                    value={passwordForm.currentPassword}
                    onChange={(v) =>
                      setPasswordForm((p) => ({
                        ...p,
                        currentPassword: v,
                      }))
                    }
                    placeholder="Current password"
                    type="password"
                  />

                  <Input
                    value={passwordForm.newPassword}
                    onChange={(v) =>
                      setPasswordForm((p) => ({
                        ...p,
                        newPassword: v,
                      }))
                    }
                    placeholder="New password"
                    type="password"
                  />

                  <Input
                    value={passwordForm.confirmPassword}
                    onChange={(v) =>
                      setPasswordForm((p) => ({
                        ...p,
                        confirmPassword: v,
                      }))
                    }
                    placeholder="Confirm new password"
                    type="password"
                  />

                  <button
                    type="submit"
                    disabled={changingPassword}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-red-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {changingPassword ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <Lock className="h-4 w-4" />
                        Change Password
                      </>
                    )}
                  </button>
                </form>
              </SettingsCard>

              <SettingsCard
                icon={<Database className="h-5 w-5" />}
                title="System Info"
                color="emerald"
              >
                <div className="space-y-4">
                  <StatusRow label="API Server" value="Online" color="green" />
                  <StatusRow
                    label="Database"
                    value="Connected"
                    color="green"
                  />
                  <StatusRow label="Version" value="v1.0" color="blue" />
                  <StatusRow
                    label="Environment"
                    value="Production"
                    color="amber"
                  />
                </div>
              </SettingsCard>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  type = "text",
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  disabled?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700 outline-none transition disabled:cursor-not-allowed disabled:opacity-70 focus:border-blue-600 focus:bg-white"
    />
  );
}

function Toggle({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        className="h-4 w-4"
      />
    </label>
  );
}

function EmptyText({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
      {text}
    </div>
  );
}

function SettingsCard({
  icon,
  title,
  color,
  children,
}: {
  icon: ReactNode;
  title: string;
  color:
    | "blue"
    | "purple"
    | "emerald"
    | "indigo"
    | "sky"
    | "amber"
    | "rose";
  children: ReactNode;
}) {
  const colorClasses: Record<typeof color, string> = {
    blue: "bg-blue-100 text-blue-600",
    purple: "bg-purple-100 text-purple-600",
    emerald: "bg-emerald-100 text-emerald-600",
    indigo: "bg-indigo-100 text-indigo-600",
    sky: "bg-sky-100 text-sky-600",
    amber: "bg-amber-100 text-amber-600",
    rose: "bg-rose-100 text-rose-600",
  };

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 p-6">
        <div className="flex items-center gap-3">
          <div className={`rounded-2xl p-3 ${colorClasses[color]}`}>
            {icon}
          </div>
          <h3 className="text-xl font-semibold text-slate-900">{title}</h3>
        </div>
      </div>

      <div className="p-6">{children}</div>
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
  const colorClasses: Record<"green" | "blue" | "amber", string> = {
    green: "bg-emerald-100 text-emerald-700",
    blue: "bg-blue-100 text-blue-700",
    amber: "bg-amber-100 text-amber-700",
  };

  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
      <span className="text-sm text-slate-600">{label}</span>
      <span
        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${colorClasses[color]}`}
      >
        {value}
      </span>
    </div>
  );
}