"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  Wrench,
  User,
  Building2,
  Home,
  CalendarDays,
  ShieldCheck,
  BadgeDollarSign,
  Save,
  FileText,
  AlertTriangle,
  CheckCircle2,
  PauseCircle,
  XCircle,
  Clock3,
  ImageIcon,
  Phone,
  MapPin,
  UserCircle2,
  Sparkles,
  Brain,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  Package,
  ClipboardList,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type StoredUser = {
  id?: string;
  fullName?: string;
  name?: string;
  email?: string;
  role?: string;
};

type Contractor = {
  id: string;
  companyName: string;
  phone?: string | null;
  city?: string | null;
  email?: string | null;
  serviceCategory?: string | null;
  specialties?: string | null;
  isActive?: boolean;
  baseFee?: number | string | null;
  hourlyRate?: number | string | null;
};

type AIRecommendation = {
  id: string;
  type: string;
  ownerDecision?: string | null;
  confidenceScore?: number | string | null;
  reasoning?: string | null;
  executedAt?: string | null;
  aiSuggestion?: {
    contractorId?: string | null;
    contractorName?: string | null;
    serviceCategory?: string | null;
    city?: string | null;
    rating?: number | string | null;
    baseFee?: number | string | null;
    hourlyRate?: number | string | null;
    estimatedHours?: number | string | null;
    estimatedLaborCost?: number | string | null;
    estimatedMaterialsCost?: number | string | null;
    estimatedTotalCost?: number | string | null;
    estimatedCost?: number | string | null;
    materialsNotes?: string | null;
    category?: string | null;
    priority?: string | null;
    propertyCity?: string | null;
    manualOverride?: boolean;
  } | null;
};

type MaintenanceRequest = {
  id: string;
  requestNumber: string;
  title: string;
  description?: string | null;
  category?: string | null;
  priority?: string | null;
  status?: string | null;
  locationNote?: string | null;
  preferredDate?: string | null;
  entryPermission?: boolean;
  estimatedCost?: number | string | null;
  estimatedLaborCost?: number | string | null;
  estimatedMaterialsCost?: number | string | null;
  estimatedTotalCost?: number | string | null;
  materialsNotes?: string | null;
  actualCost?: number | string | null;
  adminNotes?: string | null;
  createdAt?: string;
  updatedAt?: string;
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
    email?: string | null;
    phone?: string | null;
  } | null;
  contractor?: {
    id: string;
    companyName?: string | null;
    phone?: string | null;
    email?: string | null;
    city?: string | null;
    serviceCategory?: string | null;
  } | null;
  aiRecommendations?: AIRecommendation[];
  photos?: {
    url: string;
    fileName?: string;
    mimeType?: string;
    size?: number;
  }[] | null;
};

