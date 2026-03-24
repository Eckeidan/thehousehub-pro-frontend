"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Building2,
  FileText,
  Loader2,
  Pencil,
  AlertTriangle,
  DollarSign,
  Landmark,
  Home,
  BadgeCheck,
  DoorOpen,
  Layers3,
  UserPlus,
  RefreshCw,
  Copy,
  CheckCircle2,
  X,
  ShieldCheck,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type StoredUser = {
  id?: string;
  fullName?: string;
  name?: string;
  email?: string;
  role?: string;
};

type TenantStatus = "ACTIVE" | "INACTIVE" | "PENDING";
type LeaseStatus = "ACTIVE" | "EXPIRED" | "TERMINATED" | "PENDING";

interface Property {
  id: string;
  name?: string | null;
  code?: string | null;
  addressLine1?: string | null;
  city?: string | null;
  country?: string | null;
  monthlyRent?: string | number | null;
  currentValue?: string | number | null;
  occupancyStatus?: string | null;
}

interface Unit {
  id: string;
  unitCode: string;
  unitName?: string | null;
  floor?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  areaSqm?: string | number | null;
  monthlyRent?: string | number | null;
  occupancyStatus?: string | null;
  isActive?: boolean;
}

interface TenantUser {
  id: string;
  email?: string | null;
  fullName?: string | null;
  role?: string | null;
  isActive?: boolean;
  mustChangePassword?: boolean | null;
}

interface Tenant {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  status?: TenantStatus | null;
  isActive?: boolean | null;
  leaseStatus?: LeaseStatus | null;
  notes?: string | null;
  createdAt?: string;
  monthlyRent?: string | number | null;
  depositAmount?: string | number | null;
  leaseStartDate?: string | null;
  leaseEndDate?: string | null;
  property?: Property | null;
  unit?: Unit | null;
  user?: TenantUser | null;
}

function statusBadge(status: TenantStatus) {
  switch (status) {
    case "ACTIVE":
      return "bg-emerald-100 text-emerald-700 border border-emerald-200";
    case "INACTIVE":
      return "bg-slate-100 text-slate-700 border border-slate-200";
    case "PENDING":
      return "bg-amber-100 text-amber-700 border border-amber-200";
    default:
      return "bg-slate-100 text-slate-700 border border-slate-200";
  }
}

function leaseBadge(status?: LeaseStatus | null) {
  switch (status) {
    case "ACTIVE":
      return "bg-blue-100 text-blue-700 border border-blue-200";
    case "EXPIRED":
      return "bg-rose-100 text-rose-700 border border-rose-200";
    case "TERMINATED":
      return "bg-slate-100 text-slate-700 border border-slate-200";
    case "PENDING":
      return "bg-amber-100 text-amber-700 border border-amber-200";
    default:
      return "bg-gray-100 text-gray-600 border border-gray-200";
  }
}

function occupancyBadge(status?: string | null) {
  switch (status) {
    case "OCCUPIED":
      return "bg-blue-100 text-blue-700 border border-blue-200";
    case "AVAILABLE":
      return "bg-emerald-100 text-emerald-700 border border-emerald-200";
    case "VACANT":
      return "bg-amber-100 text-amber-700 border border-amber-200";
    case "RESERVED":
      return "bg-violet-100 text-violet-700 border border-violet-200";
    case "MAINTENANCE":
      return "bg-rose-100 text-rose-700 border border-rose-200";
    default:
      return "bg-gray-100 text-gray-600 border border-gray-200";
  }
}

function getTenantStatus(tenant: Tenant): TenantStatus {
  if (tenant.status) return tenant.status;
  if (tenant.isActive === false) return "INACTIVE";
  return "ACTIVE";
}

function getInitials(firstName?: string, lastName?: string) {
  return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
}

function formatMoney(value?: string | number | null) {
  if (value === null || value === undefined || value === "") return "N/A";

  const num = Number(value);
  if (Number.isNaN(num)) return `$${value}`;

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(num);
}

