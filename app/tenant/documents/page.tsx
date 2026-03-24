"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Home,
  CreditCard,
  Wrench,
  FileText,
  Bell,
  LogOut,
  Loader2,
  Sparkles,
  ArrowLeft,
  ArrowRight,
  Download,
  Eye,
  UserCircle2,
  ShieldCheck,
  FileBadge,
  FileImage,
  FileText as FileTextIcon,
  Search,
  CalendarDays,
  Building2,
  Lock,
} from "lucide-react";

const BACKEND_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const API_BASE = `${BACKEND_BASE}/api`;

type AuthUser = {
  id: string;
  fullName?: string;
  name?: string;
  email?: string;
  role?: string;
  tenantId?: string | null;
  tenant?: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    property?: {
      id: string;
      code?: string | null;
      name?: string | null;
      addressLine1?: string | null;
      city?: string | null;
    } | null;
    unit?: {
      id: string;
      unitCode?: string | null;
      unitName?: string | null;
    } | null;
  } | null;
};

type TenantDocument = {
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

function formatDate(value?: string | null) {
  if (!value) return "Not set";
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getInitials(name?: string | null) {
  if (!name) return "TN";
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function getFileIcon(mimeType?: string | null) {
  if (!mimeType) return <FileTextIcon className="h-5 w-5" />;
  if (mimeType.includes("image")) return <FileImage className="h-5 w-5" />;
  if (mimeType.includes("pdf")) return <FileBadge className="h-5 w-5" />;
  return <FileTextIcon className="h-5 w-5" />;
}

function getTypeClasses(type?: string | null) {
  switch (type) {
    case "LEASE":
      return "bg-blue-100 text-blue-700 border border-blue-200";
    case "INVOICE":
      return "bg-amber-100 text-amber-700 border border-amber-200";
    case "RECEIPT":
      return "bg-emerald-100 text-emerald-700 border border-emerald-200";
    case "INSPECTION":
      return "bg-violet-100 text-violet-700 border border-violet-200";
    case "IDENTITY":
      return "bg-cyan-100 text-cyan-700 border border-cyan-200";
    case "MOVE_IN_CHECKLIST":
      return "bg-orange-100 text-orange-700 border border-orange-200";
    case "NOTICE":
      return "bg-rose-100 text-rose-700 border border-rose-200";
    case "PHOTO":
      return "bg-pink-100 text-pink-700 border border-pink-200";
    default:
      return "bg-slate-100 text-slate-700 border border-slate-200";
  }
}

export default function TenantDocumentsPage() {
  const router = useRouter();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loading, setLoading] = useState(true);

  const [user, setUser] = useState<AuthUser | null>(null);
  const [documents, setDocuments] = useState<TenantDocument[]>([]);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    const rawUser = localStorage.getItem("user");

    if (!token || !rawUser) {
      router.replace("/");
      return;
    }

    try {
      const parsed = JSON.parse(rawUser);
      const role = String(parsed?.role || "").trim().toLowerCase();

      if (role !== "tenant") {
        if (role === "admin" || role === "superadmin") {
          router.replace("/dashboard");
          return;
        }
        if (role === "owner") {
          router.replace("/owner");
          return;
        }
      }

      setCheckingAuth(false);
    } catch (err) {
      console.error("Tenant auth parse error:", err);
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      router.replace("/");
    }
  }, [router]);

  useEffect(() => {
    if (!checkingAuth) {
      loadDocumentsData();
    }
  }, [checkingAuth]);

  async function loadDocumentsData() {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("token");

      const meRes = await fetch(`${API_BASE}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token || ""}`,
        },
        cache: "no-store",
      });

      const meData = await meRes.json().catch(() => null);

      if (meRes.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        router.replace("/");
        return;
      }

      if (!meRes.ok) {
        throw new Error(meData?.error || "Failed to load tenant profile");
      }

      const currentUser: AuthUser = meData?.user || null;
      setUser(currentUser);

      const docsRes = await fetch(`${API_BASE}/documents`, {
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${token || ""}`,
        },
      });

      const docsData = await docsRes.json().catch(() => []);

      if (docsRes.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        router.replace("/");
        return;
      }

      if (!docsRes.ok) {
        throw new Error(docsData?.error || "Failed to load documents.");
      }

      const tenantId = currentUser?.tenant?.id || currentUser?.tenantId;

      const visibleDocs = Array.isArray(docsData)
        ? docsData.filter((doc: TenantDocument) => {
            const docTenantId = doc.tenantId || doc.tenant?.id || null;

            return Boolean(
              doc.accessibleToTenant &&
                tenantId &&
                docTenantId &&
                docTenantId === tenantId
            );
          })
        : [];

      setDocuments(visibleDocs);
    } catch (err: any) {
      console.error("Tenant documents load error:", err);
      setError(err?.message || "Failed to load documents.");
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.replace("/");
  }

  async function handleDownload(doc: TenantDocument) {
    try {
      const token = localStorage.getItem("token");

      const res = await fetch(`${BACKEND_BASE}${doc.fileUrl}`, {
        headers: {
          Authorization: `Bearer ${token || ""}`,
        },
      });

      if (!res.ok) {
        throw new Error("Download failed");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = doc.documentName || "document";
      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download error:", error);
      alert("Unable to download document.");
    }
  }

  const filteredDocuments = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return documents;

    return documents.filter((doc) => {
      const name = doc.documentName?.toLowerCase() || "";
      const type = doc.type?.toLowerCase() || "";
      const uploadedBy = doc.uploadedBy?.toLowerCase() || "";
      const propertyCode = doc.property?.code?.toLowerCase() || "";
      const propertyName = doc.property?.name?.toLowerCase() || "";
      const mimeType = doc.mimeType?.toLowerCase() || "";

      return (
        name.includes(q) ||
        type.includes(q) ||
        uploadedBy.includes(q) ||
        propertyCode.includes(q) ||
        propertyName.includes(q) ||
        mimeType.includes(q)
      );
    });
  }, [documents, search]);

  const fullName =
    user?.fullName ||
    user?.name ||
    `${user?.tenant?.firstName || ""} ${user?.tenant?.lastName || ""}`.trim() ||
    "Tenant";

  const initials = getInitials(fullName);

  const totalDocuments = documents.length;
  const leaseDocs = documents.filter((doc) => doc.type === "LEASE").length;
  const invoiceDocs = documents.filter(
    (doc) => doc.type === "INVOICE" || doc.type === "RECEIPT"
  ).length;
  const recentDocs = documents.filter((doc) => {
    const created = new Date(doc.createdAt).getTime();
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return created >= sevenDaysAgo;
  }).length;

  const latestDocument = documents.length > 0 ? documents[0] : null;

  if (checkingAuth || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4f7fb]">
        <div className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-white px-8 py-6 shadow-xl text-slate-700">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading documents...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4f7fb] p-6">
        <div className="w-full max-w-xl rounded-3xl border border-rose-200 bg-white p-8 shadow-xl">
          <h2 className="text-2xl font-bold text-rose-600">
            Unable to load documents
          </h2>
          <p className="mt-3 text-slate-600">{error}</p>
          <button
            onClick={loadDocumentsData}
            className="mt-6 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f7fb] text-slate-900">
      <div className="flex min-h-screen">
        <aside className="hidden w-80 shrink-0 flex-col justify-between bg-gradient-to-b from-[#102a67] via-[#173d8e] to-[#0f1f45] text-white shadow-2xl lg:flex">
          <div>
            <div className="border-b border-white/10 px-8 py-8">
              <h1 className="text-3xl font-bold tracking-tight">
                The House Hub
              </h1>
              <p className="mt-2 text-sm text-blue-100/70">
                Premium Tenant Workspace
              </p>
            </div>

            <div className="px-6 py-6">
              <div className="rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/15 text-lg font-bold text-white">
                    {initials}
                  </div>
                  <div>
                    <p className="text-base font-semibold">{fullName}</p>
                    <p className="text-sm text-blue-100/70">
                      {user?.email || user?.tenant?.email || "Tenant"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <nav className="px-4 pb-6">
              <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-widest text-blue-200/50">
                Tenant Menu
              </p>

              <div className="space-y-2">
                <SidebarItem
                  label="Overview"
                  icon={<Home size={18} />}
                  href="/tenant"
                />
                <SidebarItem
                  label="Payments"
                  icon={<CreditCard size={18} />}
                  href="/tenant/payments"
                />
                <SidebarItem
                  label="Maintenance"
                  icon={<Wrench size={18} />}
                  href="/tenant/maintenance"
                />
                <SidebarItem
                  label="Documents"
                  icon={<FileText size={18} />}
                  active
                  href="/tenant/documents"
                />
                <SidebarItem
                  label="Notifications"
                  icon={<Bell size={18} />}
                  href="/tenant/notifications"
                />
              </div>
            </nav>
          </div>

          <div className="border-t border-white/10 px-6 py-6">
            <button
              onClick={handleLogout}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200/20 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-100 transition hover:bg-red-500/20"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </aside>

        <main className="flex-1">
          <div className="border-b border-slate-200 bg-white/80 px-6 py-6 backdrop-blur md:px-8">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <Link
                  href="/tenant"
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Overview
                </Link>

                <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-700">
                  <Sparkles className="h-4 w-4" />
                  Document Center
                </div>

                <h2 className="mt-4 text-4xl font-bold tracking-tight text-slate-900">
                  Documents
                </h2>
                <p className="mt-3 max-w-3xl text-base leading-7 text-slate-500">
                  Access your lease files, receipts, notices, and important
                  property-related documents shared with your tenant account.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={loadDocumentsData}
                  className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  Refresh
                </button>
              </div>
            </div>
          </div>

          <div className="p-6 md:p-8">
            <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
              <KpiCard
                title="Total Documents"
                value={String(totalDocuments)}
                subtitle="Files available to you"
                icon={<FileText className="h-5 w-5" />}
                accent="blue"
              />
              <KpiCard
                title="Lease Files"
                value={String(leaseDocs)}
                subtitle="Lease-related documents"
                icon={<ShieldCheck className="h-5 w-5" />}
                accent="emerald"
              />
              <KpiCard
                title="Invoices / Receipts"
                value={String(invoiceDocs)}
                subtitle="Billing documents"
                icon={<FileBadge className="h-5 w-5" />}
                accent="amber"
              />
              <KpiCard
                title="Recent Uploads"
                value={String(recentDocs)}
                subtitle="Added in the last 7 days"
                icon={<CalendarDays className="h-5 w-5" />}
                accent="violet"
              />
            </section>

            <section className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-3">
              <div className="xl:col-span-2 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="text-2xl font-semibold text-slate-900">
                      Your Documents
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Browse and download documents shared with your account.
                    </p>
                  </div>

                  <div className="relative w-full md:max-w-sm">
                    <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search documents..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white"
                    />
                  </div>
                </div>

                <div className="mt-6 space-y-5">
                  {filteredDocuments.length === 0 ? (
                    <EmptyState text="No documents shared with your account yet." />
                  ) : (
                    filteredDocuments.map((doc) => (
                      <div
                        key={doc.id}
                        className="rounded-3xl border border-slate-200 bg-slate-50 p-6 transition hover:border-slate-300 hover:bg-white"
                      >
                        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                          <div className="flex flex-1 gap-4">
                            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-sm">
                              {getFileIcon(doc.mimeType)}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className="break-words text-xl font-semibold text-slate-900">
                                  {doc.documentName}
                                </h4>

                                <span
                                  className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getTypeClasses(
                                    doc.type
                                  )}`}
                                >
                                  {doc.type}
                                </span>

                                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                                  <ShieldCheck className="h-3.5 w-3.5" />
                                  Shared with tenant
                                </span>
                              </div>

                              <p className="mt-2 text-sm text-slate-500">
                                {doc.mimeType || "Unknown file type"}
                              </p>

                              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-4">
                                <InfoPill
                                  icon={<CalendarDays className="h-5 w-5" />}
                                  text={`Uploaded: ${formatDate(doc.createdAt)}`}
                                />
                                <InfoPill
                                  icon={<Building2 className="h-4 w-4" />}
                                  text={`Property: ${
                                    doc.property?.code ||
                                    doc.property?.name ||
                                    "N/A"
                                  }`}
                                />
                                <InfoPill
                                  icon={<UserCircle2 className="h-4 w-4" />}
                                  text={`By: ${doc.uploadedBy || "System"}`}
                                />
                                <InfoPill
                                  icon={<Lock className="h-4 w-4" />}
                                  text="Tenant accessible"
                                />
                              </div>

                              {doc.notes ? (
                                <p className="mt-5 break-words text-sm leading-7 text-slate-600">
                                  {doc.notes}
                                </p>
                              ) : null}
                            </div>
                          </div>

                          <div className="flex shrink-0 flex-wrap items-center gap-3 xl:flex-col xl:items-end">
                            <a
                              href={`${BACKEND_BASE}${doc.fileUrl}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex min-w-[140px] items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                            >
                              <Eye className="h-4 w-4" />
                              View
                            </a>

                            <button
                              onClick={() => handleDownload(doc)}
                              className="inline-flex min-w-[140px] items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
                            >
                              <Download className="h-4 w-4" />
                              Download
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-2xl font-semibold text-slate-900">
                    Tenant Summary
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Your document access overview.
                  </p>

                  <div className="mt-6 space-y-4">
                    <SummaryRow label="Tenant" value={fullName} />
                    <SummaryRow
                      label="Property"
                      value={
                        user?.tenant?.property?.name ||
                        user?.tenant?.property?.code ||
                        "N/A"
                      }
                    />
                    <SummaryRow
                      label="Unit"
                      value={
                        user?.tenant?.unit?.unitCode ||
                        user?.tenant?.unit?.unitName ||
                        "N/A"
                      }
                    />
                    <SummaryRow
                      label="Documents"
                      value={String(totalDocuments)}
                    />
                    <SummaryRow label="Lease Files" value={String(leaseDocs)} />
                    <SummaryRow
                      label="Billing Files"
                      value={String(invoiceDocs)}
                    />
                  </div>
                </div>

                <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-2xl font-semibold text-slate-900">
                    Latest Document
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Most recent shared document.
                  </p>

                  {latestDocument ? (
                    <div className="mt-6 rounded-3xl bg-gradient-to-r from-violet-600 to-indigo-600 p-5 text-white">
                      <p className="text-sm text-violet-100">Document Name</p>
                      <p className="mt-1 text-2xl font-bold">
                        {latestDocument.documentName}
                      </p>

                      <div className="mt-5 space-y-2 text-sm text-violet-100">
                        <p>Type: {latestDocument.type}</p>
                        <p>Date: {formatDate(latestDocument.createdAt)}</p>
                        <p>
                          Property:{" "}
                          {latestDocument.property?.code ||
                            latestDocument.property?.name ||
                            "N/A"}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-6">
                      <EmptyState text="No document available yet." />
                    </div>
                  )}
                </div>

                <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-2xl font-semibold text-slate-900">
                        Continue
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        Navigate to another section.
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 space-y-3">
                    <QuickLink href="/tenant" label="Back to Overview" />
                    <QuickLink href="/tenant/payments" label="Open Payments" />
                    <QuickLink
                      href="/tenant/maintenance"
                      label="Open Maintenance"
                    />
                  </div>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
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
  icon: React.ReactNode;
  href: string;
  active?: boolean;
}) {
  return (
    <Link href={href}>
      <div
        className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${
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

function KpiCard({
  title,
  value,
  subtitle,
  icon,
  accent,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  accent: "blue" | "emerald" | "amber" | "violet";
}) {
  const accentMap = {
    blue: "from-blue-500 to-blue-600",
    emerald: "from-emerald-500 to-emerald-600",
    amber: "from-amber-500 to-orange-500",
    violet: "from-violet-500 to-violet-600",
  };

  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
      <div className="flex items-start justify-between">
        <div
          className={`h-2 w-16 rounded-full bg-gradient-to-r ${accentMap[accent]}`}
        />
        <div className="rounded-2xl bg-slate-50 p-3 text-slate-500">
          {icon}
        </div>
      </div>

      <p className="mt-5 text-sm font-medium text-slate-500">{title}</p>
      <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
        {value}
      </p>
      <p className="mt-3 text-sm text-slate-500">{subtitle}</p>
    </div>
  );
}

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
      <span className="text-sm text-slate-600">{label}</span>
      <span className="text-sm font-semibold text-slate-900">{value}</span>
    </div>
  );
}

function QuickLink({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <Link href={href}>
      <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-700 transition hover:bg-slate-100">
        <span>{label}</span>
        <ArrowRight className="h-4 w-4" />
      </div>
    </Link>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-center text-sm text-slate-500">
      {text}
    </div>
  );
}

function InfoPill({
  icon,
  text,
}: {
  icon: React.ReactNode;
  text: string;
}) {
  return (
    <div className="flex min-h-[72px] items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
      <span className="shrink-0 text-slate-400">{icon}</span>
      <span className="leading-6 break-words">{text}</span>
    </div>
  );
}