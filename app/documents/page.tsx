"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Users,
  Wallet,
  FileText,
  Brain,
  Settings,
  Plus,
  Search,
  RefreshCw,
  Wrench,
  Home,
  Trash2,
  X,
  AlertCircle,
  CheckCircle2,
  Eye,
  FileBadge,
  FileImage,
  FileText as FileTextIcon,
  ShieldCheck,
  LogOut,
  Loader2,
} from "lucide-react";

type StoredUser = {
  id?: string;
  fullName?: string;
  name?: string;
  email?: string;
  role?: string;
};

type DocumentItem = {
  id: string;
  propertyId?: string | null;
  tenantId?: string | null;
  documentName: string;
  type: string;
  fileUrl: string;
  mimeType?: string | null;
  accessibleToTenant: boolean;
  uploadedBy?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  property?: {
    id: string;
    code?: string | null;
    name?: string | null;
  } | null;
  tenant?: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
  } | null;
};

type NotificationState = {
  open: boolean;
  type: "success" | "error";
  title: string;
  message: string;
};

const API_BASE = "http://localhost:4000/api";
const BACKEND_BASE = "http://localhost:4000";

function formatDate(dateString: string) {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString();
}

function getFileIcon(mimeType?: string | null) {
  if (!mimeType) return <FileTextIcon className="h-5 w-5" />;
  if (mimeType.includes("image")) return <FileImage className="h-5 w-5" />;
  if (mimeType.includes("pdf")) return <FileBadge className="h-5 w-5" />;
  return <FileTextIcon className="h-5 w-5" />;
}