function generateRandomPassword(length = 10) {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnpqrstuvwxyz";
  const numbers = "23456789";
  const symbols = "@#$_-!";
  const all = upper + lower + numbers + symbols;

  let password = "";
  password += upper[Math.floor(Math.random() * upper.length)];
  password += lower[Math.floor(Math.random() * lower.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];

  for (let i = password.length; i < length; i++) {
    password += all[Math.floor(Math.random() * all.length)];
  }

  return password
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");
}

export default function TenantDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [user, setUser] = useState<StoredUser | null>(null);

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [movingOut, setMovingOut] = useState(false);
  const [showMoveOutModal, setShowMoveOutModal] = useState(false);
  const [error, setError] = useState("");

  const [showCreateAccountModal, setShowCreateAccountModal] = useState(false);
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [accountEmail, setAccountEmail] = useState("");
  const [accountPassword, setAccountPassword] = useState("");
  const [accountConfirmPassword, setAccountConfirmPassword] = useState("");
  const [accountMessage, setAccountMessage] = useState("");
  const [copied, setCopied] = useState(false);

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdPassword, setCreatedPassword] = useState("");
  const [passwordCopied, setPasswordCopied] = useState(false);

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
    } catch (authError) {
      console.error("Tenant detail auth error:", authError);
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      router.replace("/");
    }
  }, [router]);

  useEffect(() => {
    if (!checkingAuth && id) {
      fetchTenant();
    }
  }, [checkingAuth, id]);

  async function fetchTenant() {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("token");

      const res = await fetch(`${API_URL}/api/tenants/${id}`, {
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${token || ""}`,
        },
      });

      if (res.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        router.replace("/");
        return;
      }

      const contentType = res.headers.get("content-type") || "";

      if (!res.ok) {
        let errorMessage = "Failed to load tenant.";

        if (contentType.includes("application/json")) {
          const errData = await res.json();
          errorMessage =
            errData?.error ||
            errData?.message ||
            `Failed to load tenant. Server responded with ${res.status}.`;
        } else {
          const errText = await res.text();
          errorMessage =
            errText || `Failed to load tenant. Server responded with ${res.status}.`;
        }

        throw new Error(errorMessage);
      }

      const data = await res.json();
      setTenant(data);
    } catch (err) {
      console.error("Error fetching tenant:", err);
      setError(
        err instanceof Error ? err.message : "Unable to load tenant details."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleMoveOut() {
    try {
      setMovingOut(true);
      setError("");

      const token = localStorage.getItem("token");

      const res = await fetch(`${API_URL}/api/tenants/${id}/move-out`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token || ""}`,
        },
      });

      if (res.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        router.replace("/");
        return;
      }

      const contentType = res.headers.get("content-type") || "";

      if (!res.ok) {
        let errorMessage = "Failed to move out tenant.";

        if (contentType.includes("application/json")) {
          const errData = await res.json();
          errorMessage =
            errData?.error ||
            errData?.message ||
            `Failed to move out tenant. Server responded with ${res.status}.`;
        } else {
          const errText = await res.text();
          errorMessage =
            errText ||
            `Failed to move out tenant. Server responded with ${res.status}.`;
        }

        throw new Error(errorMessage);
      }

      setShowMoveOutModal(false);
      await fetchTenant();
    } catch (err) {
      console.error("Move out error:", err);
      setError(
        err instanceof Error ? err.message : "Failed to move out tenant."
      );
    } finally {
      setMovingOut(false);
    }
  }

  function openCreateAccountModal() {
    if (!tenant) return;

    const generatedPassword = generateRandomPassword(10);

    setAccountEmail(tenant.email || "");
    setAccountPassword(generatedPassword);
    setAccountConfirmPassword(generatedPassword);
    setAccountMessage("");
    setCopied(false);
    setShowCreateAccountModal(true);
  }

  function handleGenerateNewPassword() {
    const generatedPassword = generateRandomPassword(10);
    setAccountPassword(generatedPassword);
    setAccountConfirmPassword(generatedPassword);
    setCopied(false);
  }

  async function handleCopyPassword() {
    try {
      await navigator.clipboard.writeText(accountPassword);
      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (err) {
      console.error("Copy password error:", err);
    }
  }

  async function handleCopyCreatedPassword() {
    try {
      await navigator.clipboard.writeText(createdPassword);
      setPasswordCopied(true);

      setTimeout(() => {
        setPasswordCopied(false);
      }, 2000);
    } catch (err) {
      console.error("Copy created password error:", err);
    }
  }

  async function handleCreateTenantAccount() {
    if (!tenant) return;

    setAccountMessage("");

    if (!accountEmail.trim()) {
      setAccountMessage("Email is required.");
      return;
    }

    if (!accountPassword.trim()) {
      setAccountMessage("Password is required.");
      return;
    }

    if (accountPassword.length < 6) {
      setAccountMessage("Password must be at least 6 characters.");
      return;
    }

    if (accountPassword !== accountConfirmPassword) {
      setAccountMessage("Passwords do not match.");
      return;
    }

    try {
      setCreatingAccount(true);

      const token = localStorage.getItem("token");

      const passwordToStore = accountPassword;

      const res = await fetch(
        `${API_URL}/api/tenants/${tenant.id}/create-account`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token || ""}`,
          },
          body: JSON.stringify({
            email: accountEmail.trim(),
            password: passwordToStore,
            fullName: `${tenant.firstName} ${tenant.lastName}`.trim(),
          }),
        }
      );

      if (res.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        router.replace("/");
        return;
      }

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setAccountMessage(data?.error || "Failed to create tenant account.");
        return;
      }

      setShowCreateAccountModal(false);
      setAccountEmail("");
      setAccountPassword("");
      setAccountConfirmPassword("");
      setAccountMessage("");
      setCopied(false);

      await fetchTenant();

      setCreatedPassword(passwordToStore);
      setPasswordCopied(false);
      setShowSuccessModal(true);
    } catch (err: any) {
      console.error("Create tenant account error:", err);
      setAccountMessage(err?.message || "Failed to create tenant account.");
    } finally {
      setCreatingAccount(false);
    }
  }

  const normalizedRole = String(user?.role || "").trim().toUpperCase();
  const isSuperAdmin = normalizedRole === "OWNER";
  const canEdit = normalizedRole === "ADMIN";

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-8">
        <div className="rounded-3xl border border-slate-200 bg-white px-8 py-6 shadow-xl text-slate-700">
          Checking session...
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center px-6 py-20 text-slate-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading tenant details...
      </div>
    );
  }

  if (error || !tenant) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 p-6">
        <div className="flex items-center gap-3">
          <Link
            href="/tenants"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-blue-600"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>

          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              Tenant Details
            </h1>
            <p className="text-sm text-slate-500">
              Unable to display tenant record.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700">
          {error || "Tenant not found."}
        </div>
      </div>
    );
  }

  const resolvedStatus = getTenantStatus(tenant);
  const rentToDisplay = tenant.unit?.monthlyRent ?? tenant.property?.monthlyRent;
  const tenantHasAccount = !!tenant.user;

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <Link
            href="/tenants"
            className="mt-1 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-blue-600"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>

          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              {tenant.firstName} {tenant.lastName}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Tenant profile and account overview.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {canEdit && !tenantHasAccount && (
            <button
              onClick={openCreateAccountModal}
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-100"
            >
              <UserPlus className="h-4 w-4" />
              Create Account
            </button>
          )}

          {canEdit && (
            <button
              onClick={() => setShowMoveOutModal(true)}
              disabled={movingOut}
              className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 shadow-sm transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {movingOut ? "Moving out..." : "Move Out Tenant"}
            </button>
          )}

          {canEdit && (
            <Link
              href={`/tenants/edit/${tenant.id}`}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              <Pencil className="h-4 w-4" />
              Edit Tenant
            </Link>
          )}
        </div>
      </div>

      {isSuperAdmin && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-700">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">Read-only Super Admin mode</p>
              <p className="mt-1">
                You can review this tenant profile, but only Admin can edit,
                move out, or create account access for tenants.
              </p>
            </div>
          </div>
        </div>
      )}

      {tenantHasAccount && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-700">
          Tenant account exists:{" "}
          <span className="font-semibold">
            {tenant.user?.email || "No email"}
          </span>
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-xl font-bold text-blue-700">
              {getInitials(tenant.firstName, tenant.lastName)}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">
                {tenant.firstName} {tenant.lastName}
              </h2>
              <p className="text-sm text-slate-500">Tenant ID: #{tenant.id}</p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusBadge(
                resolvedStatus
              )}`}
            >
              {resolvedStatus}
            </span>

            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${leaseBadge(
                tenant.leaseStatus
              )}`}
            >
              {tenant.leaseStatus || "NO LEASE"}
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Contact Information
          </h3>

          <div className="mt-4 space-y-4">
            <div className="flex items-center gap-3 text-slate-700">
              <Mail className="h-4 w-4 text-slate-400" />
              <span>{tenant.email || "N/A"}</span>
            </div>

            <div className="flex items-center gap-3 text-slate-700">
              <Phone className="h-4 w-4 text-slate-400" />
              <span>{tenant.phone || "N/A"}</span>
            </div>

            {(tenant.emergencyContactName || tenant.emergencyContactPhone) && (
              <>
                <div className="border-t border-slate-100 pt-2">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Emergency Contact
                  </p>
                </div>

                {tenant.emergencyContactName && (
                  <div className="flex items-center gap-3 text-slate-700">
                    <User className="h-4 w-4 text-slate-400" />
                    <span>{tenant.emergencyContactName}</span>
                  </div>
                )}

                {tenant.emergencyContactPhone && (
                  <div className="flex items-center gap-3 text-slate-700">
                    <Phone className="h-4 w-4 text-slate-400" />
                    <span>{tenant.emergencyContactPhone}</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Property Assignment
          </h3>

          <div className="mt-4 space-y-4">
            <div className="flex items-center gap-3 text-slate-700">
              <Building2 className="h-4 w-4 text-slate-400" />
              <span>
                {tenant.property?.name || tenant.property?.code || "Not assigned"}
              </span>
            </div>

            <div className="flex items-center gap-3 text-slate-700">
              <Building2 className="h-4 w-4 text-slate-400" />
              <span>{tenant.property?.addressLine1 || "No address available"}</span>
            </div>

            <div className="flex items-center gap-3 text-slate-700">
              <Building2 className="h-4 w-4 text-slate-400" />
              <span>
                {[tenant.property?.city, tenant.property?.country]
                  .filter(Boolean)
                  .join(", ") || "N/A"}
              </span>
            </div>

            <div className="border-t border-slate-100 pt-3" />

            <div className="flex items-center gap-3 text-slate-700">
              <DoorOpen className="h-4 w-4 text-slate-400" />
              <span>
                {tenant.unit?.unitCode || "No unit assigned"}
                {tenant.unit?.unitName ? ` — ${tenant.unit.unitName}` : ""}
              </span>
            </div>

            <div className="flex items-center gap-3 text-slate-700">
              <Layers3 className="h-4 w-4 text-slate-400" />
              <span>
                Floor: {tenant.unit?.floor ?? "—"} | Beds/Baths:{" "}
                {tenant.unit?.bedrooms ?? "—"} / {tenant.unit?.bathrooms ?? "—"}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Financial Summary
          </h3>

          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-3 py-3">
              <div className="flex items-center gap-2 text-emerald-700">
                <DollarSign className="h-4 w-4" />
                <span className="text-sm font-medium">Unit Rent</span>
              </div>
              <span className="text-sm font-bold text-emerald-700">
                {formatMoney(rentToDisplay)}
              </span>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-violet-50 px-3 py-3">
              <div className="flex items-center gap-2 text-violet-700">
                <Landmark className="h-4 w-4" />
                <span className="text-sm font-medium">Property Value</span>
              </div>
              <span className="text-sm font-bold text-violet-700">
                {formatMoney(tenant.property?.currentValue)}
              </span>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-3">
              <div className="flex items-center gap-2 text-slate-700">
                <Home className="h-4 w-4" />
                <span className="text-sm font-medium">Unit Occupancy</span>
              </div>
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${occupancyBadge(
                  tenant.unit?.occupancyStatus
                )}`}
              >
                {tenant.unit?.occupancyStatus || "N/A"}
              </span>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-3">
              <div className="flex items-center gap-2 text-slate-700">
                <BadgeCheck className="h-4 w-4" />
                <span className="text-sm font-medium">Lease Status</span>
              </div>
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${leaseBadge(
                  tenant.leaseStatus
                )}`}
              >
                {tenant.leaseStatus || "N/A"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-800">
            Lease Information
          </h3>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Lease Status
              </p>
              <div className="mt-2">
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${leaseBadge(
                    tenant.leaseStatus
                  )}`}
                >
                  {tenant.leaseStatus || "N/A"}
                </span>
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Occupancy Period
              </p>
              <p className="mt-2 text-sm font-medium text-slate-800">
                {tenant.leaseStartDate && tenant.leaseEndDate
                  ? `${new Date(tenant.leaseStartDate).toLocaleDateString()} → ${new Date(
                      tenant.leaseEndDate
                    ).toLocaleDateString()}`
                  : tenant.leaseStartDate
                  ? `${new Date(tenant.leaseStartDate).toLocaleDateString()} → Present`
                  : "Not set"}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Lease Start
              </p>
              <p className="mt-2 text-sm font-medium text-slate-800">
                {tenant.leaseStartDate
                  ? new Date(tenant.leaseStartDate).toLocaleDateString()
                  : "Not set"}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Lease End
              </p>
              <p className="mt-2 text-sm font-medium text-slate-800">
                {tenant.leaseEndDate
                  ? new Date(tenant.leaseEndDate).toLocaleDateString()
                  : "Not set"}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-800">
            <FileText className="h-5 w-5 text-slate-500" />
            Notes & Remarks
          </h3>

          <div className="mt-4 min-h-[220px] rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
            {tenant.notes || "No notes available for this tenant."}
          </div>
        </div>
      </div>

      {showMoveOutModal && canEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                <AlertTriangle className="h-5 w-5" />
              </div>

              <div className="flex-1">
                <h2 className="text-xl font-bold text-slate-800">
                  Move Out Tenant
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Are you sure you want to move out{" "}
                  <span className="font-semibold text-slate-800">
                    {tenant.firstName} {tenant.lastName}
                  </span>
                  ? This will mark the tenant as inactive and set the unit as
                  available.
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowMoveOutModal(false)}
                disabled={movingOut}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>

              <button
                onClick={handleMoveOut}
                disabled={movingOut}
                className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {movingOut && <Loader2 className="h-4 w-4 animate-spin" />}
                {movingOut ? "Processing..." : "Confirm Move Out"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreateAccountModal && tenant && canEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-slate-800">
              Create Tenant Account
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Create a login account for{" "}
              <span className="font-semibold text-slate-700">
                {tenant.firstName} {tenant.lastName}
              </span>
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Email
                </label>
                <input
                  type="email"
                  value={accountEmail}
                  onChange={(e) => setAccountEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder="tenant@email.com"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Generated Password
                </label>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={accountPassword}
                    readOnly
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 outline-none"
                    placeholder="Generated password"
                  />

                  <button
                    type="button"
                    onClick={handleGenerateNewPassword}
                    className="inline-flex items-center gap-2 rounded-xl border border-blue-200 px-4 py-3 text-sm font-medium text-blue-700 transition hover:bg-blue-50"
                  >
                    <RefreshCw className="h-4 w-4" />
                    New
                  </button>
                </div>

                <div className="mt-2 flex items-center justify-between gap-2">
                  <p className="text-xs text-slate-500">
                    Auto-generated password. Tenant should change it after first
                    login.
                  </p>

                  <button
                    type="button"
                    onClick={handleCopyPassword}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Confirm Password
                </label>
                <input
                  type="text"
                  value={accountConfirmPassword}
                  readOnly
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 outline-none"
                  placeholder="Confirm password"
                />
              </div>

              {accountMessage && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {accountMessage}
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowCreateAccountModal(false)}
                disabled={creatingAccount}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>

              <button
                onClick={handleCreateTenantAccount}
                disabled={creatingAccount}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {creatingAccount ? "Creating..." : "Create Account"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSuccessModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <CheckCircle2 className="h-6 w-6" />
                </div>

                <div>
                  <h2 className="text-xl font-bold text-slate-800">
                    Tenant Account Created
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    The tenant login account has been created successfully.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowSuccessModal(false)}
                className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                Generated Password
              </p>

              <div className="mt-2 flex items-center justify-between gap-3 rounded-xl bg-white px-4 py-3">
                <span className="break-all font-mono text-sm font-semibold text-slate-800">
                  {createdPassword}
                </span>

                <button
                  type="button"
                  onClick={handleCopyCreatedPassword}
                  className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  <Copy className="h-3.5 w-3.5" />
                  {passwordCopied ? "Copied" : "Copy"}
                </button>
              </div>

              <p className="mt-3 text-xs leading-5 text-emerald-700">
                Please copy this password now and send it to the tenant. The
                tenant should change it after the first login.
              </p>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setShowSuccessModal(false)}
                className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}