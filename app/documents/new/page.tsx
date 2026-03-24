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
  ArrowLeft,
  RefreshCw,
  Wrench,
  Home,
  X,
  AlertCircle,
  CheckCircle2,
  Upload,
  FileUp,
  LogOut,
  Loader2,
} from "lucide-react";
import { useRouter } from "next/navigation";

type StoredUser = {
  id?: string;
  fullName?: string;
  name?: string;
  email?: string;
  role?: string;
};

type PropertyOption = {
  id: string;
  code?: string | null;
  name?: string | null;
};

type TenantOption = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
};

type NotificationState = {
  open: boolean;
  type: "success" | "error";
  title: string;
  message: string;
};

const API_BASE = "http://localhost:4000/api";

export default function NewDocumentPage() {
  const router = useRouter();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [user, setUser] = useState<StoredUser | null>(null);

  const [properties, setProperties] = useState<PropertyOption[]>([]);
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [notification, setNotification] = useState<NotificationState>({
    open: false,
    type: "error",
    title: "",
    message: "",
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [form, setForm] = useState({
    documentName: "",
    type: "OTHER",
    propertyId: "",
    tenantId: "",
    accessibleToTenant: false,
    uploadedBy: "",
    notes: "",
  });

  function showNotification(
    type: "success" | "error",
    title: string,
    message: string
  ) {
    setNotification({
      open: true,
      type,
      title,
      message,
    });
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

      setForm((prev) => ({
        ...prev,
        uploadedBy:
          parsedUser.fullName ||
          parsedUser.name ||
          parsedUser.email ||
          "Owner / Admin",
      }));

      setCheckingAuth(false);
    } catch (error) {
      console.error("Documents new auth error:", error);
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

  async function fetchLookupData() {
    try {
      setLoadingData(true);

      const token = localStorage.getItem("token");

      const [propertiesRes, tenantsRes] = await Promise.all([
        fetch(`${API_BASE}/properties`, {
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${token || ""}`,
          },
        }),
        fetch(`${API_BASE}/tenants`, {
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${token || ""}`,
          },
        }),
      ]);

      if (propertiesRes.status === 401 || tenantsRes.status === 401) {
        handleUnauthorized();
        return;
      }

      const propertiesData = await propertiesRes.json().catch(() => []);
      const tenantsData = await tenantsRes.json().catch(() => []);

      if (!propertiesRes.ok) {
        throw new Error(
          propertiesData?.error || "Failed to load properties."
        );
      }

      if (!tenantsRes.ok) {
        throw new Error(tenantsData?.error || "Failed to load tenants.");
      }

      setProperties(Array.isArray(propertiesData) ? propertiesData : []);
      setTenants(Array.isArray(tenantsData) ? tenantsData : []);
    } catch (error: any) {
      console.error("Failed to load lookup data:", error);
      setProperties([]);
      setTenants([]);
      showNotification(
        "error",
        "Unable to load form data",
        error?.message ||
          "Properties and tenants could not be loaded. Please refresh and try again."
      );
    } finally {
      setLoadingData(false);
    }
  }

  useEffect(() => {
    if (checkingAuth) return;
    fetchLookupData();
  }, [checkingAuth]);

  const selectedPropertyLabel = useMemo(() => {
    const property = properties.find((item) => item.id === form.propertyId);
    if (!property) return "-";
    return property.code || property.name || "Selected property";
  }, [properties, form.propertyId]);

  const selectedTenantLabel = useMemo(() => {
    const tenant = tenants.find((item) => item.id === form.tenantId);
    if (!tenant) return "-";
    return (
      `${tenant.firstName || ""} ${tenant.lastName || ""}`.trim() ||
      "Selected tenant"
    );
  }, [tenants, form.tenantId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setNotification((prev) => ({ ...prev, open: false }));

    if (!form.documentName.trim()) {
      showNotification(
        "error",
        "Missing document name",
        "Document name is required."
      );
      return;
    }

    if (!selectedFile) {
      showNotification(
        "error",
        "Missing file",
        "Please select a file to upload."
      );
      return;
    }

    try {
      setSubmitting(true);

      const token = localStorage.getItem("token");

      const body = new FormData();
      body.append("file", selectedFile);
      body.append("documentName", form.documentName.trim());
      body.append("type", form.type);
      body.append("propertyId", form.propertyId || "");
      body.append("tenantId", form.tenantId || "");
      body.append("accessibleToTenant", String(form.accessibleToTenant));
      body.append("uploadedBy", form.uploadedBy.trim());
      body.append("notes", form.notes.trim());

      const res = await fetch(`${API_BASE}/documents`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token || ""}`,
        },
        body,
      });

      if (res.status === 401) {
        handleUnauthorized();
        return;
      }

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        showNotification(
          "error",
          "Unable to upload document",
          data?.error || "Failed to upload document."
        );
        return;
      }

      showNotification(
        "success",
        "Document uploaded",
        "The document has been uploaded successfully."
      );

      setTimeout(() => {
        router.push("/documents");
      }, 1200);
    } catch (error: any) {
      console.error("Failed to upload document:", error);
      showNotification(
        "error",
        "Unable to upload document",
        error?.message || "Failed to upload document."
      );
    } finally {
      setSubmitting(false);
    }
  }

  const isError = notification.type === "error";

  const initials =
    (user?.fullName || user?.name || "User")
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "US";

  const displayRole =
    String(user?.role || "").trim().toUpperCase() === "ADMIN"
      ? "Admin"
      : "Owner";

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
    <div className="min-h-screen bg-[#eef2f7]">
      {notification.open && (
        <div className="fixed right-6 top-6 z-[110] w-full max-w-md animate-[slideIn_.25s_ease-out]">
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

            <div
              className={`h-1 w-full overflow-hidden rounded-b-3xl ${
                isError ? "bg-red-100" : "bg-emerald-100"
              }`}
            >
              <div
                className={`h-full w-full origin-left animate-[shrinkBar_4s_linear_forwards] ${
                  isError ? "bg-red-500" : "bg-emerald-500"
                }`}
              />
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-12px) translateX(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0) translateX(0);
          }
        }

        @keyframes shrinkBar {
          from {
            transform: scaleX(1);
          }
          to {
            transform: scaleX(0);
          }
        }
      `}</style>

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
              active
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

      <main className="min-h-screen px-6 py-8 lg:pl-[320px] lg:pr-8">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <div className="mb-4">
                <Link
                  href="/documents"
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Documents
                </Link>
              </div>

              <h2 className="text-5xl font-bold tracking-tight text-slate-900">
                Upload Document
              </h2>
              <p className="mt-3 text-xl text-slate-500">
                Upload lease files, tenant records, and property documents.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={fetchLookupData}
                type="button"
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh Data
              </button>

              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                  {initials}
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-semibold text-slate-900">
                    {user?.fullName || user?.name || "User"}
                  </p>
                  <p className="text-xs text-slate-500">{displayRole}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Document Name
                  </label>
                  <input
                    type="text"
                    value={form.documentName}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        documentName: e.target.value,
                      }))
                    }
                    placeholder="Enter document name"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-[15px] text-slate-700 outline-none transition focus:border-[#1f3270] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Document Type
                  </label>
                  <select
                    value={form.type}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        type: e.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-[15px] text-slate-700 outline-none transition focus:border-[#1f3270] focus:bg-white"
                  >
                    <option value="OTHER">Other</option>
                    <option value="LEASE">Lease</option>
                    <option value="INVOICE">Invoice</option>
                    <option value="RECEIPT">Receipt</option>
                    <option value="INSPECTION">Inspection</option>
                    <option value="IDENTITY">Identity</option>
                    <option value="MOVE_IN_CHECKLIST">Move-in Checklist</option>
                    <option value="NOTICE">Notice</option>
                    <option value="PHOTO">Photo</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Uploaded By
                  </label>
                  <input
                    type="text"
                    value={form.uploadedBy}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        uploadedBy: e.target.value,
                      }))
                    }
                    placeholder="e.g. Owner / Admin"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-[15px] text-slate-700 outline-none transition focus:border-[#1f3270] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Property
                  </label>
                  <select
                    value={form.propertyId}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        propertyId: e.target.value,
                      }))
                    }
                    disabled={loadingData}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-[15px] text-slate-700 outline-none transition focus:border-[#1f3270] focus:bg-white disabled:opacity-60"
                  >
                    <option value="">
                      {loadingData
                        ? "Loading properties..."
                        : "Select property (optional)"}
                    </option>
                    {properties.map((property) => (
                      <option key={property.id} value={property.id}>
                        {property.code || property.name || "Unnamed Property"}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Tenant
                  </label>
                  <select
                    value={form.tenantId}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        tenantId: e.target.value,
                      }))
                    }
                    disabled={loadingData}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-[15px] text-slate-700 outline-none transition focus:border-[#1f3270] focus:bg-white disabled:opacity-60"
                  >
                    <option value="">
                      {loadingData
                        ? "Loading tenants..."
                        : "Select tenant (optional)"}
                    </option>
                    {tenants.map((tenant) => (
                      <option key={tenant.id} value={tenant.id}>
                        {`${tenant.firstName || ""} ${
                          tenant.lastName || ""
                        }`.trim() || "Unnamed Tenant"}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    File
                  </label>
                  <label className="flex cursor-pointer items-center justify-center rounded-[24px] border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center transition hover:border-[#1f3270] hover:bg-white">
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        setSelectedFile(file);
                      }}
                    />
                    <div className="flex flex-col items-center">
                      <div className="mb-4 rounded-full bg-blue-100 p-4 text-[#1f3270]">
                        <FileUp className="h-6 w-6" />
                      </div>
                      <p className="text-lg font-semibold text-slate-900">
                        Click to select a file
                      </p>
                      <p className="mt-2 text-sm text-slate-500">
                        PDF, JPG, PNG, WEBP, DOC, DOCX — max 10MB
                      </p>
                      {selectedFile ? (
                        <div className="mt-4 rounded-xl bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700">
                          {selectedFile.name}
                        </div>
                      ) : null}
                    </div>
                  </label>
                </div>

                <div className="md:col-span-2">
                  <label className="mb-3 flex items-center gap-3 text-sm font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={form.accessibleToTenant}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          accessibleToTenant: e.target.checked,
                        }))
                      }
                      className="h-5 w-5 rounded border-slate-300 text-[#1f3270] focus:ring-[#1f3270]"
                    />
                    Allow tenant to access this document
                  </label>
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Notes
                  </label>
                  <textarea
                    value={form.notes}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        notes: e.target.value,
                      }))
                    }
                    placeholder="Add internal notes about this document"
                    rows={5}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-[15px] text-slate-700 outline-none transition focus:border-[#1f3270] focus:bg-white"
                  />
                </div>
              </div>

              <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                <h3 className="text-lg font-semibold text-slate-900">
                  Upload Summary
                </h3>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm text-slate-500">Document Name</p>
                    <p className="mt-1 font-medium text-slate-900">
                      {form.documentName || "-"}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-slate-500">Document Type</p>
                    <p className="mt-1 font-medium text-slate-900">
                      {form.type}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-slate-500">Property</p>
                    <p className="mt-1 font-medium text-slate-900">
                      {selectedPropertyLabel}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-slate-500">Tenant</p>
                    <p className="mt-1 font-medium text-slate-900">
                      {selectedTenantLabel}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-slate-500">Visibility</p>
                    <p className="mt-1 font-medium text-slate-900">
                      {form.accessibleToTenant
                        ? "Tenant Accessible"
                        : "Internal Only"}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-slate-500">Selected File</p>
                    <p className="mt-1 font-medium text-slate-900">
                      {selectedFile?.name || "-"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-2xl bg-[#1f3270] px-6 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-[#19295d] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Upload className="h-4 w-4" />
                  {submitting ? "Uploading..." : "Upload Document"}
                </button>

                <Link
                  href="/documents"
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-3 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  Cancel
                </Link>
              </div>
            </form>
          </div>
        </div>
      </main>
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