function getTypeClasses(type: string) {
  switch (type) {
    case "LEASE":
      return "bg-blue-100 text-blue-700";
    case "INVOICE":
      return "bg-amber-100 text-amber-700";
    case "RECEIPT":
      return "bg-emerald-100 text-emerald-700";
    case "INSPECTION":
      return "bg-purple-100 text-purple-700";
    case "IDENTITY":
      return "bg-cyan-100 text-cyan-700";
    case "MOVE_IN_CHECKLIST":
      return "bg-orange-100 text-orange-700";
    case "NOTICE":
      return "bg-rose-100 text-rose-700";
    case "PHOTO":
      return "bg-pink-100 text-pink-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export default function DocumentsPage() {
  const router = useRouter();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [user, setUser] = useState<StoredUser | null>(null);

  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [documentToDelete, setDocumentToDelete] = useState<DocumentItem | null>(
    null
  );

  const [notification, setNotification] = useState<NotificationState>({
    open: false,
    type: "error",
    title: "",
    message: "",
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
      setCheckingAuth(false);
    } catch (error) {
      console.error("Documents auth error:", error);
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

  async function fetchDocuments() {
    try {
      setLoading(true);

      const token = localStorage.getItem("token");

      const res = await fetch(`${API_BASE}/documents`, {
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
        throw new Error(data?.error || "Failed to load documents");
      }

      setDocuments(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error("Failed to fetch documents:", error);
      setDocuments([]);
      showNotification(
        "error",
        "Unable to load documents",
        error?.message ||
          "Documents could not be loaded. Please refresh and try again."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (checkingAuth) return;
    fetchDocuments();
  }, [checkingAuth]);

  async function confirmDeleteDocument() {
    if (!documentToDelete) return;

    try {
      setDeletingId(documentToDelete.id);

      const token = localStorage.getItem("token");

      const res = await fetch(`${API_BASE}/documents/${documentToDelete.id}`, {
        method: "DELETE",
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
        showNotification(
          "error",
          "Unable to delete document",
          data?.error || "Failed to delete document."
        );
        return;
      }

      setDocuments((prev) =>
        prev.filter((item) => item.id !== documentToDelete.id)
      );
      setDocumentToDelete(null);

      showNotification(
        "success",
        "Document deleted",
        "The document has been deleted successfully."
      );
    } catch (error: any) {
      console.error("Failed to delete document:", error);
      showNotification(
        "error",
        "Unable to delete document",
        error?.message || "Failed to delete document."
      );
    } finally {
      setDeletingId(null);
    }
  }

  async function handleDownload(doc: DocumentItem) {
  try {
    const token = localStorage.getItem("token");
    const fileUrl = `${BACKEND_BASE}${doc.fileUrl}`;

    const res = await fetch(fileUrl, {
      headers: {
        Authorization: `Bearer ${token || ""}`,
      },
    });

    if (res.status === 401) {
      handleUnauthorized();
      return;
    }

    if (!res.ok) {
      showNotification(
        "error",
        "Unable to download document",
        "The file could not be downloaded."
      );
      return;
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);

    const extension =
      doc.fileUrl?.split(".").pop()?.split("?")[0] || "file";

    const link = document.createElement("a");
    link.href = url;
    link.download = doc.documentName
      ? `${doc.documentName}.${extension}`
      : `document.${extension}`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    window.URL.revokeObjectURL(url);
  } catch (error: any) {
    showNotification(
      "error",
      "Unable to download document",
      error?.message || "The file could not be downloaded."
    );
  }
}

  const filteredDocuments = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return documents;

    return documents.filter((doc) => {
      const documentName = doc.documentName?.toLowerCase() || "";
      const type = doc.type?.toLowerCase() || "";
      const mimeType = doc.mimeType?.toLowerCase() || "";
      const uploadedBy = doc.uploadedBy?.toLowerCase() || "";
      const propertyCode = doc.property?.code?.toLowerCase() || "";
      const propertyName = doc.property?.name?.toLowerCase() || "";
      const tenantName =
        `${doc.tenant?.firstName || ""} ${doc.tenant?.lastName || ""}`.toLowerCase();

      return (
        documentName.includes(q) ||
        type.includes(q) ||
        mimeType.includes(q) ||
        uploadedBy.includes(q) ||
        propertyCode.includes(q) ||
        propertyName.includes(q) ||
        tenantName.includes(q)
      );
    });
  }, [documents, search]);

  const totalDocuments = documents.length;

  const tenantAccessibleCount = useMemo(() => {
    return documents.filter((doc) => doc.accessibleToTenant).length;
  }, [documents]);

  const propertyLinkedCount = useMemo(() => {
    return documents.filter((doc) => !!doc.propertyId).length;
  }, [documents]);

  const tenantLinkedCount = useMemo(() => {
    return documents.filter((doc) => !!doc.tenantId).length;
  }, [documents]);

  const isError = notification.type === "error";

  const deleteDocumentName = documentToDelete?.documentName || "this document";
  const deleteLinkedTo = documentToDelete?.tenant
    ? `${documentToDelete.tenant.firstName || ""} ${
        documentToDelete.tenant.lastName || ""
      }`.trim()
    : documentToDelete?.property?.code ||
      documentToDelete?.property?.name ||
      "this record";

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
    <div className="min-h-screen bg-slate-50 text-slate-300">
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

      {documentToDelete && (
        <div className="fixed inset-0 z-[105] flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-[28px] bg-white p-6 shadow-2xl md:p-8">
            <div className="flex flex-col gap-5 md:flex-row md:items-start">
              <div className="flex h-20 w-20 items-center justify-center rounded-[24px] bg-red-50 text-red-600">
                <Trash2 className="h-8 w-8" />
              </div>

              <div className="flex-1">
                <h3 className="text-3xl font-bold tracking-tight text-slate-900">
                  Delete Document
                </h3>

                <p className="mt-4 max-w-xl text-lg leading-9 text-slate-500">
                  Are you sure you want to delete{" "}
                  <span className="font-semibold text-slate-800">
                    {deleteDocumentName}
                  </span>{" "}
                  linked to{" "}
                  <span className="font-semibold text-slate-800">
                    {deleteLinkedTo}
                  </span>
                  ? This action cannot be undone.
                </p>

                <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  Type:{" "}
                  <span className="font-semibold text-slate-900">
                    {documentToDelete.type}
                  </span>
                </div>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setDocumentToDelete(null)}
                    disabled={deletingId === documentToDelete.id}
                    className="rounded-2xl border border-slate-300 bg-white px-6 py-3 text-lg font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={confirmDeleteDocument}
                    disabled={deletingId === documentToDelete.id}
                    className="rounded-2xl bg-red-600 px-6 py-3 text-lg font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {deletingId === documentToDelete.id
                      ? "Deleting..."
                      : "Delete Document"}
                  </button>
                </div>
              </div>
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

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 bg-gradient-to-b from-blue-950 via-blue-900 to-slate-900 text-white shadow-2xl lg:flex lg:flex-col">
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

      <main className="min-h-screen px-4 py-6 lg:pl-[352px] lg:pr-7">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <h2 className="text-4xl font-bold tracking-tight text-slate-900">
                Documents
              </h2>
              <p className="mt-3 text-xl text-slate-500">
                Manage lease files, tenant documents, and property records.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={fetchDocuments}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>

              <Link
                href="/documents/new"
                className="inline-flex items-center gap-2 rounded-2xl bg-[#1f3270] px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-[#19295d]"
              >
                <Plus className="h-4 w-4" />
                Upload Document
              </Link>

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

          <div className="mb-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[22px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-6 h-3 w-24 rounded-full bg-blue-500" />
              <p className="text-lg text-slate-500">Total Documents</p>
              <h3 className="mt-4 text-4xl font-bold text-slate-900">
                {totalDocuments}
              </h3>
              <p className="mt-4 text-lg text-slate-400">All uploaded files</p>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-6 h-3 w-24 rounded-full bg-emerald-500" />
              <p className="text-lg text-slate-500">Tenant Accessible</p>
              <h3 className="mt-4 text-4xl font-bold text-slate-900">
                {tenantAccessibleCount}
              </h3>
              <p className="mt-4 text-lg text-slate-400">Visible to tenants</p>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-6 h-3 w-24 rounded-full bg-amber-500" />
              <p className="text-lg text-slate-500">Property Linked</p>
              <h3 className="mt-4 text-4xl font-bold text-slate-900">
                {propertyLinkedCount}
              </h3>
              <p className="mt-4 text-lg text-slate-400">
                Attached to properties
              </p>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-6 h-3 w-24 rounded-full bg-purple-500" />
              <p className="text-lg text-slate-500">Tenant Linked</p>
              <h3 className="mt-4 text-4xl font-bold text-slate-900">
                {tenantLinkedCount}
              </h3>
              <p className="mt-4 text-lg text-slate-400">Attached to tenants</p>
            </div>
          </div>

          <div className="mb-8 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by document name, type, tenant, property, uploaded by..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-4 pl-12 pr-4 text-[15px] text-slate-700 outline-none transition focus:border-[#1f3270] focus:bg-white"
              />
            </div>
          </div>

          <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Document
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Type
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Linked To
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Visibility
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Uploaded By
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Date
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-6 py-14 text-center text-sm text-slate-500"
                      >
                        Loading documents...
                      </td>
                    </tr>
                  ) : filteredDocuments.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-6 py-14 text-center text-sm text-slate-500"
                      >
                        No documents found.
                      </td>
                    </tr>
                  ) : (
                    filteredDocuments.map((doc) => (
                      <tr
                        key={doc.id}
                        className="border-t border-slate-100 hover:bg-slate-50/80"
                      >
                        <td className="px-6 py-5">
                          <div className="flex items-start gap-3">
                            <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
                              {getFileIcon(doc.mimeType)}
                            </div>
                            <div>
                              <div className="text-[15px] font-semibold text-slate-900">
                                {doc.documentName}
                              </div>
                              <div className="mt-1 text-sm text-slate-500">
                                {doc.mimeType || "Unknown type"}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-5">
                          <span
                            className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold ${getTypeClasses(
                              doc.type
                            )}`}
                          >
                            {doc.type}
                          </span>
                        </td>

                        <td className="px-6 py-5">
                          <div className="text-[15px] font-semibold text-slate-900">
                            {doc.tenant
                              ? `${doc.tenant.firstName || ""} ${
                                  doc.tenant.lastName || ""
                                }`.trim()
                              : doc.property?.code || doc.property?.name || "-"}
                          </div>
                          <div className="mt-1 text-sm text-slate-500">
                            {doc.tenant
                              ? "Tenant"
                              : doc.property
                              ? "Property"
                              : "Unlinked"}
                          </div>
                        </td>

                        <td className="px-6 py-5">
                          <span
                            className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${
                              doc.accessibleToTenant
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            <ShieldCheck className="h-3.5 w-3.5" />
                            {doc.accessibleToTenant
                              ? "Tenant Access"
                              : "Internal Only"}
                          </span>
                        </td>

                        <td className="px-6 py-5 text-[15px] text-slate-600">
                          {doc.uploadedBy || "-"}
                        </td>

                        <td className="px-6 py-5 text-[15px] text-slate-600">
                          {formatDate(doc.createdAt)}
                        </td>

                        <td className="px-6 py-5 text-right">
                          <div className="flex justify-end gap-2">
                            <a
                              href={`${BACKEND_BASE}${doc.fileUrl}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                            >
                              <Eye className="h-4 w-4" />
                              View
                            </a>

                            <button
                              type="button"
                              onClick={() => handleDownload(doc)}
                              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                            >
                              Download
                            </button>

                            <button
                              type="button"
                              onClick={() => setDocumentToDelete(doc)}
                              disabled={deletingId === doc.id}
                              className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
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