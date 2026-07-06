"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Home,
  Loader2,
  Mail,
  Phone,
  Save,
  ShieldCheck,
  UserPlus,
  Users,
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

type WizardStep = "tenant" | "property" | "lease" | "review";

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

const WIZARD_STEPS: Array<{
  key: WizardStep;
  label: string;
  icon: React.ReactNode;
}> = [
  { key: "tenant", label: "Tenant", icon: <Users size={17} /> },
  { key: "property", label: "Property", icon: <Home size={17} /> },
  { key: "lease", label: "Lease", icon: <ShieldCheck size={17} /> },
  { key: "review", label: "Review", icon: <ClipboardCheck size={17} /> },
];

function formatMoney(value?: string | number | null) {
  if (value === null || value === undefined || value === "") return "-";
  const amount = Number(value);
  if (Number.isNaN(amount)) return String(value);
  return `$${amount.toLocaleString()}`;
}

function propertyLabel(property: Property) {
  return property.name || property.code || "Unnamed property";
}

function propertyLocation(property: Property) {
  return (
    [property.addressLine1, property.city, property.state, property.country]
      .filter(Boolean)
      .join(", ") || "No address"
  );
}

function isPropertyAvailable(property: Property) {
  const status = String(property.occupancyStatus || "").toUpperCase();
  return !property.isOccupied && !property.activeTenant && status !== "OCCUPIED";
}

