"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Save, Wrench } from "lucide-react";

const API_BASE = "http://localhost:4000/api";

type StoredUser = {
  id?: string;
  fullName?: string;
  name?: string;
  email?: string;
  role?: string;
};

type Property = {
  id: string;
  code: string;
  name?: string | null;
  addressLine1?: string | null;
  city?: string | null;
};

type Unit = {
  id: string;
  propertyId: string;
  unitCode: string;
  unitName?: string | null;
  occupancyStatus?: string | null;
  isActive: boolean;
  floor?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
};

type Tenant = {
  id: string;
  firstName: string;
  lastName: string;
  propertyId?: string | null;
  unitId?: string | null;
  isActive?: boolean;
};

type MaintenanceRequest = {
  id: string;
  title?: string;
  description?: string | null;
  category?: string;
  priority?: string;
  propertyId?: string;
  unitId?: string | null;
  tenantId?: string | null;
  preferredDate?: string | null;
  entryPermission?: boolean;
};

type FormState = {
  title: string;
  description: string;
  category: string;
  priority: string;
  propertyId: string;
  unitId: string;
  tenantId: string;
  preferredDate: string;
  entryPermission: boolean;
};

export default function EditMaintenanceRequestPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [user, setUser] = useState<StoredUser | null>(null);

  const [properties, setProperties] = useState<Property[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [loadingTenants, setLoadingTenants] = useState(false);
  const [saving, setSaving] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [form, setForm] = useState<FormState>({
    title: "",
    description: "",
    category: "GENERAL",
    priority: "MEDIUM",
    propertyId: "",
    unitId: "",
    tenantId: "",
    preferredDate: "",
    entryPermission: false,
  });

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
      console.error("Edit maintenance auth error:", error);
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      router.replace("/");
    }
  }, [router]);

  useEffect(() => {
    if (!checkingAuth && id) {
      loadInitialData();
    }
  }, [checkingAuth, id]);

  useEffect(() => {
    if (!checkingAuth && form.propertyId) {
      fetchUnitsByProperty(form.propertyId);
    } else {
      setUnits([]);
    }
  }, [checkingAuth, form.propertyId]);

  useEffect(() => {
    if (!checkingAuth && form.unitId) {
      fetchTenantsByUnit(form.unitId);
    } else {
      setTenants([]);
    }
  }, [checkingAuth, form.unitId]);

  const handleUnauthorized = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.replace("/");
  };

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const token = localStorage.getItem("token");

      const [requestRes, propertiesRes] = await Promise.all([
        fetch(`${API_BASE}/maintenance/${id}`, {
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${token || ""}`,
          },
        }),
        fetch(`${API_BASE}/properties`, {
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${token || ""}`,
          },
        }),
      ]);

      if (requestRes.status === 401 || propertiesRes.status === 401) {
        handleUnauthorized();
        return;
      }

      const requestData = await requestRes.json();
      const propertiesData = await propertiesRes.json();

      if (!requestRes.ok) {
        throw new Error(
          requestData?.error || "Failed to load maintenance request"
        );
      }

      if (!propertiesRes.ok) {
        throw new Error(propertiesData?.error || "Failed to load properties");
      }

      const request: MaintenanceRequest = requestData;

      setProperties(Array.isArray(propertiesData) ? propertiesData : []);
      setForm({
        title: request.title || "",
        description: request.description || "",
        category: request.category || "GENERAL",
        priority: request.priority || "MEDIUM",
        propertyId: request.propertyId || "",
        unitId: request.unitId || "",
        tenantId: request.tenantId || "",
        preferredDate: request.preferredDate
          ? String(request.preferredDate).slice(0, 10)
          : "",
        entryPermission: Boolean(request.entryPermission),
      });
    } catch (error: any) {
      console.error("Error loading maintenance request:", error);
      setErrorMessage(
        error?.message || "Unable to load maintenance request."
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchUnitsByProperty = async (propertyId: string) => {
    try {
      setLoadingUnits(true);

      const token = localStorage.getItem("token");

      const res = await fetch(
        `${API_BASE}/units?propertyId=${encodeURIComponent(propertyId)}`,
        {
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${token || ""}`,
          },
        }
      );

      if (res.status === 401) {
        handleUnauthorized();
        return;
      }

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to load units");
      }

      setUnits(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error("Error loading units:", error);
      setErrorMessage(error?.message || "Unable to load units.");
      setUnits([]);
    } finally {
      setLoadingUnits(false);
    }
  };

  const fetchTenantsByUnit = async (unitId: string) => {
    try {
      setLoadingTenants(true);

      const token = localStorage.getItem("token");

      const res = await fetch(`${API_BASE}/tenants`, {
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${token || ""}`,
        },
      });

      if (res.status === 401) {
        handleUnauthorized();
        return;
      }

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to load tenants");
      }

      const allTenants = Array.isArray(data) ? data : [];
      const linkedTenants = allTenants.filter(
        (tenant: Tenant) => tenant.unitId === unitId && tenant.isActive !== false
      );

      setTenants(linkedTenants);
    } catch (error: any) {
      console.error("Error loading tenants:", error);
      setErrorMessage(error?.message || "Unable to load tenants.");
      setTenants([]);
    } finally {
      setLoadingTenants(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const target = e.target;
    const { name, value } = target;

    setForm((prev) => ({
      ...prev,
      [name]:
        target instanceof HTMLInputElement && target.type === "checkbox"
          ? target.checked
          : value,
      ...(name === "propertyId" ? { unitId: "", tenantId: "" } : {}),
      ...(name === "unitId" ? { tenantId: "" } : {}),
    }));

    if (errorMessage) setErrorMessage("");
    if (successMessage) setSuccessMessage("");
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!form.title.trim()) {
      setErrorMessage("Title is required.");
      return;
    }

    if (!form.propertyId) {
      setErrorMessage("Please select a property.");
      return;
    }

    if (!form.unitId) {
      setErrorMessage("Please select a unit.");
      return;
    }

    try {
      setSaving(true);
      setErrorMessage("");
      setSuccessMessage("");

      const token = localStorage.getItem("token");

      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        category: form.category,
        priority: form.priority,
        propertyId: form.propertyId,
        unitId: form.unitId,
        tenantId: form.tenantId || null,
        preferredDate: form.preferredDate || null,
        entryPermission: form.entryPermission,
      };

      const res = await fetch(`${API_BASE}/maintenance/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token || ""}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.status === 401) {
        handleUnauthorized();
        return;
      }

      const rawText = await res.text();

      let data: any = null;
      try {
        data = rawText ? JSON.parse(rawText) : null;
      } catch {
        data = { error: rawText || "Invalid server response" };
      }

      if (!res.ok) {
        throw new Error(data?.error || "Failed to update maintenance request");
      }

      setSuccessMessage("Maintenance request updated successfully.");

      setTimeout(() => {
        router.push(`/maintenance/${id}`);
      }, 700);
    } catch (error: any) {
      console.error("Error updating maintenance request:", error);
      setErrorMessage(
        error?.message || "Error updating maintenance request."
      );
    } finally {
      setSaving(false);
    }
  };

  const availableUnits = useMemo(() => {
    return units.filter((unit) => unit.isActive);
  }, [units]);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center px-6 py-20 text-slate-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading maintenance request...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 md:px-6 md:py-10">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href={`/maintenance/${id}`}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 md:p-8">
          <div className="mb-8 flex items-start gap-3">
            <div className="rounded-xl bg-slate-100 p-3 text-slate-700">
              <Wrench className="h-5 w-5" />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Edit Maintenance Request
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Update maintenance details, linked unit, and tenant.
              </p>
            </div>
          </div>

          {errorMessage && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {successMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="title"
                className="block text-sm font-medium text-slate-700"
              >
                Title
              </label>
              <input
                id="title"
                name="title"
                value={form.title}
                onChange={handleChange}
                className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                placeholder="Example: Water leaking in bathroom"
              />
            </div>

            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-slate-700"
              >
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={5}
                className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                placeholder="Describe the issue..."
              />
            </div>

            <div>
              <label
                htmlFor="propertyId"
                className="block text-sm font-medium text-slate-700"
              >
                Property
              </label>
              <select
                id="propertyId"
                name="propertyId"
                value={form.propertyId}
                onChange={handleChange}
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
              >
                <option value="">Select property</option>
                {properties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.code}
                    {property.addressLine1 ? ` - ${property.addressLine1}` : ""}
                    {property.city ? `, ${property.city}` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="unitId"
                className="block text-sm font-medium text-slate-700"
              >
                Unit
              </label>
              <select
                id="unitId"
                name="unitId"
                value={form.unitId}
                onChange={handleChange}
                disabled={!form.propertyId || loadingUnits}
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100"
              >
                <option value="">
                  {!form.propertyId
                    ? "Select property first"
                    : loadingUnits
                    ? "Loading units..."
                    : availableUnits.length === 0
                    ? "No units found"
                    : "Select unit"}
                </option>

                {availableUnits.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.unitCode}
                    {unit.unitName ? ` — ${unit.unitName}` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="tenantId"
                className="block text-sm font-medium text-slate-700"
              >
                Tenant (optional)
              </label>
              <select
                id="tenantId"
                name="tenantId"
                value={form.tenantId}
                onChange={handleChange}
                disabled={!form.unitId || loadingTenants}
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100"
              >
                <option value="">
                  {!form.unitId
                    ? "Select unit first"
                    : loadingTenants
                    ? "Loading tenants..."
                    : tenants.length === 0
                    ? "No active tenant for this unit"
                    : "Select tenant"}
                </option>

                {tenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.firstName} {tenant.lastName}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label
                  htmlFor="category"
                  className="block text-sm font-medium text-slate-700"
                >
                  Category
                </label>
                <select
                  id="category"
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                  className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
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
                <label
                  htmlFor="priority"
                  className="block text-sm font-medium text-slate-700"
                >
                  Priority
                </label>
                <select
                  id="priority"
                  name="priority"
                  value={form.priority}
                  onChange={handleChange}
                  className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>
            </div>

            <div>
              <label
                htmlFor="preferredDate"
                className="block text-sm font-medium text-slate-700"
              >
                Preferred Date
              </label>
              <input
                id="preferredDate"
                type="date"
                name="preferredDate"
                value={form.preferredDate}
                onChange={handleChange}
                className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
              />
            </div>

            <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <input
                id="entryPermission"
                type="checkbox"
                name="entryPermission"
                checked={form.entryPermission}
                onChange={handleChange}
                className="h-4 w-4 rounded border-slate-300"
              />
              <label htmlFor="entryPermission" className="text-sm text-slate-700">
                Permission to enter property
              </label>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
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