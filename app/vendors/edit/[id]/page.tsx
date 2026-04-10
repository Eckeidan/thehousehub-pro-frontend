"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Loader2,
  Save,
  ArrowLeft,
  Building2,
  User,
  Mail,
  Phone,
  Wrench,
  MapPin,
  BadgeDollarSign,
  FileText,
} from "lucide-react";
import AdminShell from "@/components/AdminShell";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type StoredUser = {
  id?: string;
  fullName?: string;
  name?: string;
  email?: string;
  role?: string;
};

type VendorForm = {
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  specialties: string;
  serviceCategory: string;
  address: string;
  city: string;
  baseFee: string;
  hourlyRate: string;
  rating: string;
  isActive: boolean;
  notes: string;
};

const initialForm: VendorForm = {
  companyName: "",
  contactPerson: "",
  email: "",
  phone: "",
  specialties: "",
  serviceCategory: "",
  address: "",
  city: "",
  baseFee: "",
  hourlyRate: "",
  rating: "",
  isActive: true,
  notes: "",
};

export default function EditVendorPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [user, setUser] = useState<StoredUser | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [form, setForm] = useState<VendorForm>(initialForm);

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
    } catch {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      router.replace("/");
    }
  }, [router]);

  useEffect(() => {
    if (checkingAuth || !id) return;
    loadVendor();
  }, [checkingAuth, id]);

  async function loadVendor() {
    try {
      setLoading(true);
      setErrorMessage("");
      setSuccessMessage("");

      const token = localStorage.getItem("token");

      const res = await fetch(`${API_BASE}/api/contractors/${id}`, {
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
        throw new Error(data?.error || "Failed to load vendor");
      }

      setForm({
        companyName: data?.companyName || "",
        contactPerson: data?.contactPerson || "",
        email: data?.email || "",
        phone: data?.phone || "",
        specialties: data?.specialties || "",
        serviceCategory: data?.serviceCategory || "",
        address: data?.address || "",
        city: data?.city || "",
        baseFee:
          data?.baseFee !== null && data?.baseFee !== undefined
            ? String(data.baseFee)
            : "",
        hourlyRate:
          data?.hourlyRate !== null && data?.hourlyRate !== undefined
            ? String(data.hourlyRate)
            : "",
        rating:
          data?.rating !== null && data?.rating !== undefined
            ? String(data.rating)
            : "",
        isActive: Boolean(data?.isActive),
        notes: data?.notes || "",
      });
    } catch (err: any) {
      setErrorMessage(err?.message || "Unable to load vendor.");
    } finally {
      setLoading(false);
    }
  }

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const target = e.target;
    const { name, value } = target;

    setForm((prev) => ({
      ...prev,
      [name]:
        target instanceof HTMLInputElement && target.type === "checkbox"
          ? target.checked
          : value,
    }));

    if (errorMessage) setErrorMessage("");
    if (successMessage) setSuccessMessage("");
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!form.companyName.trim()) {
      setErrorMessage("Company name is required.");
      return;
    }

    try {
      setSaving(true);
      setErrorMessage("");
      setSuccessMessage("");

      const token = localStorage.getItem("token");

      const res = await fetch(`${API_BASE}/api/contractors/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token || ""}`,
        },
        body: JSON.stringify({
          companyName: form.companyName.trim(),
          contactPerson: form.contactPerson.trim() || null,
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
          specialties: form.specialties.trim() || null,
          serviceCategory: form.serviceCategory.trim() || null,
          address: form.address.trim() || null,
          city: form.city.trim() || null,
          baseFee: form.baseFee !== "" ? Number(form.baseFee) : null,
          hourlyRate: form.hourlyRate !== "" ? Number(form.hourlyRate) : null,
          rating: form.rating !== "" ? Number(form.rating) : null,
          isActive: form.isActive,
          notes: form.notes.trim() || null,
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
        throw new Error(data?.error || "Failed to update vendor");
      }

      setSuccessMessage("Vendor updated successfully.");

      setTimeout(() => {
        router.push(`/vendors/${id}`);
      }, 700);
    } catch (err: any) {
      setErrorMessage(err?.message || "Unable to update vendor.");
    } finally {
      setSaving(false);
    }
  }

  if (checkingAuth) {
    return (
      <div className="p-8 text-slate-600">Checking session...</div>
    );
  }

  return (
    <AdminShell
      user={user}
      activeItem="vendors"
      title="Edit Vendor"
      subtitle="Update contractor information"
      actions={
        <Link
          href={`/vendors/${id}`}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
      }
    >
      {loading ? (
        <div className="flex min-h-[220px] items-center justify-center rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading vendor...
          </div>
        </div>
      ) : (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          {errorMessage && (
            <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {successMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Building2 className="h-4 w-4" />
                  Company Name
                </label>
                <input
                  name="companyName"
                  value={form.companyName}
                  onChange={handleChange}
                  placeholder="Company Name"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                  <User className="h-4 w-4" />
                  Contact Person
                </label>
                <input
                  name="contactPerson"
                  value={form.contactPerson}
                  onChange={handleChange}
                  placeholder="Contact Person"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Mail className="h-4 w-4" />
                  Email
                </label>
                <input
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="Email"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Phone className="h-4 w-4" />
                  Phone
                </label>
                <input
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="Phone"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Wrench className="h-4 w-4" />
                  Specialties
                </label>
                <input
                  name="specialties"
                  value={form.specialties}
                  onChange={handleChange}
                  placeholder="Specialties"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Wrench className="h-4 w-4" />
                  Service Category
                </label>
                <select
                  name="serviceCategory"
                  value={form.serviceCategory}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">Select category</option>
                  <option value="PLUMBING">PLUMBING</option>
                  <option value="ELECTRICAL">ELECTRICAL</option>
                  <option value="HVAC">HVAC</option>
                  <option value="PAINTING">PAINTING</option>
                  <option value="PEST_CONTROL">PEST CONTROL</option>
                  <option value="APPLIANCE">APPLIANCE</option>
                  <option value="GENERAL_MAINTENANCE">GENERAL MAINTENANCE</option>
                  <option value="CLEANING">CLEANING</option>
                  <option value="SECURITY">SECURITY</option>
                  <option value="LANDSCAPING">LANDSCAPING</option>
                  <option value="OTHER">OTHER</option>
                </select>
              </div>

              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                  <MapPin className="h-4 w-4" />
                  Address
                </label>
                <input
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  placeholder="Address"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                  <MapPin className="h-4 w-4" />
                  City
                </label>
                <input
                  name="city"
                  value={form.city}
                  onChange={handleChange}
                  placeholder="City"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                  <BadgeDollarSign className="h-4 w-4" />
                  Base Fee
                </label>
                <input
                  name="baseFee"
                  type="number"
                  step="0.01"
                  value={form.baseFee}
                  onChange={handleChange}
                  placeholder="Base Fee"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                  <BadgeDollarSign className="h-4 w-4" />
                  Hourly Rate
                </label>
                <input
                  name="hourlyRate"
                  type="number"
                  step="0.01"
                  value={form.hourlyRate}
                  onChange={handleChange}
                  placeholder="Hourly Rate"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                  <BadgeDollarSign className="h-4 w-4" />
                  Rating
                </label>
                <input
                  name="rating"
                  type="number"
                  step="0.1"
                  value={form.rating}
                  onChange={handleChange}
                  placeholder="Rating"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="flex items-end">
                <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={form.isActive}
                    onChange={handleChange}
                  />
                  Active Vendor
                </label>
              </div>
            </div>

            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                <FileText className="h-4 w-4" />
                Notes
              </label>
              <textarea
                name="notes"
                rows={5}
                value={form.notes}
                onChange={handleChange}
                placeholder="Notes"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-medium text-white shadow hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Update Vendor
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </AdminShell>
  );
}