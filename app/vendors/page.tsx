"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Search,
  Wrench,
  Loader2,
  X,
  Building2,
  Phone,
  Mail,
  MapPin,
  BadgeDollarSign,
  User,
  Briefcase,
  FileText,
  Eye,
  Pencil,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AdminShell from "@/components/AdminShell";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type StoredUser = {
  id?: string;
  fullName?: string;
  name?: string;
  email?: string;
  role?: string;
};

type Vendor = {
  id: string;
  companyName: string;
  contactPerson?: string | null;
  email?: string | null;
  phone?: string | null;
  specialties?: string | null;
  serviceCategory?: string | null;
  address?: string | null;
  city?: string | null;
  baseFee?: number | string | null;
  hourlyRate?: number | string | null;
  rating?: number | string | null;
  isActive: boolean;
  notes?: string | null;
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

function formatMoney(value?: number | string | null) {
  if (value === null || value === undefined || value === "") return "$0";
  const amount = Number(value);
  if (Number.isNaN(amount)) return `$${value}`;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function VendorsPage() {
  const router = useRouter();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [user, setUser] = useState<StoredUser | null>(null);

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState<VendorForm>(initialForm);

  const [deleteVendor, setDeleteVendor] = useState<Vendor | null>(null);
  const [deleting, setDeleting] = useState(false);

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
    } catch (err) {
      console.error("Vendors auth error:", err);
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      router.replace("/");
    }
  }, [router]);

  useEffect(() => {
    if (checkingAuth) return;
    fetchVendors();
  }, [checkingAuth]);

  async function fetchVendors() {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("token");

      const res = await fetch(`${API_BASE}/api/contractors`, {
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

      const data = await res.json().catch(() => []);

      if (!res.ok) {
        throw new Error(data?.error || "Failed to load vendors");
      }

      setVendors(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error("Error loading vendors:", err);
      setVendors([]);
      setError(err?.message || "Unable to load vendors.");
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    const query = search.toLowerCase().trim();
    if (!query) return vendors;

    return vendors.filter((v) =>
      [
        v.companyName,
        v.contactPerson,
        v.email,
        v.phone,
        v.specialties,
        v.serviceCategory,
        v.address,
        v.city,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [vendors, search]);

  function openCreateModal() {
    setForm(initialForm);
    setFormError("");
    setModalOpen(true);
  }

  function closeCreateModal() {
    if (saving) return;
    setModalOpen(false);
    setFormError("");
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

    if (formError) setFormError("");
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!form.companyName.trim()) {
      setFormError("Company name is required.");
      return;
    }

    try {
      setSaving(true);
      setFormError("");

      const token = localStorage.getItem("token");

      const res = await fetch(`${API_BASE}/api/contractors`, {
        method: "POST",
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
        throw new Error(data?.error || "Failed to create vendor");
      }

      setModalOpen(false);
      setForm(initialForm);
      await fetchVendors();
    } catch (err: any) {
      console.error("Create vendor error:", err);
      setFormError(err?.message || "Unable to create vendor.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteVendor) return;

    try {
      setDeleting(true);

      const token = localStorage.getItem("token");

      const res = await fetch(`${API_BASE}/api/contractors/${deleteVendor.id}`, {
        method: "DELETE",
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
        throw new Error(data?.error || "Failed to delete vendor");
      }

      setDeleteVendor(null);
      await fetchVendors();
    } catch (err: any) {
      alert(err?.message || "Unable to delete vendor.");
    } finally {
      setDeleting(false);
    }
  }

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-8">
        <div className="rounded-3xl border border-slate-200 bg-white px-8 py-6 text-slate-700 shadow-xl">
          Checking session...
        </div>
      </div>
    );
  }

  return (
    <AdminShell
      user={user}
      activeItem="vendors"
      title="Vendors"
      subtitle="Manage contractors and service providers"
      actions={
        <button
          onClick={openCreateModal}
          className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-700"
        >
          <span className="inline-flex items-center gap-2">
            <Plus size={16} />
            Add Vendor
          </span>
        </button>
      }
    >
      <div className="space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              placeholder="Search vendors..."
              className="w-full rounded-xl border border-slate-300 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-slate-500"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-[220px] items-center justify-center rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading vendors...
            </div>
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700 shadow-sm">
            {error}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white py-20 text-center text-slate-500 shadow-sm">
            <Wrench size={40} className="mx-auto mb-4 opacity-40" />
            No vendors yet
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((v) => (
              <div
                key={v.id}
                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">
                      {v.companyName}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {v.serviceCategory || "General Service"}
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      v.isActive
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {v.isActive ? "Active" : "Inactive"}
                  </span>
                </div>

                <div className="mt-4 space-y-2 text-sm text-slate-700">
                  <p>📍 {v.city || "—"}</p>
                  <p>📞 {v.phone || "—"}</p>
                  <p>👤 {v.contactPerson || "—"}</p>
                  <p>💼 {v.specialties || "—"}</p>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-sm text-slate-700">
                  <span>💲 Base: {formatMoney(v.baseFee)}</span>
                  <span>⏱ {formatMoney(v.hourlyRate)}/h</span>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <Link
                    href={`/vendors/${v.id}`}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <Eye className="h-4 w-4" />
                    View
                  </Link>

                  <Link
                    href={`/vendors/edit/${v.id}`}
                    className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
                  >
                    <Pencil className="h-4 w-4" />
                    Edit
                  </Link>

                  <button
                    type="button"
                    onClick={() => setDeleteVendor(v)}
                    className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 px-4 py-6">
          <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5">
              <div>
                <h3 className="text-2xl font-bold text-slate-900">Add Vendor</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Register a contractor or service provider
                </p>
              </div>

              <button
                onClick={closeCreateModal}
                className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="overflow-y-auto p-6">
              {formError && (
                <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {formError}
                </div>
              )}

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
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
                    placeholder="Goma Plumbing Services"
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
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
                    placeholder="Jean Bosco"
                  />
                </div>

                <div>
                  <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                    <Mail className="h-4 w-4" />
                    Email
                  </label>
                  <input
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
                    placeholder="vendor@example.com"
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
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
                    placeholder="+243..."
                  />
                </div>

                <div>
                  <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                    <Briefcase className="h-4 w-4" />
                    Service Category
                  </label>
                  <select
                    name="serviceCategory"
                    value={form.serviceCategory}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
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
                    <Wrench className="h-4 w-4" />
                    Specialties
                  </label>
                  <input
                    name="specialties"
                    value={form.specialties}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
                    placeholder="Pipe repair, bathroom installation..."
                  />
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
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
                    placeholder="Avenue du Lac 15"
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
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
                    placeholder="Goma"
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
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
                    placeholder="25"
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
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
                    placeholder="15"
                  />
                </div>

                <div>
                  <label className="mb-2 text-sm font-medium text-slate-700">
                    Rating
                  </label>
                  <input
                    name="rating"
                    type="number"
                    step="0.1"
                    value={form.rating}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
                    placeholder="4.5"
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

                <div className="md:col-span-2">
                  <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                    <FileText className="h-4 w-4" />
                    Notes
                  </label>
                  <textarea
                    name="notes"
                    rows={4}
                    value={form.notes}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
                    placeholder="Additional notes about this vendor..."
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeCreateModal}
                  className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-medium text-white shadow hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Create Vendor
                    </span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteVendor && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/50 px-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-slate-900">Delete Vendor</h3>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-slate-900">
                {deleteVendor.companyName}
              </span>
              ? This action cannot be undone.
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteVendor(null)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}