function formatDate(value?: string | null) {
  if (!value) return "Not set";
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(value?: string | null) {
  if (!value) return "Not set";
  return new Date(value).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMoney(value?: string | number | null) {
  if (value === null || value === undefined || value === "") return "Pending";
  const amount = Number(value);
  if (Number.isNaN(amount)) return String(value);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function getPhotoUrl(photoUrl?: string | null) {
  if (!photoUrl) return "";
  if (photoUrl.startsWith("http")) return photoUrl;
  return `${API_BASE}${photoUrl}`;
}

function toNumber(value?: string | number | null) {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  return Number.isNaN(num) ? null : num;
}

function statusBadge(status?: string | null) {
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

function priorityBadge(priority?: string | null) {
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

function statusIcon(status?: string | null) {
  switch (status) {
    case "OPEN":
      return <Clock3 className="h-5 w-5" />;
    case "IN_PROGRESS":
      return <Wrench className="h-5 w-5" />;
    case "ON_HOLD":
      return <PauseCircle className="h-5 w-5" />;
    case "RESOLVED":
      return <CheckCircle2 className="h-5 w-5" />;
    case "CLOSED":
      return <CheckCircle2 className="h-5 w-5" />;
    case "CANCELLED":
      return <XCircle className="h-5 w-5" />;
    default:
      return <AlertTriangle className="h-5 w-5" />;
  }
}

export default function MaintenanceDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [, setUser] = useState<StoredUser | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [approvingSuggestion, setApprovingSuggestion] = useState(false);
  const [rejectingSuggestion, setRejectingSuggestion] = useState(false);
  const [refreshingSuggestion, setRefreshingSuggestion] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [request, setRequest] = useState<MaintenanceRequest | null>(null);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [recommendation, setRecommendation] = useState<AIRecommendation | null>(
    null
  );

  const [form, setForm] = useState({
    contractorId: "",
    status: "OPEN",
    estimatedCost: "",
    estimatedLaborCost: "",
    estimatedMaterialsCost: "",
    estimatedTotalCost: "",
    materialsNotes: "",
    actualCost: "",
    adminNotes: "",
  });

  const [selectedPhoto, setSelectedPhoto] = useState<{
  url: string;
  fileName?: string;
} | null>(null);


  useEffect(() => {
    const token = localStorage.getItem("token");
    const rawUser = localStorage.getItem("user");

    if (!token || !rawUser) {
      router.replace("/");
      return;
    }

    try {
      const parsedUser: StoredUser = JSON.parse(rawUser);
      const role = String(parsedUser?.role || "").trim().toLowerCase();

      if (role === "tenant") {
        router.replace("/tenant");
        return;
      }

      setUser(parsedUser);
      setCheckingAuth(false);
    } catch (err) {
      console.error("Maintenance details auth error:", err);
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      router.replace("/");
    }
  }, [router]);

  useEffect(() => {
    if (!checkingAuth && id) {
      loadData();
    }
  }, [checkingAuth, id]);

  useEffect(() => {
    const labor = toNumber(form.estimatedLaborCost);
    const materials = toNumber(form.estimatedMaterialsCost);

    if (labor !== null || materials !== null) {
      const total = (labor || 0) + (materials || 0);
      setForm((prev) => ({
        ...prev,
        estimatedTotalCost: total > 0 ? String(total) : "",
      }));
    }
  }, [form.estimatedLaborCost, form.estimatedMaterialsCost]);

  async function loadData() {
    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const token = localStorage.getItem("token");

      const [requestRes, contractorsRes, recommendationRes] = await Promise.all([
        fetch(`${API_BASE}/api/maintenance/${id}`, {
          cache: "no-store",
          headers: { Authorization: `Bearer ${token || ""}` },
        }),
        fetch(`${API_BASE}/api/contractors`, {
          cache: "no-store",
          headers: { Authorization: `Bearer ${token || ""}` },
        }),
        fetch(`${API_BASE}/api/maintenance/${id}/recommendation`, {
          cache: "no-store",
          headers: { Authorization: `Bearer ${token || ""}` },
        }),
      ]);

      if (
        requestRes.status === 401 ||
        contractorsRes.status === 401 ||
        recommendationRes.status === 401
      ) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        router.replace("/");
        return;
      }

      const requestData = await requestRes.json().catch(() => null);
      const contractorsData = await contractorsRes.json().catch(() => []);
      const recommendationData = await recommendationRes.json().catch(() => null);

      if (!requestRes.ok) {
        throw new Error(requestData?.error || "Failed to load request");
      }

      if (!contractorsRes.ok) {
        throw new Error(contractorsData?.error || "Failed to load contractors");
      }

      setRequest(requestData);

      const activeContractors = Array.isArray(contractorsData)
        ? contractorsData.filter((item: Contractor) => item.isActive !== false)
        : [];

      setContractors(activeContractors);

      if (recommendationRes.ok) {
        setRecommendation(recommendationData);
      } else {
        setRecommendation(null);
      }

      setForm({
        contractorId: requestData?.contractor?.id || "",
        status: requestData?.status || "OPEN",
        estimatedCost:
          requestData?.estimatedCost !== null &&
          requestData?.estimatedCost !== undefined
            ? String(requestData.estimatedCost)
            : "",
        estimatedLaborCost:
          requestData?.estimatedLaborCost !== null &&
          requestData?.estimatedLaborCost !== undefined
            ? String(requestData.estimatedLaborCost)
            : "",
        estimatedMaterialsCost:
          requestData?.estimatedMaterialsCost !== null &&
          requestData?.estimatedMaterialsCost !== undefined
            ? String(requestData.estimatedMaterialsCost)
            : "",
        estimatedTotalCost:
          requestData?.estimatedTotalCost !== null &&
          requestData?.estimatedTotalCost !== undefined
            ? String(requestData.estimatedTotalCost)
            : "",
        materialsNotes: requestData?.materialsNotes || "",
        actualCost:
          requestData?.actualCost !== null &&
          requestData?.actualCost !== undefined
            ? String(requestData.actualCost)
            : "",
        adminNotes: requestData?.adminNotes || "",
      });
    } catch (err: any) {
      console.error("Maintenance details load error:", err);
      setError(err?.message || "Failed to load request.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveRequestUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const token = localStorage.getItem("token");

      const res = await fetch(`${API_BASE}/api/maintenance/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token || ""}`,
        },
        body: JSON.stringify({
          status: form.status,
          estimatedCost:
            form.estimatedCost !== "" ? Number(form.estimatedCost) : null,
          estimatedLaborCost:
            form.estimatedLaborCost !== ""
              ? Number(form.estimatedLaborCost)
              : null,
          estimatedMaterialsCost:
            form.estimatedMaterialsCost !== ""
              ? Number(form.estimatedMaterialsCost)
              : null,
          estimatedTotalCost:
            form.estimatedTotalCost !== ""
              ? Number(form.estimatedTotalCost)
              : null,
          materialsNotes: form.materialsNotes.trim() || null,
          actualCost: form.actualCost !== "" ? Number(form.actualCost) : null,
          adminNotes: form.adminNotes.trim() || null,
        }),
      });

      const data = await res.json().catch(() => null);

      if (res.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        router.replace("/");
        return;
      }

      if (!res.ok) {
        throw new Error(data?.error || "Failed to update maintenance request");
      }

      setSuccess("Maintenance request updated successfully.");
      await loadData();
    } catch (err: any) {
      console.error("Maintenance update error:", err);
      setError(err?.message || "Failed to update request.");
    } finally {
      setSaving(false);
    }
  }

  async function handleGenerateSuggestion() {
    try {
      setRefreshingSuggestion(true);
      setError("");
      setSuccess("");

      const token = localStorage.getItem("token");

      const res = await fetch(
        `${API_BASE}/api/maintenance/${id}/recommendation/refresh`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token || ""}`,
          },
        }
      );

      const data = await res.json().catch(() => null);

      if (res.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        router.replace("/");
        return;
      }

      if (!res.ok) {
        throw new Error(data?.error || "Failed to generate AI suggestion");
      }

      setSuccess("AI contractor suggestion generated successfully.");
      await loadData();
    } catch (err: any) {
      console.error("Generate suggestion error:", err);
      setError(err?.message || "Failed to generate AI suggestion.");
    } finally {
      setRefreshingSuggestion(false);
    }
  }

  async function handleApproveSuggestion() {
    try {
      setApprovingSuggestion(true);
      setError("");
      setSuccess("");

      const token = localStorage.getItem("token");

      const res = await fetch(
        `${API_BASE}/api/maintenance/${id}/approve-contractor`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token || ""}`,
          },
        }
      );

      const data = await res.json().catch(() => null);

      if (res.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        router.replace("/");
        return;
      }

      if (!res.ok) {
        throw new Error(data?.error || "Failed to approve contractor suggestion");
      }

      setSuccess("AI contractor suggestion approved successfully.");
      await loadData();
    } catch (err: any) {
      console.error("Approve suggestion error:", err);
      setError(err?.message || "Failed to approve suggestion.");
    } finally {
      setApprovingSuggestion(false);
    }
  }

  async function handleRejectSuggestion() {
    try {
      setRejectingSuggestion(true);
      setError("");
      setSuccess("");

      const token = localStorage.getItem("token");

      const res = await fetch(
        `${API_BASE}/api/maintenance/${id}/reject-contractor`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token || ""}`,
          },
        }
      );

      const data = await res.json().catch(() => null);

      if (res.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        router.replace("/");
        return;
      }

      if (!res.ok) {
        throw new Error(data?.error || "Failed to reject contractor suggestion");
      }

      setSuccess("AI contractor suggestion rejected.");
      await loadData();
    } catch (err: any) {
      console.error("Reject suggestion error:", err);
      setError(err?.message || "Failed to reject suggestion.");
    } finally {
      setRejectingSuggestion(false);
    }
  }

  async function handleUseManualAssignment() {
    try {
      if (!form.contractorId) {
        setError("Please select a contractor first.");
        return;
      }

      setSaving(true);
      setError("");
      setSuccess("");

      const token = localStorage.getItem("token");

      const res = await fetch(
        `${API_BASE}/api/maintenance/${id}/reassign-contractor`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token || ""}`,
          },
          body: JSON.stringify({
            contractorId: form.contractorId,
            estimatedLaborCost:
              form.estimatedLaborCost !== ""
                ? Number(form.estimatedLaborCost)
                : null,
            estimatedMaterialsCost:
              form.estimatedMaterialsCost !== ""
                ? Number(form.estimatedMaterialsCost)
                : null,
            estimatedTotalCost:
              form.estimatedTotalCost !== ""
                ? Number(form.estimatedTotalCost)
                : null,
            materialsNotes: form.materialsNotes.trim() || null,
          }),
        }
      );

      const data = await res.json().catch(() => null);

      if (res.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        router.replace("/");
        return;
      }

      if (!res.ok) {
        throw new Error(data?.error || "Failed to assign manual contractor");
      }

      setSuccess("Contractor assigned manually.");
      await loadData();
    } catch (err: any) {
      console.error("Manual assignment error:", err);
      setError(err?.message || "Failed to assign contractor manually.");
    } finally {
      setSaving(false);
    }
  }

  const selectedContractor = useMemo(() => {
    return contractors.find((item) => item.id === form.contractorId) || null;
  }, [contractors, form.contractorId]);

  const suggestionData = recommendation?.aiSuggestion || null;
  const pendingSuggestion = recommendation?.ownerDecision === "PENDING";

  if (checkingAuth || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-white px-8 py-6 shadow-xl text-slate-700">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading maintenance details...
        </div>
      </div>
    );
  }

  if (error && !request) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
        <div className="w-full max-w-2xl rounded-3xl border border-rose-200 bg-white p-8 shadow-xl">
          <h2 className="text-2xl font-bold text-rose-600">
            Unable to load maintenance
          </h2>
          <p className="mt-3 text-slate-600">{error}</p>
          <Link
            href="/maintenance"
            className="mt-6 inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Maintenance
          </Link>
        </div>
      </div>
    );
  }

  if (!request) return null;

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-8 md:px-6 md:py-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/maintenance"
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>

            <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
              {statusIcon(request.status)}
              Maintenance Details
            </span>
          </div>

          <button
            onClick={handleGenerateSuggestion}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            {refreshingSuggestion ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Generate AI
          </button>
        </div>

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {success}
          </div>
        )}

        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Request Number
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                {request.requestNumber}
              </h1>
              <h2 className="mt-3 text-xl font-semibold text-slate-800">
                {request.title}
              </h2>
            </div>

            <div className="flex flex-wrap gap-2">
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusBadge(
                  request.status
                )}`}
              >
                {request.status?.replaceAll("_", " ")}
              </span>

              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${priorityBadge(
                  request.priority
                )}`}
              >
                {request.priority}
              </span>
            </div>
          </div>

          <div className="mt-8 grid gap-6 xl:grid-cols-3">
            <div className="xl:col-span-2 space-y-6">
              <Panel
                title="Description"
                icon={<FileText className="h-5 w-5 text-slate-500" />}
              >
                <p className="text-sm leading-7 text-slate-700">
                  {request.description || "No description provided."}
                </p>
              </Panel>

              <Panel
  title="Attached Photos"
  icon={<ImageIcon className="h-5 w-5 text-slate-500" />}
