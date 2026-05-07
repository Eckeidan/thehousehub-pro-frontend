"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  RefreshCw,
  Trash2,
  X,
  AlertCircle,
  CheckCircle2,
  Eye,
  FileBadge,
  FileImage,
  FileText as FileTextIcon,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import AdminShell from "@/components/AdminShell";

type StoredUser = {
  id?: string;
  fullName?: string;
  name?: string;
  email?: string;
  role?: string;
  organizationId?: string;
};

type DocumentItem = {
  id: string;
  organizationId?: string;
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

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const BACKEND_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

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
  const [documentToDelete, setDocumentToDelete] =
    useState<DocumentItem | null>(null);

  const [notification, setNotification] = useState<NotificationState>({
    open: false,
    type: "error",
    title: "",
    message: "",
  });

  const normalizedRole = String(user?.role || "").trim().toUpperCase();
  const isSuperAdmin = normalizedRole === "OWNER";
  const canEdit = normalizedRole === "ADMIN";

  function showNotification(
    type: "success" | "error",
    title: string,
    message: string
  ) {
    setNotification({ open: true, type, title, message });
  }

  function handleUnauthorized() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.replace("/");
  }

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
      handleUnauthorized();
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
    fetchDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkingAuth]);

  async function fetchDocuments() {
    try {
      setLoading(true);

      const token = localStorage.getItem("token");

      const res = await fetch(`${API_BASE}/api/documents`, {
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

  async function confirmDeleteDocument() {
    if (!documentToDelete || !canEdit) return;

    try {
      setDeletingId(documentToDelete.id);

      const token = localStorage.getItem("token");

      const res = await fetch(
        `${API_BASE}/api/documents/${documentToDelete.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token || ""}`,
          },
        }
      );

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

      const extension = doc.fileUrl?.split(".").pop()?.split("?")[0] || "file";

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
      const tenantName =
        `${doc.tenant?.firstName || ""} ${doc.tenant?.lastName || ""}`.toLowerCase();

      return [
        doc.documentName,
        doc.type,
        doc.mimeType,
        doc.uploadedBy,
        doc.property?.code,
        doc.property?.name,
        tenantName,
        doc.organizationId,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
    });
  }, [documents, search]);

  const totalDocuments = documents.length;
  const tenantAccessibleCount = documents.filter(
    (doc) => doc.accessibleToTenant
  ).length;
  const propertyLinkedCount = documents.filter((doc) => !!doc.propertyId).length;
  const tenantLinkedCount = documents.filter((doc) => !!doc.tenantId).length;

  const isError = notification.type === "error";

  const deleteDocumentName = documentToDelete?.documentName || "this document";

  const deleteLinkedTo = documentToDelete?.tenant
    ? `${documentToDelete.tenant.firstName || ""} ${
        documentToDelete.tenant.lastName || ""
      }`.trim()
    : documentToDelete?.property?.code ||
      documentToDelete?.property?.name ||
      "this record";

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
      activeItem="documents"
      title="Documents"
      subtitle="Manage lease files, tenant documents, and property records."
      actions={
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={fetchDocuments}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>

          {canEdit && (
            <Link
              href="/documents/new"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Upload Document
            </Link>
          )}
        </div>
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

        {documentToDelete && canEdit && (
          <div className="fixed inset-0 z-[105] flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-sm">
            <div className="w-full max-w-2xl rounded-[28px] bg-white p-6 shadow-2xl md:p-8">
              <div className="flex flex-col gap-5 md:flex-row md:items-start">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[22px] bg-red-50 text-red-600 md:h-20 md:w-20">
                  <Trash2 className="h-7 w-7 md:h-8 md:w-8" />
                </div>

                <div className="flex-1">
                  <h3 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
                    Delete Document
                  </h3>

                  <p className="mt-4 text-sm leading-7 text-slate-500 md:text-lg md:leading-9">
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
                      className="rounded-2xl border border-slate-300 bg-white px-6 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 md:text-base"
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      onClick={confirmDeleteDocument}
                      disabled={deletingId === documentToDelete.id}
                      className="rounded-2xl bg-red-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60 md:text-base"
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

        {isSuperAdmin && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-700">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="font-semibold">Read-only Super Admin mode</p>
                <p className="mt-1">
                  You can review organization documents, but only Admin can
                  upload or delete documents.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          <span className="font-semibold">Org ID:</span>{" "}
          <span className="font-mono">
            {user?.organizationId || "No organizationId"}
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total Documents"
            value={String(totalDocuments)}
            subtitle="All uploaded files"
            color="blue"
          />
          <StatCard
            title="Tenant Accessible"
            value={String(tenantAccessibleCount)}
            subtitle="Visible to tenants"
            color="emerald"
          />
          <StatCard
            title="Property Linked"
            value={String(propertyLinkedCount)}
            subtitle="Attached to properties"
            color="amber"
          />
          <StatCard
            title="Tenant Linked"
            value={String(tenantLinkedCount)}
            subtitle="Attached to tenants"
            color="purple"
          />
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by document name, type, tenant, property, uploaded by..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-4 pl-12 pr-4 text-sm text-slate-700 outline-none transition focus:border-blue-600 focus:bg-white"
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-[1150px]">
              <thead className="bg-slate-50">
                <tr>
                  <TableHead>Document</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Linked To</TableHead>
                  <TableHead>Visibility</TableHead>
                  <TableHead>Org ID</TableHead>
                  <TableHead>Uploaded By</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead align="right">Actions</TableHead>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-6 py-14 text-center text-sm text-slate-500"
                    >
                      Loading documents...
                    </td>
                  </tr>
                ) : filteredDocuments.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
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
                            <div className="text-sm font-semibold text-slate-900">
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
                        <div className="text-sm font-semibold text-slate-900">
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

                      <td className="px-6 py-5 text-xs font-mono text-emerald-600">
                        {doc.organizationId || "-"}
                      </td>

                      <td className="px-6 py-5 text-sm text-slate-600">
                        {doc.uploadedBy || "-"}
                      </td>

                      <td className="px-6 py-5 text-sm text-slate-600">
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

                          {canEdit ? (
                            <button
                              type="button"
                              onClick={() => setDocumentToDelete(doc)}
                              disabled={deletingId === doc.id}
                              className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </button>
                          ) : (
                            <span className="inline-flex rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-500">
                              Read only
                            </span>
                          )}
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
    </AdminShell>
  );
}

function TableHead({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      className={`px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  color,
}: {
  title: string;
  value: string;
  subtitle: string;
  color: "blue" | "emerald" | "amber" | "purple";
}) {
  const colorMap = {
    blue: "bg-blue-500",
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
    purple: "bg-purple-500",
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className={`mb-5 h-2 w-20 rounded-full ${colorMap[color]}`} />
      <p className="text-sm text-slate-500">{title}</p>
      <h3 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
        {value}
      </h3>
      <p className="mt-3 text-sm text-slate-400">{subtitle}</p>
    </div>
  );
}