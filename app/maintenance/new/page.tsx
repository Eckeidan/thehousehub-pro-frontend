"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Wrench, Loader2 } from "lucide-react";

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

export default function NewMaintenanceRequestPage() {
  const router = useRouter();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [user, setUser] = useState<StoredUser | null>(null);

  const [properties, setProperties] = useState<Property[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);

  const [loadingProperties, setLoadingProperties] = useState(true);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [loadingTenants, setLoadingTenants] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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

  const [errorMessage, setErrorMessage] = useState("");

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
      console.error("Maintenance new auth error:", error);
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      router.replace("/");
    }
  }, [router]);

  useEffect(() => {
    if (!checkingAuth) {
      fetchProperties();
    }
  }, [checkingAuth]);

  useEffect(() => {
    if (checkingAuth) return;

    if (form.propertyId) {
      fetchUnitsByProperty(form.propertyId);
    } else {
      setUnits([]);
      setTenants([]);
      setForm((prev) => ({
        ...prev,
        unitId: "",
        tenantId: "",
      }));
    }
  }, [form.propertyId, checkingAuth]);

  useEffect(() => {
    if (checkingAuth) return;

    if (form.unitId) {
      fetchTenantsByUnit(form.unitId);
    } else {
      setTenants([]);
      setForm((prev) => ({
        ...prev,
        tenantId: "",
      }));
    }
  }, [form.unitId, checkingAuth]);

  const handleUnauthorized = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.replace("/");
  };

  const fetchProperties = async () => {
    try {
      setLoadingProperties(true);
      setErrorMessage("");

      const token = localStorage.getItem("token");

      const res = await fetch(`${API_BASE}/properties`, {
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${token || ""}`,
        },
      });

      if (res.status === 401) {
        handleUnauthorized();
        return;
      }

      if (!res.ok) {
        throw new Error("Failed to load properties");
      }

      const data = await res.json();
      setProperties(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error loading properties:", error);
      setErrorMessage("Unable to load properties.");
    } finally {
      setLoadingProperties(false);
    }
  };

  const fetchUnitsByProperty = async (propertyId: string) => {
    try {
      setLoadingUnits(true);
      setErrorMessage("");

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

      if (!res.ok) {
        throw new Error("Failed to load units");
      }

      const data = await res.json();
      setUnits(Array.isArray(data) ? data : []);
      setForm((prev) => ({
        ...prev,
        unitId: "",
        tenantId: "",
      }));
      setTenants([]);
    } catch (error) {
      console.error("Error loading units:", error);
      setErrorMessage("Unable to load units.");
      setUnits([]);
      setTenants([]);
    } finally {
      setLoadingUnits(false);
    }
  };

  const fetchTenantsByUnit = async (unitId: string) => {
    try {
      setLoadingTenants(true);
      setErrorMessage("");

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

      if (!res.ok) {
        throw new Error("Failed to load tenants");
      }

      const data = await res.json();
      const allTenants = Array.isArray(data) ? data : [];

      const linkedTenants = allTenants.filter(
        (tenant: Tenant) => tenant.unitId === unitId && tenant.isActive !== false
      );

      setTenants(linkedTenants);
      setForm((prev) => ({
        ...prev,
        tenantId: linkedTenants.length === 1 ? linkedTenants[0].id : "",
      }));
    } catch (error) {
      console.error("Error loading tenants:", error);
      setErrorMessage("Unable to load tenants.");
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

    if (errorMessage) {
      setErrorMessage("");
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const trimmedTitle = form.title.trim();

    if (!trimmedTitle) {
      setErrorMessage("Title is required.");
      return;
    }

    if (!form.propertyId.trim()) {
      setErrorMessage("Please select a property.");
      return;
    }

    if (!form.unitId.trim()) {
      setErrorMessage("Please select a unit.");
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage("");

      const token = localStorage.getItem("token");

      const payload = {
        title: trimmedTitle,
        description: form.description.trim() || null,
        category: form.category,
        priority: form.priority,
        propertyId: form.propertyId,
        unitId: form.unitId,
        tenantId: form.tenantId || null,
        preferredDate: form.preferredDate || null,
        entryPermission: form.entryPermission,
      };

      const res = await fetch(`${API_BASE}/maintenance`, {
        method: "POST",
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
        throw new Error(data?.error || `Request failed with status ${res.status}`);
      }

      router.push("/maintenance");
    } catch (error: any) {
      console.error("Error creating maintenance request:", error);
      setErrorMessage(error.message || "Error creating maintenance request.");
    } finally {
      setSubmitting(false);
    }
  };

  const availableUnits = useMemo(() => {
    return units.filter((unit) => unit.isActive);
  }, [units]);

  const selectedUnit = useMemo(() => {
    return units.find((unit) => unit.id === form.unitId) || null;
  }, [units, form.unitId]);

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
    <div className="min-h-screen bg-slate-50 px-4 py-8 md:px-6 md:py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href="/maintenance"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Maintenance
          </Link>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 md:p-8">
          <div className="mb-8 flex items-start gap-3">
            <div className="rounded-xl bg-slate-100 p-3 text-slate-700">
              <Wrench className="h-5 w-5" />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                New Maintenance Request
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Create a maintenance ticket for a specific property and unit.
              </p>
            </div>
          </div>

          {errorMessage && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
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
                required
                placeholder="Example: Water leaking in bathroom"
                className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
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
                placeholder="Describe the issue in detail..."
                className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
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
                required
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
              >
                <option value="">
                  {loadingProperties ? "Loading properties..." : "Select property"}
                </option>
                {properties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.code}
                    {property.addressLine1 ? ` - ${property.addressLine1}` : ""}
                    {property.city ? `, ${property.city}` : ""}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-slate-500">
                Choose the property related to this maintenance issue.
              </p>
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
              <p className="mt-1 text-xs text-slate-500">
                Select the exact unit where the issue is happening.
              </p>
            </div>

            {selectedUnit && (
              <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-4 text-sm text-blue-900">
                <div className="font-semibold">Selected Unit Summary</div>
                <div className="mt-2 grid gap-2 md:grid-cols-3">
                  <div>
                    <span className="text-blue-700">Code:</span>{" "}
                    {selectedUnit.unitCode}
                  </div>
                  <div>
                    <span className="text-blue-700">Floor:</span>{" "}
                    {selectedUnit.floor ?? "—"}
                  </div>
                  <div>
                    <span className="text-blue-700">Beds/Baths:</span>{" "}
                    {selectedUnit.bedrooms ?? "—"} / {selectedUnit.bathrooms ?? "—"}
                  </div>
                </div>
              </div>
            )}

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
              <p className="mt-1 text-xs text-slate-500">
                Link the request to the active tenant if applicable.
              </p>
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
              <label
                htmlFor="entryPermission"
                className="text-sm text-slate-700"
              >
                Permission to enter property
              </label>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting || loadingProperties}
                className="w-full rounded-lg bg-slate-900 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Creating..." : "Create Request"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}