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
  ReceiptText,
  KeyRound,
  Activity,
} from "lucide-react";
import AdminShell from "@/components/AdminShell";
import {
  CURRENCY_OPTIONS,
  TIMEZONE_OPTIONS,
  buildOrganizationSettingsPayload,
  formatRentDueDay,
  getTenantPaymentMapping,
  normalizeOrganizationPaymentSettings,
  validateOrganizationPaymentSettings,
  type OrganizationPaymentSettings,
} from "@/lib/paymentSettingsContract";

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

      const settings = normalizeOrganizationPaymentSettings(data);

      setCompanyName(settings.companyName);
      setEmail(settings.email);
      setCurrency(settings.currency);
      setTimezone(settings.timezone);

      setLogoUrl(settings.logoUrl);
      setPrimaryColor(settings.primaryColor);
      setSupportEmail(settings.supportEmail);

      setBankName(settings.bankName);
      setBankAccountName(settings.bankAccountName);
      setBankAccountNumber(settings.bankAccountNumber);
      setPaymentInstructions(settings.paymentInstructions);
      setRentDueDay(settings.rentDueDay);
      setLateFeeAmount(settings.lateFeeAmount);

      setTenantAccessDefault(settings.tenantAccessDefault);
      setNotifications(settings.notifications);
      setMaintenanceAlerts(settings.maintenanceAlerts);
      setLeaseReminders(settings.leaseReminders);
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

    const validationErrors =
      validateOrganizationPaymentSettings(currentOrganizationSettings);

    if (validationErrors.length > 0) {
      showNotification(
        "error",
        "Check settings",
        validationErrors.join(" ")
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
        body: JSON.stringify(
          buildOrganizationSettingsPayload(currentOrganizationSettings)
        ),
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

  const currentOrganizationSettings = useMemo<OrganizationPaymentSettings>(
    () =>
      normalizeOrganizationPaymentSettings({
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
    [
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
    ]
  );

  const isError = notification.type === "error";
  const tenantPaymentPreview = useMemo(
    () => getTenantPaymentMapping(currentOrganizationSettings),
    [currentOrganizationSettings]
  );
  const profileCompletion = useMemo(() => {
    const configured = [companyName, email, supportEmail, logoUrl].filter(
      (value) => String(value || "").trim().length > 0
    ).length;

    return Math.round((configured / 4) * 100);
  }, [companyName, email, supportEmail, logoUrl]);
  const paymentCompletion = useMemo(() => {
    const configured = [
      bankName,
      bankAccountName,
      bankAccountNumber,
      paymentInstructions,
      rentDueDay,
    ].filter((value) => String(value || "").trim().length > 0).length;

    return Math.round((configured / 5) * 100);
  }, [
    bankName,
    bankAccountName,
    bankAccountNumber,
    paymentInstructions,
    rentDueDay,
  ]);
  const enabledAutomationCount = [
    notifications,
    maintenanceAlerts,
    leaseReminders,
    tenantAccessDefault,
  ].filter(Boolean).length;

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
          className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-slate-950/10 transition hover:-translate-y-0.5 hover:bg-blue-700 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60 dark:bg-white dark:text-slate-950 dark:hover:bg-blue-100"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
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

        <SettingsHero
          companyName={companyName || "The House Hub"}
          profileCompletion={profileCompletion}
          paymentCompletion={paymentCompletion}
          enabledAutomationCount={enabledAutomationCount}
          primaryColor={primaryColor}
          organizationId={user?.organizationId || "No organizationId"}
          canEditSettings={canEditSettings}
        />

        <div className={`grid gap-4 ${isSuperAdmin ? "lg:grid-cols-2" : ""}`}>
          <div className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm shadow-slate-200/70 dark:border-white/10 dark:bg-white/[0.04] dark:shadow-none">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-blue-50 p-3 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-slate-950 dark:text-white">
                  Organization-secured settings
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                  All changes stay scoped to this organization.
                </p>
                <p className="mt-3 truncate rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-emerald-700 dark:border-white/10 dark:bg-white/5 dark:text-emerald-300">
                  {user?.organizationId || "No organizationId"}
                </p>
              </div>
            </div>
          </div>

          {isSuperAdmin && (
            <div className="rounded-3xl border border-amber-100 bg-white p-5 shadow-sm shadow-slate-200/70 dark:border-white/10 dark:bg-white/[0.04] dark:shadow-none">
              <div className="flex items-start gap-4">
                <div className="rounded-2xl bg-amber-50 p-3 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold text-slate-950 dark:text-white">
                    Read-only Super Admin mode
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                    You can review organization settings and manage accounts, but
                    operational settings are editable only by the connected Admin.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <div className="rounded-[2rem] border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400">
            <div className="mx-auto flex w-fit items-center gap-3 rounded-2xl bg-slate-50 px-5 py-4 dark:bg-white/5">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading settings...
            </div>
          </div>
        ) : (
          <div className="grid gap-6 xl:grid-cols-12">
            <div className="space-y-6 xl:col-span-8">
              <SettingsCard
                icon={<Building2 className="h-5 w-5" />}
                title="Company Profile"
                description="Identity and contact details used across admin and tenant surfaces."
                color="blue"
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    label="Company name"
                    value={companyName}
                    disabled={!canEditSettings}
                    onChange={setCompanyName}
                    placeholder="The House Hub"
                    helper="Displayed in admin context and tenant-facing payment branding."
                    required
                  />
                  <Input
                    label="Company email"
                    value={email}
                    disabled={!canEditSettings}
                    onChange={setEmail}
                    placeholder="billing@company.com"
                    type="email"
                    helper="Used as fallback support contact when no support email is configured."
                    required
                    autoComplete="email"
                  />
                </div>
              </SettingsCard>

              <SettingsCard
                icon={<Palette className="h-5 w-5" />}
                title="Company Branding"
                description="Visual identity used on tenant-facing payment pages."
                color="indigo"
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    label="Logo URL"
                    value={logoUrl}
                    disabled={!canEditSettings}
                    onChange={setLogoUrl}
                    placeholder="https://example.com/logo.png"
                    helper="Shown on the tenant payment portal header when configured."
                  />
                  <Input
                    label="Support email"
                    value={supportEmail}
                    disabled={!canEditSettings}
                    onChange={setSupportEmail}
                    placeholder="support@company.com"
                    type="email"
                    helper="Tenant payment support uses this address first."
                    autoComplete="email"
                  />

                  <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4 shadow-inner shadow-white md:col-span-2 dark:border-white/10 dark:bg-white/[0.03] dark:shadow-none">
                    <label className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-100">
                      Primary Brand Color
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={primaryColor}
                        disabled={!canEditSettings}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="h-12 w-16 cursor-pointer rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/10"
                      />
                      <input
                        value={primaryColor}
                        disabled={!canEditSettings}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-70 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:focus:ring-blue-500/20"
                      />
                    </div>
                    <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                      Hex color used for tenant payment branding and primary
                      interface accents.
                    </p>

                    {logoUrl && (
                      <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-950/40">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
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
                description="Manual payment instructions mirrored directly on the tenant portal."
                color="emerald"
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    label="Bank / payment method"
                    value={bankName}
                    disabled={!canEditSettings}
                    onChange={setBankName}
                    placeholder="Bank of America, Zelle, CashApp..."
                    helper="Tenant sees this under Payment Details."
                  />
                  <Input
                    label="Account name"
                    value={bankAccountName}
                    disabled={!canEditSettings}
                    onChange={setBankAccountName}
                    placeholder="The House Hub LLC"
                    helper="Tenant sees this exactly as the account owner name."
                  />
                  <Input
                    label="Account / routing / wallet details"
                    value={bankAccountNumber}
                    disabled={!canEditSettings}
                    onChange={setBankAccountNumber}
                    placeholder="Account number, routing, Zelle, CashApp, or MoMo reference"
                    helper="Keep this complete enough for the tenant to make a manual payment."
                  />
                  <Input
                    label="Rent due day"
                    value={String(rentDueDay)}
                    disabled={!canEditSettings}
                    onChange={(v) => setRentDueDay(Number(v))}
                    placeholder="1"
                    type="number"
                    min={1}
                    max={31}
                    step={1}
                    helper="Day of the month shown on the tenant payment portal."
                    required
                  />
                  <Input
                    label="Late fee amount"
                    value={String(lateFeeAmount)}
                    disabled={!canEditSettings}
                    onChange={(v) => setLateFeeAmount(Number(v))}
                    placeholder="0"
                    type="number"
                    min={0}
                    step="0.01"
                    helper="Displayed to the tenant as the late payment fee."
                  />

                  <div className="md:col-span-2">
                    <TextareaField
                      label="Payment instructions"
                      helper="Tenant sees this text in the Payment Instructions section. Include deposit steps, reference rules, and approval expectations."
                      value={paymentInstructions}
                      disabled={!canEditSettings}
                      onChange={setPaymentInstructions}
                      placeholder="Example: Deposit rent by bank transfer, then upload receipt with tenant name and month in the reference."
                      rows={5}
                    />
                  </div>
                </div>

                <div className="mt-6 rounded-[2rem] border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-blue-50 p-5 shadow-sm dark:border-emerald-400/20 dark:from-emerald-950/30 dark:via-white/[0.04] dark:to-blue-950/20">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
                        Tenant portal mapping
                      </p>
                      <h4 className="mt-1 text-lg font-bold text-slate-950 dark:text-white">
                        Owner configuration → tenant payment screen
                      </h4>
                      <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                        These values are read by `/tenant/payments` from the
                        same organization-scoped settings record.
                      </p>
                    </div>
                    <div className="rounded-2xl border border-emerald-100 bg-white px-4 py-3 text-sm font-bold text-emerald-700 shadow-sm dark:border-white/10 dark:bg-white/10 dark:text-emerald-200">
                      Due: {formatRentDueDay(rentDueDay)}
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 md:grid-cols-2">
                    {tenantPaymentPreview.map((item) => (
                      <div
                        key={item.label}
                        className="rounded-3xl border border-white/80 bg-white/90 p-4 shadow-sm dark:border-white/10 dark:bg-slate-950/40"
                      >
                        <div className="flex flex-col gap-3">
                          <div>
                            <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                              {item.label}
                            </p>
                            <p className="mt-1 break-words text-sm font-bold text-slate-950 dark:text-white">
                              {item.ownerValue}
                            </p>
                          </div>
                          <p className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-white/10 dark:text-slate-300">
                            {item.tenantLocation}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </SettingsCard>

              <SettingsCard
                icon={<Settings className="h-5 w-5" />}
                title="System Preferences"
                description="Regional defaults used by reports, reminders and payment display."
                color="purple"
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <SelectField
                    label="Currency"
                    helper="Controls tenant-facing rent, late fee and payment history currency labels."
                    value={currency}
                    disabled={!canEditSettings}
                    onChange={setCurrency}
                    options={CURRENCY_OPTIONS}
                  />

                  <SelectField
                    label="Timezone"
                    helper="Used for organization scheduling and future payment reminders."
                    value={timezone}
                    disabled={!canEditSettings}
                    onChange={setTimezone}
                    options={TIMEZONE_OPTIONS}
                  />
                </div>
              </SettingsCard>

              <SettingsCard
                icon={<FileCheck className="h-5 w-5" />}
                title="Document Settings"
                description="Default tenant access behavior for document workflows."
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
                    description="Create operational accounts inside this organization."
                    color="indigo"
                  >
                    <form
                      onSubmit={handleCreateUser}
                      className="grid gap-4 md:grid-cols-2"
                    >
                      <Input
                        label="Full name"
                        value={newUserForm.fullName}
                        onChange={(v) =>
                          setNewUserForm((p) => ({ ...p, fullName: v }))
                        }
                        placeholder="Full Name"
                        helper="Name shown in admin account lists and audit trails."
                        required
                      />

                      <SelectField
                        label="Account role"
                        helper="Choose the operational permission profile for this user."
                        value={newUserForm.role}
                        onChange={(value) =>
                          setNewUserForm((p) => ({ ...p, role: value }))
                        }
                        options={[
                          { value: "ADMIN", label: "Admin" },
                          { value: "OWNER", label: "Owner" },
                        ]}
                      />

                      <Input
                        label="Email"
                        value={newUserForm.email}
                        onChange={(v) =>
                          setNewUserForm((p) => ({ ...p, email: v }))
                        }
                        placeholder="Email"
                        type="email"
                        helper="Login email for the new user."
                        required
                        autoComplete="email"
                      />

                      <Input
                        label="Temporary password"
                        value={newUserForm.password}
                        onChange={(v) =>
                          setNewUserForm((p) => ({ ...p, password: v }))
                        }
                        placeholder="Password"
                        type="password"
                        helper="Use at least 8 characters. The user can change it after login."
                        required
                        autoComplete="new-password"
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
                    description="Review account access, status and organization scope."
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

            <div className="space-y-6 xl:col-span-4">
              <SettingsCard
                icon={<Bell className="h-5 w-5" />}
                title="Notifications"
                description="Email and operational alerts for this organization."
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
                description="Protect this admin account with a fresh password."
                color="rose"
              >
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <Input
                    label="Current password"
                    value={passwordForm.currentPassword}
                    onChange={(v) =>
                      setPasswordForm((p) => ({
                        ...p,
                        currentPassword: v,
                      }))
                    }
                    placeholder="Current password"
                    type="password"
                    helper="Required to confirm this security-sensitive change."
                    autoComplete="current-password"
                  />

                  <Input
                    label="New password"
                    value={passwordForm.newPassword}
                    onChange={(v) =>
                      setPasswordForm((p) => ({
                        ...p,
                        newPassword: v,
                      }))
                    }
                    placeholder="New password"
                    type="password"
                    helper="Minimum 8 characters."
                    autoComplete="new-password"
                  />

                  <Input
                    label="Confirm new password"
                    value={passwordForm.confirmPassword}
                    onChange={(v) =>
                      setPasswordForm((p) => ({
                        ...p,
                        confirmPassword: v,
                      }))
                    }
                    placeholder="Confirm new password"
                    type="password"
                    helper="Must match the new password exactly."
                    autoComplete="new-password"
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
                description="Current platform health signals."
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

function SettingsHero({
  companyName,
  profileCompletion,
  paymentCompletion,
  enabledAutomationCount,
  primaryColor,
  organizationId,
  canEditSettings,
}: {
  companyName: string;
  profileCompletion: number;
  paymentCompletion: number;
  enabledAutomationCount: number;
  primaryColor: string;
  organizationId: string;
  canEditSettings: boolean;
}) {
  const accent = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(primaryColor)
    ? primaryColor
    : "#2563eb";

  return (
    <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm shadow-slate-200/80 dark:border-white/10 dark:bg-white/[0.04] dark:shadow-none">
      <div
        className="relative p-6 sm:p-7"
        style={{
          background: `linear-gradient(135deg, ${accent}18, transparent 42%, rgba(16,185,129,0.12))`,
        }}
      >
        <div className="absolute right-8 top-6 hidden h-28 w-28 rounded-full border border-white/70 bg-white/35 blur-2xl dark:border-white/10 dark:bg-white/10 md:block" />
        <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/75 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-600 shadow-sm dark:border-white/10 dark:bg-white/10 dark:text-slate-300">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Secure organization setup
            </div>

            <h3 className="mt-5 text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">
              {companyName}
            </h3>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300">
              Central place for profile, tenant payment visibility, access
              defaults, notifications and account security.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <HeroPill
                icon={<Activity className="h-4 w-4" />}
                label={canEditSettings ? "Editable" : "Read-only"}
              />
              <HeroPill
                icon={<KeyRound className="h-4 w-4" />}
                label={`Org ${organizationId}`}
                mono
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <HeroMetric
              label="Profile"
              value={`${profileCompletion}%`}
              icon={<Building2 className="h-4 w-4" />}
            />
            <HeroMetric
              label="Payment setup"
              value={`${paymentCompletion}%`}
              icon={<ReceiptText className="h-4 w-4" />}
            />
            <HeroMetric
              label="Automations"
              value={`${enabledAutomationCount}/4`}
              icon={<Bell className="h-4 w-4" />}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function HeroPill({
  icon,
  label,
  mono = false,
}: {
  icon: ReactNode;
  label: string;
  mono?: boolean;
}) {
  return (
    <span
      className={`inline-flex max-w-full items-center gap-2 rounded-full border border-slate-200 bg-white/85 px-3 py-2 text-xs font-bold text-slate-700 shadow-sm dark:border-white/10 dark:bg-white/10 dark:text-slate-200 ${
        mono ? "font-mono" : ""
      }`}
    >
      <span className="shrink-0 text-blue-600 dark:text-blue-300">{icon}</span>
      <span className="truncate">{label}</span>
    </span>
  );
}

function HeroMetric({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-white/80 bg-white/85 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-950/40">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {label}
        </p>
        <div className="rounded-2xl bg-blue-50 p-2 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300">
          {icon}
        </div>
      </div>
      <p className="mt-3 text-2xl font-black text-slate-950 dark:text-white">
        {value}
      </p>
    </div>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  label,
  helper,
  type = "text",
  disabled = false,
  min,
  max,
  step,
  required = false,
  autoComplete,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label?: string;
  helper?: string;
  type?: string;
  disabled?: boolean;
  min?: number;
  max?: number;
  step?: number | string;
  required?: boolean;
  autoComplete?: string;
}) {
  return (
    <div>
      {label && (
        <label className="mb-2 block text-sm font-bold text-slate-800 dark:text-slate-100">
          {label}
          {required && <span className="text-red-500"> *</span>}
        </label>
      )}
      <input
        type={type}
        value={value}
        disabled={disabled}
        min={min}
        max={max}
        step={step}
        required={required}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3.5 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-70 focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-100 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:placeholder:text-slate-500 dark:focus:border-blue-400 dark:focus:bg-white/[0.07] dark:focus:ring-blue-500/20"
      />
      {helper && (
        <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
          {helper}
        </p>
      )}
    </div>
  );
}

function TextareaField({
  label,
  helper,
  value,
  onChange,
  placeholder,
  disabled = false,
  rows = 5,
}: {
  label: string;
  helper?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
  rows?: number;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-slate-800 dark:text-slate-100">
        {label}
      </label>
      <textarea
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3.5 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-70 focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-100 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:placeholder:text-slate-500 dark:focus:border-blue-400 dark:focus:bg-white/[0.07] dark:focus:ring-blue-500/20"
      />
      {helper && (
        <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
          {helper}
        </p>
      )}
    </div>
  );
}

function SelectField({
  label,
  helper,
  value,
  onChange,
  options,
  disabled = false,
}: {
  label: string;
  helper?: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-slate-800 dark:text-slate-100">
        {label}
      </label>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3.5 text-sm font-medium text-slate-900 outline-none transition disabled:cursor-not-allowed disabled:opacity-70 focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-100 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:focus:border-blue-400 dark:focus:bg-white/[0.07] dark:focus:ring-blue-500/20"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {helper && (
        <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
          {helper}
        </p>
      )}
    </div>
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
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3.5 transition hover:border-blue-200 hover:bg-white dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-blue-400/30 dark:hover:bg-white/[0.07]">
      <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
        {label}
      </span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        className="peer sr-only"
      />
      <span
        className={`relative h-7 w-12 rounded-full transition ${
          checked ? "bg-blue-600" : "bg-slate-300 dark:bg-slate-700"
        } ${disabled ? "opacity-50" : ""}`}
      >
        <span
          className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow transition ${
            checked ? "translate-x-5" : ""
          }`}
        />
      </span>
    </label>
  );
}

function EmptyText({ text }: { text: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-6 text-sm text-slate-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-400">
      {text}
    </div>
  );
}

function SettingsCard({
  icon,
  title,
  description,
  color,
  children,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
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
    blue: "bg-blue-50 text-blue-600 ring-blue-100 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-400/20",
    purple:
      "bg-purple-50 text-purple-600 ring-purple-100 dark:bg-purple-500/10 dark:text-purple-300 dark:ring-purple-400/20",
    emerald:
      "bg-emerald-50 text-emerald-600 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/20",
    indigo:
      "bg-indigo-50 text-indigo-600 ring-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-300 dark:ring-indigo-400/20",
    sky: "bg-sky-50 text-sky-600 ring-sky-100 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-400/20",
    amber:
      "bg-amber-50 text-amber-600 ring-amber-100 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/20",
    rose: "bg-rose-50 text-rose-600 ring-rose-100 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-400/20",
  };

  return (
    <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm shadow-slate-200/70 transition dark:border-white/10 dark:bg-white/[0.04] dark:shadow-none">
      <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white p-5 dark:border-white/10 dark:from-white/[0.04] dark:to-transparent">
        <div className="flex items-start gap-3">
          <div className={`rounded-2xl p-3 ring-1 ${colorClasses[color]}`}>
            {icon}
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-950 dark:text-white">
              {title}
            </h3>
            {description && (
              <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                {description}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="p-5 sm:p-6">{children}</div>
    </section>
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
    green: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
    blue: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  };

  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3.5 dark:border-white/10 dark:bg-white/[0.04]">
      <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">
        {label}
      </span>
      <span
        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${colorClasses[color]}`}
      >
        {value}
      </span>
    </div>
  );
}
