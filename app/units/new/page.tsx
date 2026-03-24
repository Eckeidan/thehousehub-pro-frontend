"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Loader2 } from "lucide-react";

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
  name: string;
};

export default function NewUnitPage() {
  const router = useRouter();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [user, setUser] = useState<StoredUser | null>(null);

  const [properties, setProperties] = useState<Property[]>([]);
  const [loadingProperties, setLoadingProperties] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    propertyId: "",
    unitName: "",
    floor: "",
    bedrooms: "",
    bathrooms: "",
    areaSqm: "",
    monthlyRent: "",
    occupancyStatus: "AVAILABLE",
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
      console.error("New unit auth error:", error);
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

  const fetchProperties = async () => {
    try {
      setLoadingProperties(true);
      setError("");

      const token = localStorage.getItem("token");

      const res = await fetch(`${API_BASE}/properties`, {
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

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to load properties");
      }

      const data = await res.json();
      setProperties(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load properties", error);
      setError("Failed to load properties.");
    } finally {
      setLoadingProperties(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.propertyId) {
      setError("Please select a property.");
      return;
    }

    try {
      setLoading(true);

      const token = localStorage.getItem("token");

      const res = await fetch(`${API_BASE}/units`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token || ""}`,
        },
        body: JSON.stringify({
          propertyId: form.propertyId,
          unitName: form.unitName || null,
          floor: form.floor !== "" ? Number(form.floor) : null,
          bedrooms: form.bedrooms !== "" ? Number(form.bedrooms) : null,
          bathrooms: form.bathrooms !== "" ? Number(form.bathrooms) : null,
          areaSqm: form.areaSqm !== "" ? Number(form.areaSqm) : null,
          monthlyRent: form.monthlyRent !== "" ? Number(form.monthlyRent) : null,
          occupancyStatus: form.occupancyStatus,
          notes: form.notes || null,
        }),
      });

      if (res.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        router.replace("/");
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to create unit");
      }

      router.push("/units");
    } catch (error: any) {
      console.error(error);
      setError(error.message || "Failed to create unit");
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-8">
        <div className="rounded-3xl border border-slate-200 bg-white px-8 py-6 shadow-xl text-slate-700">
          Checking session...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/units"
              className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-gray-100"
            >
              <ArrowLeft size={16} />
              Back
            </Link>

            <h1 className="text-2xl font-bold">Create Unit</h1>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        <div className="rounded-xl bg-white p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="mb-2 block text-sm font-medium">Property</label>

              <select
                name="propertyId"
                required
                value={form.propertyId}
                onChange={handleChange}
                className="w-full rounded-lg border px-3 py-2"
              >
                <option value="">
                  {loadingProperties ? "Loading properties..." : "Select Property"}
                </option>

                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Unit Name
              </label>

              <input
                name="unitName"
                value={form.unitName}
                onChange={handleChange}
                placeholder="Apartment 101"
                className="w-full rounded-lg border px-3 py-2"
              />
              <span className="text-xs text-slate-500">Example: Apt-001</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block text-sm font-medium">Floor</label>

                <input
                  name="floor"
                  type="number"
                  value={form.floor}
                  onChange={handleChange}
                  className="w-full rounded-lg border px-3 py-2"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Area (sqm)
                </label>

                <input
                  name="areaSqm"
                  type="number"
                  value={form.areaSqm}
                  onChange={handleChange}
                  className="w-full rounded-lg border px-3 py-2"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Bedrooms
                </label>

                <input
                  name="bedrooms"
                  type="number"
                  value={form.bedrooms}
                  onChange={handleChange}
                  className="w-full rounded-lg border px-3 py-2"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Bathrooms
                </label>

                <input
                  name="bathrooms"
                  type="number"
                  value={form.bathrooms}
                  onChange={handleChange}
                  className="w-full rounded-lg border px-3 py-2"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Monthly Rent
              </label>

              <input
                name="monthlyRent"
                type="number"
                value={form.monthlyRent}
                onChange={handleChange}
                className="w-full rounded-lg border px-3 py-2"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Occupancy Status
              </label>

              <select
                name="occupancyStatus"
                value={form.occupancyStatus}
                onChange={handleChange}
                className="w-full rounded-lg border px-3 py-2"
              >
                <option value="AVAILABLE">Available</option>
                <option value="OCCUPIED">Occupied</option>
                <option value="RESERVED">Reserved</option>
                <option value="MAINTENANCE">Maintenance</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Notes</label>

              <textarea
                name="notes"
                value={form.notes}
                onChange={handleChange}
                className="w-full rounded-lg border px-3 py-2"
                rows={3}
              />
            </div>

            <button
              disabled={loading}
              className="flex items-center gap-2 rounded-lg bg-black px-5 py-3 text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {loading ? "Saving..." : "Create Unit"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}