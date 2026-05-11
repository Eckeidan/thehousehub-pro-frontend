"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Save, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

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
  addressLine1?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  monthlyRent?: string | number | null;
  occupancyStatus?: string | null;
  isOccupied?: boolean;
  activeTenant?: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
}

export default function AddTenantPage() {
  const router = useRouter();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loadingProperties, setLoadingProperties] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    propertyId: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    leaseStart: "",
    leaseEnd: "",
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
      const role = String(parsedUser?.role || "").toLowerCase();

      if (role === "tenant") {
        router.replace("/tenant");
        return;
      }

      setCheckingAuth(false);
    } catch (error) {
      console.error("Auth error:", error);
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

  async function fetchProperties() {
    try {
      setLoadingProperties(true);
      setError("");

      const token = localStorage.getItem("token");

      const res = await fetch(`${API_URL}/api/properties`, {
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${token || ""}`,
        },
      });

      if (res.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        router.replace("/");
        return;
      }

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "Failed to load properties");
      }

      setProperties(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error loading properties:", err);
      setError(err instanceof Error ? err.message : "Unable to load properties.");
      toast.error(err instanceof Error ? err.message : "Unable to load properties.");
    } finally {
      setLoadingProperties(false);
    }
  }

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      toast.error("First name and last name are required.");
      return;
    }

    if (!formData.propertyId) {
      toast.error("Please select a property.");
      return;
    }

    try {
      setSaving(true);

      const token = localStorage.getItem("token");

      const res = await fetch(`${API_URL}/api/tenants`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token || ""}`,
        },
        body: JSON.stringify({
          propertyId: formData.propertyId,
          unitId: null,
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          email: formData.email.trim() || null,
          phone: formData.phone.trim() || null,
          leaseStart: formData.leaseStart || null,
          leaseEnd: formData.leaseEnd || null,
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
        throw new Error(data?.error || data?.message || "Failed to create tenant");
      }

      toast.success("Tenant created successfully");

      setFormData({
        propertyId: "",
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        leaseStart: "",
        leaseEnd: "",
        emergencyContactName: "",
        emergencyContactPhone: "",
        status: "ACTIVE",
        notes: "",
      });

      await fetchProperties();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create tenant.";
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  const selectedProperty =
    properties.find((property) => property.id === formData.propertyId) || null;

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="rounded-2xl border bg-white px-6 py-4 shadow">
          Checking session...
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <Link
            href="/tenants"
            className="mt-1 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-blue-600"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>

          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-800">
              <UserPlus className="h-7 w-7 text-blue-600" />
              Add Tenant
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Create a tenant and associate them directly with an existing property.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700 shadow-sm">
          <div className="font-semibold">Unable to save tenant</div>
          <div className="mt-1">{error}</div>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <InputField label="First Name" name="firstName" value={formData.firstName} onChange={handleChange} placeholder="Enter first name" />
          <InputField label="Last Name" name="lastName" value={formData.lastName} onChange={handleChange} placeholder="Enter last name" />
          <InputField label="Email" name="email" type="email" value={formData.email} onChange={handleChange} placeholder="Enter email" />
          <InputField label="Phone" name="phone" value={formData.phone} onChange={handleChange} placeholder="Enter phone number" />

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Property
            </label>
            <select
              name="propertyId"
              value={formData.propertyId}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="">
                {loadingProperties ? "Loading properties..." : "Select property"}
              </option>

              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.name || property.code}
                  {property.code ? ` (${property.code})` : ""}
                  {property.isOccupied ? " — Occupied" : " — Available"}
                </option>
              ))}
            </select>

            <p className="mt-2 text-xs text-slate-500">
              The tenant will be linked directly to this property.
            </p>
          </div>

          {selectedProperty && (
            <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-4 text-sm text-blue-900 md:col-span-2">
              <div className="font-semibold">Selected Property Summary</div>
              <div className="mt-2 grid gap-2 md:grid-cols-3">
                <div><span className="text-blue-700">Code:</span> {selectedProperty.code || "—"}</div>
                <div><span className="text-blue-700">Address:</span> {selectedProperty.addressLine1 || "—"}</div>
                <div><span className="text-blue-700">City:</span> {selectedProperty.city || "—"}</div>
                <div><span className="text-blue-700">State:</span> {selectedProperty.state || "—"}</div>
                <div><span className="text-blue-700">Country:</span> {selectedProperty.country || "—"}</div>
                <div><span className="text-blue-700">Rent:</span> {selectedProperty.monthlyRent ?? "—"}</div>
              </div>
            </div>
          )}

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Status
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="ACTIVE">Active</option>
              <option value="PENDING">Pending</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>

          <InputField label="Lease Start Date" name="leaseStart" type="date" value={formData.leaseStart} onChange={handleChange} />
          <InputField label="Lease End Date" name="leaseEnd" type="date" value={formData.leaseEnd} onChange={handleChange} />
          <InputField label="Emergency Contact Name" name="emergencyContactName" value={formData.emergencyContactName} onChange={handleChange} placeholder="Emergency contact name" />
          <InputField label="Emergency Contact Phone" name="emergencyContactPhone" value={formData.emergencyContactPhone} onChange={handleChange} placeholder="Emergency contact phone" />

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={5}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              placeholder="Add tenant notes..."
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Link
            href="/tenants"
            className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "Saving..." : "Save Tenant"}
          </button>
        </div>
      </form>
    </div>
  );
}

function InputField({
  label,
  name,
  value,
  onChange,
  placeholder = "",
  type = "text",
}: {
  label: string;
  name: string;
  value: string;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </div>
  );
}