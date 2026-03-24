"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Pencil, Save } from "lucide-react";

const API_BASE = "http://localhost:4000/api";

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
  floor?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  areaSqm?: string | number | null;
  monthlyRent?: string | number | null;
  occupancyStatus?: string | null;
  isActive: boolean;
  notes?: string | null;
};

type FormState = {
  propertyId: string;
  unitCode: string;
  unitName: string;
  floor: string;
  bedrooms: string;
  bathrooms: string;
  areaSqm: string;
  monthlyRent: string;
  occupancyStatus: string;
  isActive: boolean;
  notes: string;
};

export default function EditUnitPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [form, setForm] = useState<FormState>({
    propertyId: "",
    unitCode: "",
    unitName: "",
    floor: "",
    bedrooms: "",
    bathrooms: "",
    areaSqm: "",
    monthlyRent: "",
    occupancyStatus: "AVAILABLE",
    isActive: true,
    notes: "",
  });

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const [unitRes, propertiesRes] = await Promise.all([
        fetch(`${API_BASE}/units/${id}`, { cache: "no-store" }),
        fetch(`${API_BASE}/properties`, { cache: "no-store" }),
      ]);

      const unitData = await unitRes.json();
      const propertiesData = await propertiesRes.json();

      if (!unitRes.ok) {
        throw new Error(unitData?.error || "Failed to load unit");
      }

      if (!propertiesRes.ok) {
        throw new Error(propertiesData?.error || "Failed to load properties");
      }

      const unit: Unit = unitData;

      setProperties(Array.isArray(propertiesData) ? propertiesData : []);
      setForm({
        propertyId: unit.propertyId || "",
        unitCode: unit.unitCode || "",
        unitName: unit.unitName || "",
        floor: unit.floor !== null && unit.floor !== undefined ? String(unit.floor) : "",
        bedrooms:
          unit.bedrooms !== null && unit.bedrooms !== undefined
            ? String(unit.bedrooms)
            : "",
        bathrooms:
          unit.bathrooms !== null && unit.bathrooms !== undefined
            ? String(unit.bathrooms)
            : "",
        areaSqm:
          unit.areaSqm !== null && unit.areaSqm !== undefined
            ? String(unit.areaSqm)
            : "",
        monthlyRent:
          unit.monthlyRent !== null && unit.monthlyRent !== undefined
            ? String(unit.monthlyRent)
            : "",
        occupancyStatus: unit.occupancyStatus || "AVAILABLE",
        isActive: Boolean(unit.isActive),
        notes: unit.notes || "",
      });
    } catch (error: any) {
      console.error("Error loading unit:", error);
      setErrorMessage(error?.message || "Unable to load unit.");
    } finally {
      setLoading(false);
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
    }));

    if (errorMessage) setErrorMessage("");
    if (successMessage) setSuccessMessage("");
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!form.propertyId) {
      setErrorMessage("Please select a property.");
      return;
    }

    if (!form.unitCode.trim()) {
      setErrorMessage("Unit code is required.");
      return;
    }

    try {
      setSaving(true);
      setErrorMessage("");
      setSuccessMessage("");

      const payload = {
        propertyId: form.propertyId,
        unitCode: form.unitCode.trim(),
        unitName: form.unitName.trim() || null,
        floor: form.floor !== "" ? Number(form.floor) : null,
        bedrooms: form.bedrooms !== "" ? Number(form.bedrooms) : null,
        bathrooms: form.bathrooms !== "" ? Number(form.bathrooms) : null,
        areaSqm: form.areaSqm !== "" ? Number(form.areaSqm) : null,
        monthlyRent: form.monthlyRent !== "" ? Number(form.monthlyRent) : null,
        occupancyStatus: form.occupancyStatus,
        isActive: form.isActive,
        notes: form.notes.trim() || null,
      };

      const res = await fetch(`${API_BASE}/units/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const rawText = await res.text();

      let data: any = null;
      try {
        data = rawText ? JSON.parse(rawText) : null;
      } catch {
        data = { error: rawText || "Invalid server response" };
      }

      if (!res.ok) {
        throw new Error(data?.error || "Failed to update unit");
      }

      setSuccessMessage("Unit updated successfully.");

      setTimeout(() => {
        router.push(`/units/${id}`);
      }, 700);
    } catch (error: any) {
      console.error("Error updating unit:", error);
      setErrorMessage(error?.message || "Error updating unit.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center px-6 py-20 text-slate-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading unit...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 md:px-6 md:py-10">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href={`/units/${id}`}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 md:p-8">
          <div className="mb-8 flex items-start gap-3">
            <div className="rounded-xl bg-slate-100 p-3 text-slate-700">
              <Pencil className="h-5 w-5" />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-slate-900">Edit Unit</h1>
              <p className="mt-1 text-sm text-slate-500">
                Update unit details, occupancy, and rent information.
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

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label
                  htmlFor="unitCode"
                  className="block text-sm font-medium text-slate-700"
                >
                  Unit Code
                </label>
                <input
                  id="unitCode"
                  name="unitCode"
                  value={form.unitCode}
                  onChange={handleChange}
                  className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label
                  htmlFor="unitName"
                  className="block text-sm font-medium text-slate-700"
                >
                  Unit Name
                </label>
                <input
                  id="unitName"
                  name="unitName"
                  value={form.unitName}
                  onChange={handleChange}
                  placeholder="Example: Apartment 2A"
                  className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                />
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              <div>
                <label
                  htmlFor="floor"
                  className="block text-sm font-medium text-slate-700"
                >
                  Floor
                </label>
                <input
                  id="floor"
                  name="floor"
                  type="number"
                  value={form.floor}
                  onChange={handleChange}
                  className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label
                  htmlFor="bedrooms"
                  className="block text-sm font-medium text-slate-700"
                >
                  Bedrooms
                </label>
                <input
                  id="bedrooms"
                  name="bedrooms"
                  type="number"
                  value={form.bedrooms}
                  onChange={handleChange}
                  className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label
                  htmlFor="bathrooms"
                  className="block text-sm font-medium text-slate-700"
                >
                  Bathrooms
                </label>
                <input
                  id="bathrooms"
                  name="bathrooms"
                  type="number"
                  value={form.bathrooms}
                  onChange={handleChange}
                  className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label
                  htmlFor="areaSqm"
                  className="block text-sm font-medium text-slate-700"
                >
                  Area (sqm)
                </label>
                <input
                  id="areaSqm"
                  name="areaSqm"
                  type="number"
                  value={form.areaSqm}
                  onChange={handleChange}
                  className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                />
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label
                  htmlFor="monthlyRent"
                  className="block text-sm font-medium text-slate-700"
                >
                  Monthly Rent
                </label>
                <input
                  id="monthlyRent"
                  name="monthlyRent"
                  type="number"
                  value={form.monthlyRent}
                  onChange={handleChange}
                  className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label
                  htmlFor="occupancyStatus"
                  className="block text-sm font-medium text-slate-700"
                >
                  Occupancy Status
                </label>
                <select
                  id="occupancyStatus"
                  name="occupancyStatus"
                  value={form.occupancyStatus}
                  onChange={handleChange}
                  className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                >
                  <option value="AVAILABLE">Available</option>
                  <option value="OCCUPIED">Occupied</option>
                  <option value="RESERVED">Reserved</option>
                  <option value="MAINTENANCE">Maintenance</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <input
                id="isActive"
                type="checkbox"
                name="isActive"
                checked={form.isActive}
                onChange={handleChange}
                className="h-4 w-4 rounded border-slate-300"
              />
              <label htmlFor="isActive" className="text-sm text-slate-700">
                Active unit
              </label>
            </div>

            <div>
              <label
                htmlFor="notes"
                className="block text-sm font-medium text-slate-700"
              >
                Notes
              </label>
              <textarea
                id="notes"
                name="notes"
                value={form.notes}
                onChange={handleChange}
                rows={5}
                className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                placeholder="Add notes about this unit..."
              />
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
                    Update Unit
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