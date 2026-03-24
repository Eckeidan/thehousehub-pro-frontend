"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Save, UserPen } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type StoredUser = {
  id?: string;
  fullName?: string;
  name?: string;
  email?: string;
  role?: string;
};

interface Property {
  id: string;
  name?: string | null;
  code?: string | null;
}

interface Unit {
  id: string;
  propertyId: string;
  unitCode: string;
  unitName?: string | null;
  occupancyStatus?: string | null;
  isActive: boolean;
  monthlyRent?: string | number | null;
  floor?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
}

interface TenantData {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  leaseStartDate?: string | null;
  leaseEndDate?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  status?: string | null;
  notes?: string | null;
  property?: Property | null;
  unit?: Unit | null;
}

export default function EditTenantPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [user, setUser] = useState<StoredUser | null>(null);

  const [properties, setProperties] = useState<Property[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [formData, setFormData] = useState({
    propertyId: "",
    unitId: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    leaseStartDate: "",
    leaseEndDate: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    status: "ACTIVE",
    notes: "",
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
      console.error("Edit tenant auth error:", error);
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
    if (!checkingAuth && formData.propertyId) {
      fetchUnitsByProperty(formData.propertyId);
    } else if (!formData.propertyId) {
      setUnits([]);
      setFormData((prev) => ({
        ...prev,
        unitId: "",
      }));
    }
  }, [checkingAuth, formData.propertyId]);

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("token");

      const [tenantRes, propertiesRes] = await Promise.all([
        fetch(`${API_URL}/api/tenants/${id}`, {
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${token || ""}`,
          },
        }),
        fetch(`${API_URL}/api/properties`, {
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${token || ""}`,
          },
        }),
      ]);

      if (tenantRes.status === 401 || propertiesRes.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        router.replace("/");
        return;
      }

      const tenantData = await tenantRes.json().catch(() => null);
      const propertiesData = await propertiesRes.json().catch(() => null);

      if (!tenantRes.ok) {
        throw new Error(tenantData?.error || "Failed to load tenant");
      }

      if (!propertiesRes.ok) {
        throw new Error(propertiesData?.error || "Failed to load properties");
      }

      const tenant: TenantData = tenantData;

      setProperties(Array.isArray(propertiesData) ? propertiesData : []);
      setFormData({
        propertyId: tenant.property?.id || "",
        unitId: tenant.unit?.id || "",
        firstName: tenant.firstName || "",
        lastName: tenant.lastName || "",
        email: tenant.email || "",
        phone: tenant.phone || "",
        leaseStartDate: tenant.leaseStartDate
          ? String(tenant.leaseStartDate).slice(0, 10)
          : "",
        leaseEndDate: tenant.leaseEndDate
          ? String(tenant.leaseEndDate).slice(0, 10)
          : "",
        emergencyContactName: tenant.emergencyContactName || "",
        emergencyContactPhone: tenant.emergencyContactPhone || "",
        status: tenant.status || "ACTIVE",
        notes: tenant.notes || "",
      });
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to load tenant.");
    } finally {
      setLoading(false);
    }
  }

  async function fetchUnitsByProperty(propertyId: string) {
    try {
      setLoadingUnits(true);
      setError("");

      const token = localStorage.getItem("token");

      const res = await fetch(
        `${API_URL}/api/units?propertyId=${encodeURIComponent(propertyId)}`,
        {
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${token || ""}`,
          },
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
        throw new Error(data?.error || "Failed to load units");
      }

      setUnits(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to load units.");
      setUnits([]);
    } finally {
      setLoadingUnits(false);
    }
  }

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "propertyId" ? { unitId: "" } : {}),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      setError("First name and last name are required.");
      return;
    }

    if (!formData.propertyId) {
      setError("Please select a property.");
      return;
    }

    if (!formData.unitId) {
      setError("Please select a unit.");
      return;
    }

    try {
      setSaving(true);

      const token = localStorage.getItem("token");

      const res = await fetch(`${API_URL}/api/tenants/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token || ""}`,
        },
        body: JSON.stringify({
          propertyId: formData.propertyId,
          unitId: formData.unitId,
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          email: formData.email.trim() || null,
          phone: formData.phone.trim() || null,
          leaseStartDate: formData.leaseStartDate || null,
          leaseEndDate: formData.leaseEndDate || null,
          emergencyContactName: formData.emergencyContactName.trim() || null,
          emergencyContactPhone: formData.emergencyContactPhone.trim() || null,
          status: formData.status,
          notes: formData.notes.trim() || null,
        }),
      });

      if (res.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        router.replace("/");
        return;
      }

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "Failed to update tenant");
      }

      setSuccess("Tenant updated successfully.");

      setTimeout(() => {
        router.push(`/tenants/${id}`);
      }, 800);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to update tenant.");
    } finally {
      setSaving(false);
    }
  }

  const availableUnits = useMemo(() => {
    return units.filter(
      (unit) =>
        unit.id === formData.unitId ||
        (unit.isActive &&
          (unit.occupancyStatus === "AVAILABLE" || !unit.occupancyStatus))
    );
  }, [units, formData.unitId]);

  const selectedUnit = useMemo(() => {
    return units.find((unit) => unit.id === formData.unitId) || null;
  }, [units, formData.unitId]);

  if (checkingAuth) {
    return (
      <div className="flex items-center justify-center px-6 py-20 text-slate-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Checking session...
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center px-6 py-20 text-slate-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading tenant...
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 max-w-5xl mx-auto">
      <div className="flex items-start gap-3">
        <Link
          href={`/tenants/${id}`}
          className="mt-1 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-blue-600"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>

        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-800">
            <UserPen className="h-7 w-7 text-blue-600" />
            Edit Tenant
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Update tenant information, unit assignment, and lease details.
          </p>
        </div>
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

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              First Name
            </label>
            <input
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Last Name
            </label>
            <input
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Phone
            </label>
            <input
              type="text"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Property
            </label>
            <select
              name="propertyId"
              value={formData.propertyId}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="">Select property</option>
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.name || property.code}
                  {property.code ? ` (${property.code})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Unit
            </label>
            <select
              name="unitId"
              value={formData.unitId}
              onChange={handleChange}
              disabled={!formData.propertyId || loadingUnits}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
            >
              <option value="">
                {!formData.propertyId
                  ? "Select property first"
                  : loadingUnits
                  ? "Loading units..."
                  : availableUnits.length === 0
                  ? "No available units"
                  : "Select unit"}
              </option>

              {availableUnits.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.unitCode}
                  {unit.unitName ? ` — ${unit.unitName}` : ""}
                  {unit.id === formData.unitId ? " (Current)" : ""}
                </option>
              ))}
            </select>

            <p className="mt-2 text-xs text-slate-500">
              The current unit stays selectable. Other occupied units remain blocked.
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Status
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="ACTIVE">Active</option>
              <option value="PENDING">Pending</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Lease Start Date
            </label>
            <input
              type="date"
              name="leaseStartDate"
              value={formData.leaseStartDate}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Lease End Date
            </label>
            <input
              type="date"
              name="leaseEndDate"
              value={formData.leaseEndDate}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Emergency Contact Name
            </label>
            <input
              type="text"
              name="emergencyContactName"
              value={formData.emergencyContactName}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Emergency Contact Phone
            </label>
            <input
              type="text"
              name="emergencyContactPhone"
              value={formData.emergencyContactPhone}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {selectedUnit && (
            <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-4 text-sm text-blue-900 md:col-span-2">
              <div className="font-semibold">Selected Unit Summary</div>
              <div className="mt-2 grid gap-2 md:grid-cols-4">
                <div>
                  <span className="text-blue-700">Code:</span> {selectedUnit.unitCode}
                </div>
                <div>
                  <span className="text-blue-700">Floor:</span>{" "}
                  {selectedUnit.floor ?? "—"}
                </div>
                <div>
                  <span className="text-blue-700">Beds/Baths:</span>{" "}
                  {selectedUnit.bedrooms ?? "—"} / {selectedUnit.bathrooms ?? "—"}
                </div>
                <div>
                  <span className="text-blue-700">Rent:</span>{" "}
                  {selectedUnit.monthlyRent ?? "—"}
                </div>
              </div>
            </div>
          )}

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={5}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Link
            href={`/tenants/${id}`}
            className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? "Saving..." : "Update Tenant"}
          </button>
        </div>
      </form>
    </div>
  );
}