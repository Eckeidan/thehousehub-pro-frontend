"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  Building2,
  User,
  Mail,
  Phone,
  MapPin,
  BadgeDollarSign,
  FileText,
  Wrench,
  Pencil,
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
  _count?: {
    maintenanceRequests: number;
  };
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

export default function VendorDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [user, setUser] = useState<StoredUser | null>(null);

  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
      setError("");

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

      setVendor(data);
    } catch (err: any) {
      setError(err?.message || "Unable to load vendor.");
    } finally {
      setLoading(false);
    }
  }

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        Checking session...
      </div>
    );
  }

  return (
    <AdminShell
      user={user}
      activeItem="vendors"
      title="Vendor Details"
      subtitle="Review vendor profile and service information"
      actions={
        vendor ? (
          <Link
            href={`/vendors/edit/${vendor.id}`}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-700"
          >
            <span className="inline-flex items-center gap-2">
              <Pencil className="h-4 w-4" />
              Edit Vendor
            </span>
          </Link>
        ) : null
      }
    >
      <div className="space-y-6">
        <Link
          href="/vendors"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>

        {loading ? (
          <div className="flex min-h-[220px] items-center justify-center rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading vendor...
            </div>
          </div>
        ) : error || !vendor ? (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700 shadow-sm">
            {error || "Vendor not found."}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Category" value={vendor.serviceCategory || "—"} />
              <StatCard label="Base Fee" value={formatMoney(vendor.baseFee)} />
              <StatCard label="Hourly Rate" value={`${formatMoney(vendor.hourlyRate)}/h`} />
              <StatCard
                label="Jobs Linked"
                value={String(vendor._count?.maintenanceRequests || 0)}
              />
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-xl font-semibold text-slate-900">
                  Vendor Information
                </h3>

                <div className="mt-5 space-y-4 text-sm text-slate-700">
                  <InfoRow icon={<Building2 className="h-4 w-4" />} label="Company" value={vendor.companyName} />
                  <InfoRow icon={<User className="h-4 w-4" />} label="Contact Person" value={vendor.contactPerson || "—"} />
                  <InfoRow icon={<Mail className="h-4 w-4" />} label="Email" value={vendor.email || "—"} />
                  <InfoRow icon={<Phone className="h-4 w-4" />} label="Phone" value={vendor.phone || "—"} />
                  <InfoRow icon={<MapPin className="h-4 w-4" />} label="Address" value={vendor.address || "—"} />
                  <InfoRow icon={<MapPin className="h-4 w-4" />} label="City" value={vendor.city || "—"} />
                  <InfoRow
                    icon={<BadgeDollarSign className="h-4 w-4" />}
                    label="Rating"
                    value={vendor.rating ? String(vendor.rating) : "—"}
                  />
                  <InfoRow
                    icon={<Wrench className="h-4 w-4" />}
                    label="Status"
                    value={vendor.isActive ? "Active" : "Inactive"}
                  />
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-xl font-semibold text-slate-900">
                  Specialties & Notes
                </h3>

                <div className="mt-5 space-y-5">
                  <div>
                    <p className="text-sm font-medium text-slate-500">Specialties</p>
                    <div className="mt-2 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
                      {vendor.specialties || "No specialties provided."}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-slate-500">Notes</p>
                    <div className="mt-2 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
                      {vendor.notes || "No notes available."}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminShell>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <div className="mt-0.5 text-slate-500">{icon}</div>
      <div>
        <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
        <p className="mt-1 text-sm font-medium text-slate-800">{value}</p>
      </div>
    </div>
  );
}