>
  {Array.isArray(request.photos) && request.photos.length > 0 ? (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
      {request.photos.map((photo, index) => (
        <button
          type="button"
          key={`${photo.url}-${index}`}
          onClick={() =>
            setSelectedPhoto({
              url: getPhotoUrl(photo.url),
              fileName: photo.fileName || `Photo ${index + 1}`,
            })
          }
          className="group overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm"
        >
          <img
            src={getPhotoUrl(photo.url)}
            alt={photo.fileName || "Maintenance photo"}
            className="h-40 w-full object-cover transition group-hover:scale-105"
          />

          <div className="p-3">
            <p className="truncate text-xs font-semibold text-slate-700">
              {photo.fileName || `Photo ${index + 1}`}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Click to open
            </p>
          </div>
        </button>
      ))}
    </div>
  ) : (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-5 text-sm text-slate-500">
      No photos attached to this maintenance request.
    </div>
  )}
</Panel>

              <Panel
                title="Request Details"
                icon={<Wrench className="h-5 w-5 text-slate-500" />}
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <DetailCard
                    icon={<CalendarDays className="h-4 w-4" />}
                    label="Created On"
                    value={formatDateTime(request.createdAt)}
                  />
                  <DetailCard
                    icon={<CalendarDays className="h-4 w-4" />}
                    label="Preferred Date"
                    value={formatDate(request.preferredDate)}
                  />
                  <DetailCard
                    icon={<Wrench className="h-4 w-4" />}
                    label="Category"
                    value={request.category?.replaceAll("_", " ") || "N/A"}
                  />
                  <DetailCard
                    icon={<AlertTriangle className="h-4 w-4" />}
                    label="Priority"
                    value={request.priority || "N/A"}
                  />
                  <DetailCard
                    icon={<MapPin className="h-4 w-4" />}
                    label="Location Note"
                    value={request.locationNote || "Not specified"}
                  />
                  <DetailCard
                    icon={<ShieldCheck className="h-4 w-4" />}
                    label="Entry Permission"
                    value={request.entryPermission ? "Allowed" : "Not allowed"}
                  />
                </div>
              </Panel>

              <Panel
                title="Property & Tenant"
                icon={<Building2 className="h-5 w-5 text-slate-500" />}
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <DetailCard
                    icon={<Building2 className="h-4 w-4" />}
                    label="Property"
                    value={request.property?.name || request.property?.code || "N/A"}
                  />
                  <DetailCard
                    icon={<MapPin className="h-4 w-4" />}
                    label="Address"
                    value={
                      request.property?.addressLine1 ||
                      request.property?.city ||
                      "N/A"
                    }
                  />
                  <DetailCard
                    icon={<Home className="h-4 w-4" />}
                    label="Unit"
                    value={request.unit?.unitCode || request.unit?.unitName || "N/A"}
                  />
                  <DetailCard
                    icon={<User className="h-4 w-4" />}
                    label="Tenant"
                    value={
                      `${request.tenant?.firstName || ""} ${
                        request.tenant?.lastName || ""
                      }`.trim() || "N/A"
                    }
                  />
                </div>
              </Panel>
            </div>

            <div className="space-y-6">
              <Panel
                title="AI Contractor Suggestion"
                icon={<Brain className="h-5 w-5 text-slate-500" />}
              >
                {recommendation && suggestionData ? (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                        <Sparkles className="h-3.5 w-3.5" />
                        AI Suggestion
                      </span>

                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          recommendation.ownerDecision === "APPROVED"
                            ? "border border-emerald-200 bg-emerald-100 text-emerald-700"
                            : recommendation.ownerDecision === "REJECTED"
                            ? "border border-rose-200 bg-rose-100 text-rose-700"
                            : recommendation.ownerDecision === "MODIFIED"
                            ? "border border-blue-200 bg-blue-100 text-blue-700"
                            : "border border-amber-200 bg-amber-100 text-amber-700"
                        }`}
                      >
                        {recommendation.ownerDecision || "PENDING"}
                      </span>

                      <span className="inline-flex rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                        Confidence: {recommendation.confidenceScore || 0}%
                      </span>
                    </div>

                    {suggestionData.manualOverride && (
                      <div className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">
                        This suggestion has been manually modified by admin.
                      </div>
                    )}

                    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
                      <InfoLine
                        label="Suggested Contractor"
                        value={suggestionData.contractorName || "N/A"}
                      />
                      <InfoLine
                        label="Service Category"
                        value={suggestionData.serviceCategory || "N/A"}
                      />
                      <InfoLine label="City" value={suggestionData.city || "N/A"} />
                      <InfoLine
                        label="Estimated Hours"
                        value={
                          suggestionData.estimatedHours
                            ? String(suggestionData.estimatedHours)
                            : "N/A"
                        }
                      />
                      <InfoLine
                        label="Labor Cost"
                        value={formatMoney(suggestionData.estimatedLaborCost)}
                      />
                      <InfoLine
                        label="Materials Cost"
                        value={formatMoney(suggestionData.estimatedMaterialsCost)}
                      />
                      <InfoLine
                        label="Total Estimated"
                        value={formatMoney(
                          suggestionData.estimatedTotalCost ??
                            suggestionData.estimatedCost
                        )}
                      />
                      <InfoLine
                        label="Rate Summary"
                        value={`Base ${formatMoney(
                          suggestionData.baseFee
                        )} / Hour ${formatMoney(suggestionData.hourlyRate)}`}
                      />
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Reasoning
                      </p>
                      <p className="mt-2 text-sm leading-7 text-slate-700">
                        {recommendation.reasoning || "No reasoning provided."}
                      </p>
                    </div>

                    {pendingSuggestion && (
                      <div className="grid gap-3">
                        <button
                          type="button"
                          onClick={handleApproveSuggestion}
                          disabled={approvingSuggestion}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {approvingSuggestion ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <ThumbsUp className="h-4 w-4" />
                          )}
                          Approve Suggestion
                        </button>

                        <button
                          type="button"
                          onClick={handleRejectSuggestion}
                          disabled={rejectingSuggestion}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-rose-600 px-5 py-3 text-sm font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {rejectingSuggestion ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <ThumbsDown className="h-4 w-4" />
                          )}
                          Reject Suggestion
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-5 text-sm text-slate-500">
                      No AI contractor suggestion available for this request.
                    </div>

                    <button
                      type="button"
                      onClick={handleGenerateSuggestion}
                      disabled={refreshingSuggestion}
                      className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {refreshingSuggestion ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4" />
                          Generate AI Suggestion
                        </>
                      )}
                    </button>
                  </div>
                )}
              </Panel>

              <Panel
                title="Current Assignment"
                icon={<Phone className="h-5 w-5 text-slate-500" />}
              >
                {request.contractor ? (
                  <div className="space-y-4">
                    <DetailCard
                      icon={<UserCircle2 className="h-4 w-4" />}
                      label="Contractor"
                      value={request.contractor.companyName || "N/A"}
                    />
                    <DetailCard
                      icon={<Phone className="h-4 w-4" />}
                      label="Phone"
                      value={request.contractor.phone || "N/A"}
                    />
                    <DetailCard
                      icon={<Wrench className="h-4 w-4" />}
                      label="Service Category"
                      value={request.contractor.serviceCategory || "N/A"}
                    />
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-5 text-sm text-slate-500">
                    No contractor assigned yet.
                  </div>
                )}
              </Panel>

              <Panel
                title="Cost Summary"
                icon={<BadgeDollarSign className="h-5 w-5 text-slate-500" />}
              >
                <div className="space-y-4">
                  <DetailCard
                    icon={<BadgeDollarSign className="h-4 w-4" />}
                    label="Estimated Cost"
                    value={formatMoney(request.estimatedCost)}
                  />
                  <DetailCard
                    icon={<BadgeDollarSign className="h-4 w-4" />}
                    label="Labor Cost"
                    value={formatMoney(request.estimatedLaborCost)}
                  />
                  <DetailCard
                    icon={<Package className="h-4 w-4" />}
                    label="Materials Cost"
                    value={formatMoney(request.estimatedMaterialsCost)}
                  />
                  <DetailCard
                    icon={<ClipboardList className="h-4 w-4" />}
                    label="Total Estimated"
                    value={formatMoney(
                      request.estimatedTotalCost ?? request.estimatedCost
                    )}
                  />
                  <DetailCard
                    icon={<BadgeDollarSign className="h-4 w-4" />}
                    label="Actual Cost"
                    value={formatMoney(request.actualCost)}
                  />
                </div>

                <div className="mt-4">
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                    <div className="flex items-center gap-2 text-slate-500">
                      <FileText className="h-4 w-4" />
                      <p className="text-xs font-semibold uppercase tracking-wide">
                        Materials Notes
                      </p>
                    </div>
                    <p className="mt-2 text-sm font-medium text-slate-900">
                      {request.materialsNotes || "No materials notes yet."}
                    </p>
                  </div>
                </div>
              </Panel>

              <Panel
                title="Manual Override"
                icon={<UserCircle2 className="h-5 w-5 text-slate-500" />}
              >
                <form onSubmit={handleSaveRequestUpdate} className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Select Another Contractor
                    </label>
                    <select
                      value={form.contractorId}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          contractorId: e.target.value,
                        }))
                      }
                      className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    >
                      <option value="">Select contractor</option>
                      {contractors.map((contractor) => (
                        <option key={contractor.id} value={contractor.id}>
                          {contractor.companyName}
                          {contractor.serviceCategory
                            ? ` — ${contractor.serviceCategory}`
                            : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedContractor && (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                      <p className="font-semibold text-slate-900">
                        {selectedContractor.companyName}
                      </p>
                      <p className="mt-1">
                        {selectedContractor.serviceCategory || "No category"}
                      </p>
                      <p className="mt-1">{selectedContractor.phone || "No phone"}</p>
                      <p className="mt-1">{selectedContractor.city || "No city"}</p>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleUseManualAssignment}
                    disabled={saving}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Assigning...
                      </>
                    ) : (
                      <>
                        <UserCircle2 className="h-4 w-4" />
                        Override With Manual Contractor
                      </>
                    )}
                  </button>

                  <div className="border-t border-slate-200 pt-4">
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Status
                    </label>
                    <select
                      value={form.status}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          status: e.target.value,
                        }))
                      }
                      className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    >
                      <option value="OPEN">OPEN</option>
                      <option value="IN_PROGRESS">IN_PROGRESS</option>
                      <option value="ON_HOLD">ON_HOLD</option>
                      <option value="RESOLVED">RESOLVED</option>
                      <option value="CLOSED">CLOSED</option>
                      <option value="CANCELLED">CANCELLED</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Labor Cost
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={form.estimatedLaborCost}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          estimatedLaborCost: e.target.value,
                        }))
                      }
                      placeholder="Estimated labor cost"
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Materials Cost
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={form.estimatedMaterialsCost}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          estimatedMaterialsCost: e.target.value,
                        }))
                      }
                      placeholder="Estimated materials cost"
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Total Estimated Cost
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={form.estimatedTotalCost}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          estimatedTotalCost: e.target.value,
                        }))
                      }
                      placeholder="Total estimated cost"
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Estimated Cost (legacy)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={form.estimatedCost}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          estimatedCost: e.target.value,
                        }))
                      }
                      placeholder="Estimated cost"
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Materials Notes
                    </label>
                    <textarea
                      rows={4}
                      value={form.materialsNotes}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          materialsNotes: e.target.value,
                        }))
                      }
                      placeholder="Ex: pipe replacement, cable, paint, spare parts..."
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Actual Cost
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={form.actualCost}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          actualCost: e.target.value,
                        }))
                      }
                      placeholder="Actual cost"
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Admin Notes
                    </label>
                    <textarea
                      rows={5}
                      value={form.adminNotes}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          adminNotes: e.target.value,
                        }))
                      }
                      placeholder="Internal notes..."
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Save Request Update
                      </>
                    )}
                  </button>
                </form>
              </Panel>
            </div>
          </div>
        </div>
      </div>



      {selectedPhoto && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
    <div className="relative w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <div>
          <p className="text-sm font-semibold text-slate-900">
            Maintenance Photo
          </p>
          <p className="text-xs text-slate-500">
            {selectedPhoto.fileName}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setSelectedPhoto(null)}
          className="rounded-full bg-slate-100 p-2 text-slate-600 hover:bg-slate-200"
        >
          <XCircle className="h-5 w-5" />
        </button>
      </div>

      <div className="max-h-[78vh] bg-slate-950 p-4">
        <img
          src={selectedPhoto.url}
          alt={selectedPhoto.fileName || "Maintenance photo"}
          className="mx-auto max-h-[72vh] w-auto rounded-2xl object-contain"
        />
      </div>
    </div>
  </div>
)}
    </div>
  );
}

function Panel({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
      <div className="mb-4 flex items-center gap-2">
        {icon}
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function DetailCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
      <div className="flex items-center gap-2 text-slate-500">
        {icon}
        <p className="text-xs font-semibold uppercase tracking-wide">{label}</p>
      </div>
      <p className="mt-2 text-sm font-medium text-slate-900">{value}</p>
    </div>
  );
}

function InfoLine({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 last:border-b-0 last:pb-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-right text-sm font-semibold text-slate-900">
        {value}
      </span>
    </div>
  );
}