export default function AddTenantPage() {
  const router = useRouter();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [user, setUser] = useState<StoredUser | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loadingProperties, setLoadingProperties] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [wizardStep, setWizardStep] = useState<WizardStep>("tenant");

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

      setUser(parsedUser);
      setCheckingAuth(false);
    } catch (authError) {
      console.error("Auth error:", authError);
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      router.replace("/");
    }
  }, [router]);

  const fetchProperties = useCallback(async () => {
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
      const message =
        err instanceof Error ? err.message : "Unable to load properties.";
      console.error("Error loading properties:", err);
      setError(message);
      toast.error(message);
    } finally {
      setLoadingProperties(false);
    }
  }, [router]);

  useEffect(() => {
    if (!checkingAuth) {
      fetchProperties();
    }
  }, [checkingAuth, fetchProperties]);

  const availableProperties = useMemo(
    () => properties.filter(isPropertyAvailable),
    [properties]
  );

  const selectedProperty =
    availableProperties.find((property) => property.id === formData.propertyId) ||
    null;

  const currentStepIndex = WIZARD_STEPS.findIndex(
    (step) => step.key === wizardStep
  );

  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) {
    const { name, value } = e.target;
    setError("");
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function selectProperty(propertyId: string) {
    setError("");
    setFormData((prev) => ({
      ...prev,
      propertyId,
    }));
  }

  function validateStep(step: WizardStep) {
    if (step === "tenant") {
      if (!formData.firstName.trim() || !formData.lastName.trim()) {
        return "First name and last name are required.";
      }
    }

    if (step === "property") {
      if (!formData.propertyId) return "Select an available property.";
    }

    if (step === "lease") {
      if (
        formData.leaseStart &&
        formData.leaseEnd &&
        new Date(formData.leaseEnd) < new Date(formData.leaseStart)
      ) {
        return "Lease end date cannot be before lease start date.";
      }
    }

    return "";
  }

  function continueWizard() {
    const validationError = validateStep(wizardStep);
    if (validationError) {
      setError(validationError);
      toast.error(validationError);
      return;
    }

    const nextStep = WIZARD_STEPS[currentStepIndex + 1]?.key;
    if (nextStep) {
      setError("");
      setWizardStep(nextStep);
    }
  }

  function backWizard() {
    const previousStep = WIZARD_STEPS[currentStepIndex - 1]?.key;
    if (previousStep) {
      setError("");
      setWizardStep(previousStep);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    for (const step of WIZARD_STEPS) {
      const validationError = validateStep(step.key);
      if (validationError) {
        setWizardStep(step.key);
        setError(validationError);
        toast.error(validationError);
        return;
      }
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

      toast.success("Tenant created and linked to property");
      router.push("/tenants");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create tenant.";
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

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
    <AdminShell
      user={user}
      activeItem="tenants"
      title="Tenant Onboarding"
      subtitle="Create a tenant profile and link it to an available property."
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
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-[0.72fr_0.28fr]">
            <div className="bg-slate-950 p-6 text-white sm:p-8">
              <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-100">
                <UserPlus size={14} />
                Add Tenant
              </p>
              <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
                Guided tenant setup
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-50/75">
                Capture the tenant identity, assign an available property, define
                lease details, then confirm the record before creation.
              </p>

              <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-4">
                {WIZARD_STEPS.map((step, index) => {
                  const isActive = step.key === wizardStep;
                  const isComplete = index < currentStepIndex;

                  return (
                    <button
                      key={step.key}
                      type="button"
                      onClick={() => setWizardStep(step.key)}
                      className={`rounded-2xl border p-4 text-left transition ${
                        isActive
                          ? "border-white/40 bg-white/15"
                          : "border-white/10 bg-white/5 hover:bg-white/10"
                      }`}
                    >
                      <span
                        className={`flex h-9 w-9 items-center justify-center rounded-full ${
                          isComplete
                            ? "bg-emerald-500 text-white"
                            : isActive
                            ? "bg-blue-500 text-white"
                            : "bg-white/10 text-blue-100"
                        }`}
                      >
                        {isComplete ? <Check size={16} /> : step.icon}
                      </span>
                      <span className="mt-3 block text-xs font-semibold uppercase tracking-wide text-blue-100/60">
                        Step {index + 1}
                      </span>
                      <span className="mt-1 block text-sm font-bold">
                        {step.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col justify-between gap-6 p-6 sm:p-8">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Available properties
                </p>
                <p className="mt-3 text-4xl font-bold text-slate-950">
                  {availableProperties.length}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Only properties without an active tenant are shown for assignment.
                </p>
              </div>

              {selectedProperty ? (
                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-500">
                    Selected asset
                  </p>
                  <p className="mt-2 font-bold text-slate-950">
                    {propertyLabel(selectedProperty)}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {propertyLocation(selectedProperty)}
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                  Select a property in step 2 to link this tenant.
                </div>
              )}
            </div>
          </div>
        </section>

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700 shadow-sm">
            <div className="font-semibold">Unable to continue</div>
            <div className="mt-1">{error}</div>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
        >
          {wizardStep === "tenant" && (
            <section className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <InputField
                label="First Name"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                placeholder="Enter first name"
              />
              <InputField
                label="Last Name"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                placeholder="Enter last name"
              />
              <InputField
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter email"
                icon={<Mail size={16} />}
              />
              <InputField
                label="Phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="Enter phone number"
                icon={<Phone size={16} />}
              />
            </section>
          )}

          {wizardStep === "property" && (
            <section className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-slate-950">
                  Link to available property
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Occupied properties are excluded to protect the one active tenant per property rule.
                </p>
              </div>

              {loadingProperties ? (
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading available properties...
                </div>
              ) : availableProperties.length === 0 ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
                  No available property was found. Add a property or free an existing property before creating an active tenant.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {availableProperties.map((property) => {
                    const isSelected = formData.propertyId === property.id;

                    return (
                      <button
                        key={property.id}
                        type="button"
                        onClick={() => selectProperty(property.id)}
                        className={`rounded-2xl border p-5 text-left transition ${
                          isSelected
                            ? "border-blue-500 bg-blue-50 shadow-sm"
                            : "border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex gap-3">
                            <div
                              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                                isSelected
                                  ? "bg-blue-600 text-white"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              <Building2 size={20} />
                            </div>
                            <div>
                              <p className="font-bold text-slate-950">
                                {propertyLabel(property)}
                              </p>
                              <p className="mt-1 text-sm text-slate-500">
                                {property.code || "No code"}
                              </p>
                            </div>
                          </div>
                          {isSelected && (
                            <span className="rounded-full bg-blue-600 p-1 text-white">
                              <Check size={14} />
                            </span>
                          )}
                        </div>

                        <div className="mt-4 grid grid-cols-1 gap-2 text-sm text-slate-600">
                          <span>{propertyLocation(property)}</span>
                          <span className="font-semibold text-slate-900">
                            {formatMoney(property.monthlyRent)} / month
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {wizardStep === "lease" && (
            <section className="grid grid-cols-1 gap-5 md:grid-cols-2">
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

              <InputField
                label="Lease Start Date"
                name="leaseStart"
                type="date"
                value={formData.leaseStart}
                onChange={handleChange}
              />
              <InputField
                label="Lease End Date"
                name="leaseEnd"
                type="date"
                value={formData.leaseEnd}
                onChange={handleChange}
              />
              <InputField
                label="Emergency Contact Name"
                name="emergencyContactName"
                value={formData.emergencyContactName}
                onChange={handleChange}
                placeholder="Emergency contact name"
              />
              <InputField
                label="Emergency Contact Phone"
                name="emergencyContactPhone"
                value={formData.emergencyContactPhone}
                onChange={handleChange}
                placeholder="Emergency contact phone"
              />

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
            </section>
          )}

          {wizardStep === "review" && (
            <section className="space-y-5">
              <h2 className="text-xl font-bold text-slate-950">
                Review tenant onboarding
              </h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <ReviewCard
                  label="Tenant"
                  value={`${formData.firstName || "-"} ${formData.lastName || ""}`.trim()}
                  detail={[formData.email, formData.phone].filter(Boolean).join(" / ") || "No contact details"}
                />
                <ReviewCard
                  label="Property"
                  value={selectedProperty ? propertyLabel(selectedProperty) : "-"}
                  detail={selectedProperty ? propertyLocation(selectedProperty) : "No property selected"}
                />
                <ReviewCard
                  label="Lease"
                  value={formData.status}
                  detail={
                    [formData.leaseStart || "No start", formData.leaseEnd || "No end"].join(" / ")
                  }
                />
                <ReviewCard
                  label="Emergency Contact"
                  value={formData.emergencyContactName || "-"}
                  detail={formData.emergencyContactPhone || "No phone"}
                />
              </div>
            </section>
          )}

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5">
            <Link
              href="/tenants"
              className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </Link>

            <div className="flex items-center gap-3">
              {currentStepIndex > 0 && (
                <button
                  type="button"
                  onClick={backWizard}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <ChevronLeft size={16} />
                  Back
                </button>
              )}

              {wizardStep !== "review" ? (
                <button
                  type="button"
                  onClick={continueWizard}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Continue
                  <ChevronRight size={16} />
                </button>
              ) : (
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
                  {saving ? "Saving..." : "Create Tenant"}
                </button>
              )}
            </div>
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

function ReviewCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-lg font-bold text-slate-950">{value || "-"}</p>
      <p className="mt-1 text-sm text-slate-500">{detail}</p>
    </div>
  );
}
