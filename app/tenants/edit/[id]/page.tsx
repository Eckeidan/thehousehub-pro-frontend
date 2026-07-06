"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  Loader2,
  Mail,
  Phone,
  Save,
  ShieldCheck,
  UserPen,
} from "lucide-react";
import AdminShell from "@/components/AdminShell";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type StoredUser = {
  id?: string;
  fullName?: string;
  name?: string;
  email?: string;
  role?: string;
  organizationId?: string;
};

interface Property {
  id: string;
  name?: string | null;
  code?: string | null;
  addressLine1?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
  monthlyRent?: string | number | null;
  occupancyStatus?: string | null;
  isOccupied?: boolean;
  activeTenant?: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
  } | null;
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
}

function formatMoney(value?: string | number | null) {
  if (value === null || value === undefined || value === "") return "-";
  const amount = Number(value);
  if (Number.isNaN(amount)) return String(value);
  return `$${amount.toLocaleString()}`;
}

function propertyLabel(property?: Property | null) {
  if (!property) return "No property";
  return property.name || property.code || "Unnamed property";
}

function propertyLocation(property?: Property | null) {
  if (!property) return "No address";
  return (
    [
      property.addressLine1,
      property.city,
      property.state,
      property.postalCode,
      property.country,
    ]
      .filter(Boolean)
      .join(", ") || "No address"
  );
}

function isPropertyAssignable(property: Property, currentPropertyId: string) {
  if (property.id === currentPropertyId) return true;
  const status = String(property.occupancyStatus || "").toUpperCase();
  return !property.isOccupied && !property.activeTenant && status !== "OCCUPIED";
}

