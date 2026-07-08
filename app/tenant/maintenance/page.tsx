"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
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
  Clock3,
  AlertTriangle,
  CheckCircle2,
  PauseCircle,
  XCircle,
  CalendarDays,
  MapPin,
  ShieldCheck,
  Plus,
  Pencil,
  BadgeDollarSign,
  UserCircle2,
  Camera,
  X,
  ImageIcon,
  MessageCircle,
  Settings,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

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

type MaintenancePhoto = {
  url: string;
  fileName?: string;
  mimeType?: string;
  size?: number;
};

type MaintenanceRequest = {
  id: string;
  requestNumber: string;
  title: string;
  description?: string | null;
  category: string;
  priority: string;
  status: string;
  locationNote?: string | null;
  preferredDate?: string | null;
  entryPermission?: boolean;
  estimatedCost?: number | string | null;
  actualCost?: number | string | null;
  photos?: MaintenancePhoto[] | null;
  createdAt: string;
  updatedAt: string;
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
  tenant?: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
  } | null;
  contractor?: {
    id: string;
    companyName?: string | null;
    phone?: string | null;
    serviceCategory?: string | null;
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

function formatMoney(value?: number | string | null) {
  if (value === null || value === undefined || value === "") return "Pending";

  const amount = Number(value);

  if (Number.isNaN(amount)) return String(value);

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatFileSize(size: number) {
  if (size < 1024 * 1024) {
    return `${Math.round(size / 1024)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
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

function getPhotoUrl(photoUrl?: string | null) {
  if (!photoUrl) return "";
  if (photoUrl.startsWith("http")) return photoUrl;
  return `${API_BASE}${photoUrl}`;
}

function getPriorityBadge(priority?: string | null) {
  switch (priority) {
    case "LOW":
      return "bg-slate-100 text-slate-700 border border-slate-200";
    case "MEDIUM":
      return "bg-blue-100 text-blue-700 border border-blue-200";
    case "HIGH":
      return "bg-amber-100 text-amber-700 border border-amber-200";
    case "URGENT":
      return "bg-rose-100 text-rose-700 border border-rose-200";
    default:
      return "bg-slate-100 text-slate-700 border border-slate-200";
  }
}

function getStatusBadge(status?: string | null) {
  switch (status) {
    case "OPEN":
      return "bg-amber-100 text-amber-700 border border-amber-200";
    case "IN_PROGRESS":
      return "bg-blue-100 text-blue-700 border border-blue-200";
    case "ON_HOLD":
      return "bg-violet-100 text-violet-700 border border-violet-200";
    case "RESOLVED":
      return "bg-emerald-100 text-emerald-700 border border-emerald-200";
    case "CLOSED":
      return "bg-slate-100 text-slate-700 border border-slate-200";
    case "CANCELLED":
      return "bg-rose-100 text-rose-700 border border-rose-200";
    default:
      return "bg-slate-100 text-slate-700 border border-slate-200";
  }
}

function getStatusIcon(status?: string | null) {
  switch (status) {
    case "OPEN":
      return <Clock3 className="h-5 w-5" />;
    case "IN_PROGRESS":
      return <Wrench className="h-5 w-5" />;
    case "ON_HOLD":
      return <PauseCircle className="h-5 w-5" />;
    case "RESOLVED":
    case "CLOSED":
      return <CheckCircle2 className="h-5 w-5" />;
    case "CANCELLED":
      return <XCircle className="h-5 w-5" />;
    default:
      return <AlertTriangle className="h-5 w-5" />;
  }
}

function detectMaintenanceClassification(title: string, description: string) {
  const text = `${title} ${description}`.toLowerCase();

  const hasAny = (keywords: string[]) =>
    keywords.some((keyword) => text.includes(keyword));

  let category = "GENERAL";

  if (
    hasAny([
      "water",
      "leak",
      "leaking",
      "pipe",
      "plumbing",
      "toilet",
      "sink",
      "drain",
      "faucet",
      "shower",
      "bathroom",
      "sewer",
      "flood",
    ])
  ) {
    category = "PLUMBING";
  } else if (
    hasAny([
      "electric",
      "electrical",
      "power",
      "outlet",
      "socket",
      "breaker",
      "light",
      "spark",
      "wire",
      "wiring",
    ])
  ) {
    category = "ELECTRICAL";
  } else if (
    hasAny(["heat", "heating", "ac", "a/c", "air conditioning", "hvac", "furnace", "thermostat"])
  ) {
    category = "HVAC";
  } else if (hasAny(["lock", "key", "door won't lock", "locked out", "deadbolt"])) {
    category = "LOCKS";
  } else if (hasAny(["paint", "wall", "ceiling", "drywall", "mold", "stain"])) {
    category = "PAINTING";
  } else if (hasAny(["pest", "bug", "insect", "roach", "cockroach", "mouse", "mice", "rat"])) {
    category = "PEST_CONTROL";
  } else if (
    hasAny([
      "fridge",
      "refrigerator",
      "oven",
      "stove",
      "dishwasher",
      "washer",
      "dryer",
      "appliance",
    ])
  ) {
    category = "APPLIANCE";
  }

  let priority = "MEDIUM";

  if (
    hasAny([
      "fire",
      "smoke",
      "spark",
      "gas",
      "flood",
      "flooding",
      "sewage",
      "no heat",
      "no heating",
      "no power",
      "electrical shock",
      "can't lock",
      "cannot lock",
      "door won't lock",
      "emergency",
    ])
  ) {
    priority = "URGENT";
  } else if (
    hasAny([
      "water",
      "leak",
      "leaking",
      "broken",
      "not working",
      "mold",
      "no hot water",
      "toilet clogged",
      "clogged toilet",
      "high",
    ])
  ) {
    priority = "HIGH";
  } else if (hasAny(["minor", "small", "low", "paint", "scratch"])) {
    priority = "LOW";
  }

  return { category, priority };
}

export default function TenantMaintenancePage() {
  const router = useRouter();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [user, setUser] = useState<AuthUser | null>(null);
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formError, setFormError] = useState("");
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);
  const [autoClassification, setAutoClassification] = useState(true);

  const [uploadWarning, setUploadWarning] = useState("");


  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "GENERAL",
    priority: "MEDIUM",
    preferredDate: "",
    entryPermission: false,
    locationNote: "",
  });

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
      loadMaintenanceData();
    }
  }, [checkingAuth]);

  async function loadMaintenanceData() {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("token");

      const meRes = await fetch(`${API_BASE}/api/auth/me`, {
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

      const maintenanceRes = await fetch(`${API_BASE}/api/tenant/maintenance`, {
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${token || ""}`,
        },
      });

      const maintenanceData = await maintenanceRes.json().catch(() => []);

      if (maintenanceRes.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        router.replace("/");
        return;
      }

      if (!maintenanceRes.ok) {
        throw new Error(
          maintenanceData?.error || "Failed to load maintenance requests"
        );
      }

      const tenantRequests = Array.isArray(maintenanceData)
        ? maintenanceData
        : [];

      tenantRequests.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setRequests(tenantRequests);
    } catch (err: any) {
      console.error("Tenant maintenance load error:", err);
      setError(err?.message || "Failed to load maintenance requests.");
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.replace("/");
  }

  function resetCreateForm() {
    setForm({
      title: "",
      description: "",
      category: "GENERAL",
      priority: "MEDIUM",
      preferredDate: "",
      entryPermission: false,
      locationNote: "",
    });
    setSelectedPhotos([]);
    setAutoClassification(true);
    setFormError("");
  }

  function updateIssueText(field: "title" | "description", value: string) {
    setForm((prev) => {
      const next = { ...prev, [field]: value };

      if (!autoClassification) return next;

      const detected = detectMaintenanceClassification(
        next.title,
        next.description
      );

      return {
        ...next,
        category: detected.category,
        priority: detected.priority,
      };
    });
  }

  function applyAutoClassification() {
    const detected = detectMaintenanceClassification(
      form.title,
      form.description
    );

    setForm((prev) => ({
      ...prev,
      category: detected.category,
      priority: detected.priority,
    }));
    setAutoClassification(true);
  }

  function handlePhotoChange(files: FileList | null) {
  const incomingFiles = Array.from(files || []);
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  const maxSize = 5 * 1024 * 1024;

  if (incomingFiles.length === 0) return;

  const accepted: File[] = [];
  const rejected: string[] = [];

  incomingFiles.forEach((file) => {
    if (!allowedTypes.includes(file.type)) {
      rejected.push(`${file.name} is not a supported image format.`);
      return;
    }

    if (file.size > maxSize) {
      rejected.push(
        `${file.name} is ${formatFileSize(file.size)}. Max allowed is 5MB.`
      );
      return;
    }

    accepted.push(file);
  });

  setSelectedPhotos((prev) => {
    const merged = [...prev, ...accepted];

    const unique = merged.filter(
      (file, index, array) =>
        index ===
        array.findIndex(
          (item) =>
            item.name === file.name &&
            item.size === file.size &&
            item.lastModified === file.lastModified
        )
    );

    return unique.slice(0, 5);
  });

  const totalAfterAdd = selectedPhotos.length + accepted.length;

  if (totalAfterAdd > 5) {
    rejected.push("Only the first 5 valid photos were added.");
  }

  if (rejected.length > 0) {
    setUploadWarning(rejected.join(" "));
  } else {
    setUploadWarning("");
  }

  setFormError("");
}

  async function handleCreateRequest(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!form.title.trim()) {
      setFormError("Title is required.");
      return;
    }

    try {
      setSubmitting(true);
      setFormError("");

      const formData = new FormData();

      formData.append("title", form.title.trim());
      formData.append("description", form.description.trim());
      formData.append("category", form.category);
      formData.append("priority", form.priority);
      formData.append("preferredDate", form.preferredDate || "");
      formData.append("entryPermission", String(form.entryPermission));
      formData.append("locationNote", form.locationNote.trim());

      selectedPhotos.forEach((file) => {
        formData.append("photos", file);
      });

      const token = localStorage.getItem("token");

      const res = await fetch(`${API_BASE}/api/tenant/maintenance`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token || ""}`,
        },
        body: formData,
      });

      const data = await res.json().catch(() => null);

      if (res.status === 401) {
        setFormError("Session rejected. Please login again.");
        return;
      }

      if (!res.ok) {
        if (data?.code === "FILE_TOO_LARGE") {
          throw new Error(
            "One or more images are too large. Maximum allowed size is 5MB per image."
          );
        }

        if (data?.code === "TOO_MANY_FILES") {
          throw new Error("You can upload up to 5 photos only.");
        }

        throw new Error(data?.error || "Failed to create maintenance request.");
      }

      setShowCreateModal(false);
      resetCreateForm();

      await loadMaintenanceData();
    } catch (err: any) {
      console.error("Create maintenance request error:", err);
      setFormError(err?.message || "Failed to create request.");
    } finally {
      setSubmitting(false);
    }
  }

  const fullName =
    user?.fullName ||
    user?.name ||
    `${user?.tenant?.firstName || ""} ${user?.tenant?.lastName || ""}`.trim() ||
    "Tenant";

  const initials = getInitials(fullName);

  const openCount = useMemo(
    () => requests.filter((r) => r.status === "OPEN").length,
    [requests]
  );

  const inProgressCount = useMemo(
    () => requests.filter((r) => r.status === "IN_PROGRESS").length,
    [requests]
  );

  const resolvedCount = useMemo(
    () =>
      requests.filter(
        (r) => r.status === "RESOLVED" || r.status === "CLOSED"
      ).length,
    [requests]
  );

  const urgentCount = useMemo(
    () =>
      requests.filter(
        (r) => r.priority === "URGENT" || r.priority === "HIGH"
      ).length,
    [requests]
  );

  const latestRequest = requests.length > 0 ? requests[0] : null;

  const filteredRequests = useMemo(() => {
    if (statusFilter === "ALL") return requests;
    if (statusFilter === "ACTIVE") {
      return requests.filter((request) =>
        ["OPEN", "IN_PROGRESS", "ON_HOLD"].includes(request.status)
      );
    }
    return requests.filter((request) => request.status === statusFilter);
  }, [requests, statusFilter]);

  if (checkingAuth || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4f7fb]">
        <div className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-white px-8 py-6 text-slate-700 shadow-xl">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading maintenance...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4f7fb] p-6">
        <div className="w-full max-w-xl rounded-3xl border border-rose-200 bg-white p-8 shadow-xl">
          <h2 className="text-2xl font-bold text-rose-600">
            Unable to load maintenance
          </h2>
          <p className="mt-3 text-slate-600">{error}</p>
          <button
            onClick={loadMaintenanceData}
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
                <SidebarItem label="Overview" icon={<Home size={18} />} href="/tenant" />
                <SidebarItem label="Payments" icon={<CreditCard size={18} />} href="/tenant/payments" />
                <SidebarItem label="Maintenance" icon={<Wrench size={18} />} active href="/tenant/maintenance" />
                <SidebarItem label="Documents" icon={<FileText size={18} />} href="/tenant/documents" />
                <SidebarItem label="Notifications" icon={<Bell size={18} />} href="/tenant/notifications" />
                <SidebarItem label="Contact Landlord" icon={<MessageCircle size={18} />} href="/tenant/contact" />
                <SidebarItem label="Settings" icon={<Settings size={18} />} href="/tenant/settings" />
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

                <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700">
                  <Sparkles className="h-4 w-4" />
                  Maintenance Center
                </div>

                <h2 className="mt-4 text-4xl font-bold tracking-tight text-slate-900">
                  Maintenance Requests
                </h2>
                <p className="mt-3 max-w-3xl text-base leading-7 text-slate-500">
                  Follow your maintenance requests, check their progress, and submit new issues with photos directly from your tenant workspace.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={loadMaintenanceData}
                  className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  Refresh
                </button>

                <button
                  onClick={() => {
                    resetCreateForm();
                    setShowCreateModal(true);
                  }}
                  className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4" />
                  New Request
                </button>
              </div>
            </div>
          </div>

          <div className="p-6 md:p-8">
            <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
              <KpiCard title="Open Requests" value={String(openCount)} subtitle="Waiting for action" icon={<Clock3 className="h-5 w-5" />} accent="amber" />
              <KpiCard title="In Progress" value={String(inProgressCount)} subtitle="Currently being handled" icon={<Wrench className="h-5 w-5" />} accent="blue" />
              <KpiCard title="Resolved / Closed" value={String(resolvedCount)} subtitle="Completed issues" icon={<CheckCircle2 className="h-5 w-5" />} accent="emerald" />
              <KpiCard title="High Priority" value={String(urgentCount)} subtitle="Urgent or important issues" icon={<AlertTriangle className="h-5 w-5" />} accent="rose" />
            </section>

            <section className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-3">
              <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h3 className="text-2xl font-semibold text-slate-900">
                      Request History
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      View all maintenance requests linked to your tenant account.
                    </p>
                  </div>

                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                    className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="ALL">All requests</option>
                    <option value="ACTIVE">Active only</option>
                    <option value="OPEN">Open</option>
                    <option value="IN_PROGRESS">In progress</option>
                    <option value="ON_HOLD">On hold</option>
                    <option value="RESOLVED">Resolved</option>
                    <option value="CLOSED">Closed</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>

                <div className="mt-6 space-y-4">
                  {filteredRequests.length === 0 ? (
                    <EmptyState
                      text={
                        requests.length === 0
                          ? "No maintenance request has been submitted yet."
                          : "No request matches this filter."
                      }
                    />
                  ) : (
                    filteredRequests.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-3xl border border-slate-200 bg-slate-50 p-4 transition hover:border-slate-300 hover:bg-white sm:p-5"
                      >
                        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                          <div className="flex min-w-0 flex-1 gap-3 sm:gap-4">
                            <div className="h-fit shrink-0 rounded-2xl bg-white p-3 text-slate-500 shadow-sm">
                              {getStatusIcon(item.status)}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className="min-w-0 break-words text-lg font-semibold text-slate-900">
                                  {item.title}
                                </h4>

                                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadge(item.status)}`}>
                                  {item.status?.replaceAll("_", " ")}
                                </span>

                                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getPriorityBadge(item.priority)}`}>
                                  {item.priority}
                                </span>
                              </div>

                              <p className="mt-2 break-words text-sm text-slate-500">
                                Request #: {item.requestNumber}
                              </p>

                              <p className="mt-3 max-w-3xl whitespace-pre-line break-words text-sm leading-7 text-slate-600">
                                {item.description || "No description provided."}
                              </p>

                              {Array.isArray(item.photos) && item.photos.length > 0 && (
                                <div className="mt-4">
                                  <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-500">
                                    <ImageIcon className="h-4 w-4" />
                                    Attached Photos
                                  </p>

                                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                                    {item.photos.slice(0, 4).map((photo, index) => (
                                      <a
                                        key={`${photo.url}-${index}`}
                                        href={getPhotoUrl(photo.url)}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="group overflow-hidden rounded-2xl border border-slate-200 bg-white"
                                      >
                                        <img
                                          src={getPhotoUrl(photo.url)}
                                          alt={photo.fileName || "Maintenance photo"}
                                          className="h-24 w-full object-cover transition group-hover:scale-105"
                                        />
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              )}

                              <div className="mt-4 grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
                                <InfoPill icon={<CalendarDays className="h-4 w-4" />} text={`Created: ${formatDate(item.createdAt)}`} />
                                <InfoPill icon={<Wrench className="h-4 w-4" />} text={`Category: ${item.category?.replaceAll("_", " ")}`} />
                                <InfoPill icon={<MapPin className="h-4 w-4" />} text={`Unit: ${item.unit?.unitCode || "N/A"}`} />
                                <InfoPill icon={<ShieldCheck className="h-4 w-4" />} text={item.entryPermission ? "Entry allowed" : "Entry not allowed"} />
                              </div>

                              <div className="mt-4 grid gap-3 2xl:grid-cols-2">
                                <InfoPill icon={<UserCircle2 className="h-4 w-4" />} text={`Contractor: ${item.contractor?.companyName || "Not assigned yet"}`} />
                                <InfoPill icon={<BadgeDollarSign className="h-4 w-4" />} text={`Estimate: ${formatMoney(item.estimatedCost)}`} />
                              </div>
                            </div>
                          </div>

                          <div className="flex w-full shrink-0 flex-wrap items-center gap-2 xl:w-auto">
                            <Link
                              href={`/tenant/maintenance/${item.id}`}
                              className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 sm:flex-none"
                            >
                              View
                              <ArrowRight className="h-4 w-4" />
                            </Link>

                            {item.status === "OPEN" && (
                              <Link
                                href={`/tenant/maintenance/edit/${item.id}`}
                                className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 shadow-sm transition hover:bg-blue-100 sm:flex-none"
                              >
                                <Pencil className="h-4 w-4" />
                                Edit
                              </Link>
                            )}
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
                    Your current maintenance profile.
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
                    <SummaryRow label="Total Requests" value={String(requests.length)} />
                    <SummaryRow label="Open" value={String(openCount)} />
                    <SummaryRow label="Resolved" value={String(resolvedCount)} />
                  </div>
                </div>

                <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-2xl font-semibold text-slate-900">
                    Latest Request
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Most recent maintenance activity.
                  </p>

                  {latestRequest ? (
                    <div className="mt-6 rounded-3xl bg-gradient-to-r from-blue-600 to-indigo-600 p-5 text-white">
                      <p className="text-sm text-blue-100">Title</p>
                      <p className="mt-1 text-2xl font-bold">
                        {latestRequest.title}
                      </p>

                      <div className="mt-5 space-y-2 text-sm text-blue-100">
                        <p>Status: {latestRequest.status?.replaceAll("_", " ")}</p>
                        <p>Priority: {latestRequest.priority}</p>
                        <p>Date: {formatDate(latestRequest.createdAt)}</p>
                        <p>Request #: {latestRequest.requestNumber}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-6">
                      <EmptyState text="No request available yet." />
                    </div>
                  )}
                </div>

                <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-2xl font-semibold text-slate-900">
                    Continue
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Navigate to another section.
                  </p>

                  <div className="mt-6 space-y-3">
                    <QuickLink href="/tenant" label="Back to Overview" />
                    <QuickLink href="/tenant/payments" label="Open Payments" />
                    <QuickLink href="/tenant/documents" label="Open Documents" />
                  </div>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[28px] bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5 md:px-8">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  Create Maintenance Request
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  Submit a new issue for your property or unit. You can attach up to 5 photos.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowCreateModal(false);
                  resetCreateForm();
                }}
                className="rounded-2xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRequest} className="space-y-5 overflow-y-auto p-6 md:p-8">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Title
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => updateIssueText("title", e.target.value)}
                  placeholder="Example: Water leaking in bathroom"
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Description
                </label>
                <textarea
                  rows={4}
                  value={form.description}
                  onChange={(e) =>
                    updateIssueText("description", e.target.value)
                  }
                  placeholder="Describe the issue..."
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="rounded-3xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-semibold">
                      Smart detection {autoClassification ? "is active" : "was manually adjusted"}
                    </p>
                    <p className="mt-1 text-blue-700">
                      Suggested: {form.category.replaceAll("_", " ")} · {form.priority}
                    </p>
                  </div>
                  {!autoClassification && (
                    <button
                      type="button"
                      onClick={applyAutoClassification}
                      className="rounded-2xl border border-blue-200 bg-white px-4 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100"
                    >
                      Detect again
                    </button>
                  )}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Category
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) => {
                      setAutoClassification(false);
                      setForm((prev) => ({
                        ...prev,
                        category: e.target.value,
                      }));
                    }}
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="GENERAL">General</option>
                    <option value="PLUMBING">Plumbing</option>
                    <option value="ELECTRICAL">Electrical</option>
                    <option value="HVAC">HVAC</option>
                    <option value="LOCKS">Locks</option>
                    <option value="PAINTING">Painting</option>
                    <option value="PEST_CONTROL">Pest Control</option>
                    <option value="APPLIANCE">Appliance</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Priority
                  </label>
                  <select
                    value={form.priority}
                    onChange={(e) => {
                      setAutoClassification(false);
                      setForm((prev) => ({
                        ...prev,
                        priority: e.target.value,
                      }));
                    }}
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Preferred Date
                  </label>
                  <input
                    type="date"
                    value={form.preferredDate}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        preferredDate: e.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Location Note
                  </label>
                  <input
                    type="text"
                    value={form.locationNote}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        locationNote: e.target.value,
                      }))
                    }
                    placeholder="Example: Master bathroom"
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-5">
                <label className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <Camera className="h-4 w-4" />
                  Photos
                </label>

                <label className="flex cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed border-blue-300 bg-white px-6 py-8 text-center transition hover:border-blue-500 hover:bg-blue-50">
                  <Camera className="mb-3 h-8 w-8 text-blue-600" />
                  <span className="text-sm font-semibold text-slate-800">
                    Click to upload photos
                  </span>
                  <span className="mt-1 text-xs text-slate-500">
                    JPG, PNG, WEBP · Max 5 photos · 5MB each
                  </span>

                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    multiple
                    className="hidden"
                    onChange={(e) => handlePhotoChange(e.target.files)}
                  />
                </label>

                {selectedPhotos.length > 0 && (
                  <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-3">
                    {selectedPhotos.map((file, index) => {
                      const previewUrl = URL.createObjectURL(file);

                      return (
                        <div
                          key={`${file.name}-${index}`}
                          className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                        >
                          <div className="relative">
                            <img
                              src={previewUrl}
                              alt={file.name}
                              className="h-28 w-full object-cover"
                            />

                            <button
                              type="button"
                              onClick={() => {
                                setSelectedPhotos((prev) =>
                                  prev.filter((_, photoIndex) => photoIndex !== index)
                                );
                                setUploadWarning("");
                                setFormError("");
                              }}
                              className="absolute right-2 top-2 rounded-full bg-black/70 p-1.5 text-white transition hover:bg-red-600"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>

                          <div className="p-3">
                            <p className="truncate text-xs font-semibold text-slate-700">
                              {file.name}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {formatFileSize(file.size)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <input
                  type="checkbox"
                  checked={form.entryPermission}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      entryPermission: e.target.checked,
                    }))
                  }
                  className="h-4 w-4"
                />
                <span className="text-sm font-medium text-slate-700">
                  Allow maintenance team to enter if needed
                </span>
              </label>

              {(formError || uploadWarning) && (
                <div className="rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                    <div>
                      <p className="font-semibold">Some photos could not be added</p>
                      <p className="mt-1 leading-6">{formError || uploadWarning}</p>
                      <p className="mt-2 text-xs text-amber-700">
                        Please upload JPG, PNG, or WEBP files. Maximum size: 5MB per image.
                        Maximum photos: 5.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    resetCreateForm();
                  }}
                  disabled={submitting}
                  className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Create Request
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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
  accent: "blue" | "emerald" | "amber" | "rose";
}) {
  const accentMap = {
    blue: "from-blue-500 to-blue-600",
    emerald: "from-emerald-500 to-emerald-600",
    amber: "from-amber-500 to-orange-500",
    rose: "from-rose-500 to-rose-600",
  };

  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className={`h-2 w-16 rounded-full bg-gradient-to-r ${accentMap[accent]}`} />
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

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
      <span className="text-sm text-slate-600">{label}</span>
      <span className="text-sm font-semibold text-slate-900">{value}</span>
    </div>
  );
}

function QuickLink({ href, label }: { href: string; label: string }) {
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

function InfoPill({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex min-w-0 items-start gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-xs font-medium leading-5 text-slate-600">
      <span className="mt-0.5 shrink-0 text-slate-400">{icon}</span>
      <span className="min-w-0 break-words">{text}</span>
    </div>
  );
}
