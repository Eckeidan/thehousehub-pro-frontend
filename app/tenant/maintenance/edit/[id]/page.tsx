"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  Save,
  AlertTriangle,
} from "lucide-react";


const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type AuthUser = {
  id: string;
  role?: string;
  tenantId?: string | null;
  tenant?: {
    id: string;
    property?: {
      id: string;
    } | null;
    unit?: {
      id: string;
    } | null;
  } | null;
};

type MaintenanceItem = {
  id: string;
  title: string;
  description?: string | null;
  category: string;
  priority: string;
  status: string;
  locationNote?: string | null;
  preferredDate?: string | null;
  entryPermission?: boolean;
  tenant?: {
    id: string;
  } | null;
};

export default function TenantMaintenanceEditPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [user, setUser] = useState<AuthUser | null>(null);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");

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
        router.replace("/");
        return;
      }

      setCheckingAuth(false);
    } catch {
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

  async function loadData() {
    try {
      setLoading(true);
      setError("");
      setFormError("");

      const token = localStorage.getItem("token");

      const meRes = await fetch(`${API_URL}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${token || ""}`,
        },
        cache: "no-store",
      });

      const meData = await meRes.json().catch(() => null);

      if (!meRes.ok) {
        throw new Error(meData?.error || "Failed to load tenant profile");
      }

      const currentUser: AuthUser = meData?.user || null;
      setUser(currentUser);

      const requestRes = await fetch(`${API_URL}/api/tenant/maintenance/${id}`, {
        headers: {
          Authorization: `Bearer ${token || ""}`,
        },
        cache: "no-store",
      });

      const requestData: MaintenanceItem | any = await requestRes
        .json()
        .catch(() => null);

      if (!requestRes.ok) {
        throw new Error(requestData?.error || "Failed to load request");
      }

      const tenantId = currentUser?.tenant?.id || currentUser?.tenantId;

      if (requestData?.tenant?.id !== tenantId) {
        throw new Error("You are not allowed to edit this request.");
      }

      if (requestData?.status !== "OPEN") {
        throw new Error("Only OPEN requests can be edited.");
      }

      setForm({
        title: requestData?.title || "",
        description: requestData?.description || "",
        category: requestData?.category || "GENERAL",
        priority: requestData?.priority || "MEDIUM",
        preferredDate: requestData?.preferredDate
          ? new Date(requestData.preferredDate).toISOString().split("T")[0]
          : "",
        entryPermission: Boolean(requestData?.entryPermission),
        locationNote: requestData?.locationNote || "",
      });
    } catch (err: any) {
      console.error("Tenant maintenance edit load error:", err);
      setError(err?.message || "Failed to load maintenance request.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!form.title.trim()) {
      setFormError("Title is required.");
      return;
    }

    try {
      setSaving(true);
      setFormError("");

      const token = localStorage.getItem("token");

      const res = await fetch(`${API_URL}/api/tenant/maintenance/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token || ""}`,
        },
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim() || null,
          category: form.category,
          priority: form.priority,
          preferredDate: form.preferredDate || null,
          entryPermission: form.entryPermission,
          locationNote: form.locationNote.trim() || null,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "Failed to update request.");
      }

      router.push(`/tenant/maintenance/${id}`);
    } catch (err: any) {
      console.error("Tenant maintenance edit save error:", err);
      setFormError(err?.message || "Failed to update request.");
    } finally {
      setSaving(false);
    }
  }

  if (checkingAuth || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4f7fb]">
        <div className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-white px-8 py-6 shadow-xl text-slate-700">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading request...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4f7fb] p-6">
        <div className="w-full max-w-2xl rounded-3xl border border-rose-200 bg-white p-8 shadow-xl">
          <div className="flex items-center gap-3 text-rose-600">
            <AlertTriangle className="h-6 w-6" />
            <h2 className="text-2xl font-bold">Unable to edit request</h2>
          </div>

          <p className="mt-4 text-slate-600">{error}</p>

          <div className="mt-6">
            <Link
              href="/tenant/maintenance"
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Maintenance
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f7fb] px-4 py-8 md:px-6 md:py-10">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href={`/tenant/maintenance/${id}`}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Edit Maintenance Request
            </h1>
            <p className="mt-2 text-slate-500">
              You can update this request while it is still open.
            </p>
          </div>

          {formError && (
            <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {formError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Title
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, title: e.target.value }))
                }
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Description
              </label>
              <textarea
                rows={5}
                value={form.description}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Category
                </label>
                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, category: e.target.value }))
                  }
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
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, priority: e.target.value }))
                  }
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
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
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

            <div className="flex justify-end gap-3 pt-2">
              <Link
                href={`/tenant/maintenance/${id}`}
                className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </Link>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Update Request
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