export default function EditTenantPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params?.id || "");

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [user, setUser] = useState<StoredUser | null>(null);
  const [tenant, setTenant] = useState<TenantData | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [formData, setFormData] = useState({
    propertyId: "",
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
    } catch (authError) {
      console.error("Edit tenant auth error:", authError);
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      router.replace("/");
    }
  }, [router]);

  const loadData = useCallback(async () => {
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

      const nextTenant: TenantData = tenantData;

      setTenant(nextTenant);
      setProperties(Array.isArray(propertiesData) ? propertiesData : []);
      setFormData({
        propertyId: nextTenant.property?.id || "",
        firstName: nextTenant.firstName || "",
        lastName: nextTenant.lastName || "",
        email: nextTenant.email || "",
        phone: nextTenant.phone || "",
        leaseStartDate: nextTenant.leaseStartDate
          ? String(nextTenant.leaseStartDate).slice(0, 10)
          : "",
        leaseEndDate: nextTenant.leaseEndDate
          ? String(nextTenant.leaseEndDate).slice(0, 10)
          : "",
        emergencyContactName: nextTenant.emergencyContactName || "",
        emergencyContactPhone: nextTenant.emergencyContactPhone || "",
        status: nextTenant.status || "ACTIVE",
        notes: nextTenant.notes || "",
      });
    } catch (loadError) {
      console.error(loadError);
      setError(
        loadError instanceof Error ? loadError.message : "Failed to load tenant."
      );
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    if (!checkingAuth && id) {
      loadData();
    }
  }, [checkingAuth, id, loadData]);

  const assignableProperties = useMemo(() => {
    const currentPropertyId = tenant?.property?.id || formData.propertyId;
    return properties.filter((property) =>
      isPropertyAssignable(property, currentPropertyId)
    );
  }, [properties, tenant?.property?.id, formData.propertyId]);

  const selectedProperty = useMemo(() => {
    return (
      assignableProperties.find(
        (property) => property.id === formData.propertyId
      ) ||
      properties.find((property) => property.id === formData.propertyId) ||
      null
    );
  }, [assignableProperties, properties, formData.propertyId]);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;

    setError("");
    setSuccess("");
    setFormData((prev) => ({
      ...prev,
      [name]: value,
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

    if (
      formData.leaseStartDate &&
      formData.leaseEndDate &&
      new Date(formData.leaseEndDate) < new Date(formData.leaseStartDate)
    ) {
      setError("Lease end date cannot be before lease start date.");
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
          unitId: null,
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
    } catch (saveError) {
      console.error(saveError);
      setError(
        saveError instanceof Error ? saveError.message : "Failed to update tenant."
      );
    } finally {
      setSaving(false);
    }
  }

  if (checkingAuth || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-8 text-slate-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        {checkingAuth ? "Checking session..." : "Loading tenant..."}
      </div>
    );
  }

  if (error && !tenant) {
    return (
      <AdminShell
        user={user}
        activeItem="tenants"
        title="Edit Tenant"
        subtitle="Unable to load tenant record."
        actions={
          <Link
            href="/tenants"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <ArrowLeft size={16} />
            Back
          </Link>
        }
      >
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell
      user={user}
      activeItem="tenants"
      title="Edit Tenant"
      subtitle="Update tenant profile, property assignment, and lease details."
      actions={
        <Link
          href={`/tenants/${id}`}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
        >
          <ArrowLeft size={16} />
          Back
        </Link>
      }
    >
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-[0.68fr_0.32fr]">
            <div className="bg-slate-950 p-6 text-white sm:p-8">
              <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-100">
                <UserPen size={14} />
                Tenant Editor
              </p>
              <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
                {formData.firstName || formData.lastName
                  ? `${formData.firstName} ${formData.lastName}`.trim()
                  : "Edit tenant"}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-50/75">
                Unit assignment has been removed from this workflow. The tenant is linked directly to one property.
              </p>
            </div>

            <div className="flex flex-col justify-between gap-6 p-6 sm:p-8">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Property Assignment
                </p>
                <p className="mt-3 text-2xl font-bold text-slate-950">
                  {propertyLabel(selectedProperty)}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {propertyLocation(selectedProperty)}
                </p>
              </div>

              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
                <div className="flex items-start gap-2">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>
                    Tenant isolation is handled by property assignment only. No unit selection is required.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <CheckCircle2 size={16} />
            {success}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
        >
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[0.58fr_0.42fr]">
            <section className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-slate-950">
                  Tenant Information
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Keep the tenant identity and contact details current.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <InputField
                  label="First Name"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                />
                <InputField
                  label="Last Name"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                />
                <InputField
                  label="Email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  icon={<Mail size={16} />}
                />
                <InputField
                  label="Phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  icon={<Phone size={16} />}
                />
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <InputField
                  label="Emergency Contact Name"
                  name="emergencyContactName"
                  value={formData.emergencyContactName}
                  onChange={handleChange}
                />
                <InputField
                  label="Emergency Contact Phone"
                  name="emergencyContactPhone"
                  value={formData.emergencyContactPhone}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Notes
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows={5}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </section>

            <section className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-slate-950">
                  Property & Lease
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Link the tenant to an available property and update lease dates.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Property
                </label>
                <select
                  name="propertyId"
                  value={formData.propertyId}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">Select property</option>
                  {assignableProperties.map((property) => (
                    <option key={property.id} value={property.id}>
                      {propertyLabel(property)}
                      {property.code ? ` (${property.code})` : ""}
                      {property.id === tenant?.property?.id ? " - Current" : ""}
                    </option>
                  ))}
                </select>
              </div>

              {selectedProperty && (
                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
                  <div className="flex items-start gap-3">
                    <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
                    <div>
                      <p className="font-semibold">
                        {propertyLabel(selectedProperty)}
                      </p>
                      <p className="mt-1 text-blue-700">
                        {propertyLocation(selectedProperty)}
                      </p>
                      <p className="mt-2 text-xs text-blue-700">
                        Rent: {formatMoney(selectedProperty.monthlyRent)} / month
                      </p>
                    </div>
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

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <InputField
                  label="Lease Start Date"
                  name="leaseStartDate"
                  type="date"
                  value={formData.leaseStartDate}
                  onChange={handleChange}
                  icon={<CalendarDays size={16} />}
                />
                <InputField
                  label="Lease End Date"
                  name="leaseEndDate"
                  type="date"
                  value={formData.leaseEndDate}
                  onChange={handleChange}
                  icon={<CalendarDays size={16} />}
                />
              </div>
            </section>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5">
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
    </AdminShell>
  );
}

function InputField({
  label,
  name,
  value,
  onChange,
  placeholder = "",
  type = "text",
  icon,
}: {
  label: string;
  name: string;
  value: string;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  placeholder?: string;
  type?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
            {icon}
          </span>
        )}
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 ${
            icon ? "pl-11" : ""
          }`}
        />
      </div>
    </div>
  );
}
