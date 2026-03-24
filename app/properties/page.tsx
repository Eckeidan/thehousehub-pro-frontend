"use client";

import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
  type MouseEvent,
} from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  Building2,
  Users,
  Wrench,
  Wallet,
  FileText,
  Brain,
  Settings,
  Plus,
  Pencil,
  Trash2,
  X,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  LogOut,
  Home,
  ShieldCheck,
} from "lucide-react";

type Property = {
  id: string;
  code: string;
  name: string | null;
  addressLine1: string;
  city: string | null;
  state: string | null;
  country: string | null;
  propertyType: string;
  monthlyRent?: number | null;
  unitsCount: number;
  isActive: boolean;
  description?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  areaSqm?: number | null;
  floor?: number | null;
  furnishingStatus?: string | null;
  parkingSpaces?: number | null;
  availableFrom?: string | null;
  ownerName?: string | null;
  occupancyStatus?: string | null;
};

type PropertyFormData = {
  name: string;
  address: string;
  city: string;
  propertyType: string;
  monthlyRent: string;
  description: string;
  bedrooms: string;
  bathrooms: string;
  areaSqm: string;
  floor: string;
  furnishingStatus: string;
  parkingSpaces: string;
  availableFrom: string;
  ownerName: string;
  occupancyStatus: string;
};

type SortField =
  | "code"
  | "name"
  | "addressLine1"
  | "city"
  | "propertyType"
  | "monthlyRent"
  | "unitsCount";

type StoredUser = {
  id?: string;
  fullName?: string;
  name?: string;
  email?: string;
  role?: string;
};

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

const PROPERTY_TYPES = [
  { label: "Apartment", value: "APARTMENT" },
  { label: "House", value: "HOUSE" },
  { label: "Duplex", value: "DUPLEX" },
  { label: "Commercial", value: "COMMERCIAL" },
  { label: "Land", value: "LAND" },
  { label: "Other", value: "OTHER" },
];

const FURNISHING_OPTIONS = [
  { label: "Furnished", value: "FURNISHED" },
  { label: "Unfurnished", value: "UNFURNISHED" },
];

const OCCUPANCY_OPTIONS = [
  { label: "Available", value: "AVAILABLE" },
  { label: "Occupied", value: "OCCUPIED" },
  { label: "Maintenance", value: "MAINTENANCE" },
  { label: "Reserved", value: "RESERVED" },
];

const createInitialFormData = (): PropertyFormData => ({
  name: "",
  address: "",
  city: "",
  propertyType: "APARTMENT",
  monthlyRent: "",
  description: "",
  bedrooms: "",
  bathrooms: "",
  areaSqm: "",
  floor: "",
  furnishingStatus: "UNFURNISHED",
  parkingSpaces: "0",
  availableFrom: "",
  ownerName: "",
  occupancyStatus: "AVAILABLE",
});

function getPropertyTypePrefix(propertyType: string) {
  switch (propertyType) {
    case "APARTMENT":
      return "APT";
    case "HOUSE":
      return "HOUSE";
    case "DUPLEX":
      return "DPX";
    case "COMMERCIAL":
      return "COM";
    case "LAND":
      return "LAND";
    default:
      return "PROP";
  }
}

function sanitizeCityForCode(city: string) {
  const cleaned =
    city
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9 ]/g, "")
      .trim()
      .split(/\s+/)[0] || "CITY";

  return cleaned.toUpperCase().slice(0, 8);
}

function generatePropertyCode(
  propertyType: string,
  city: string,
  properties: Property[]
) {
  const prefix = getPropertyTypePrefix(propertyType);
  const cityCode = sanitizeCityForCode(city || "CITY");
  const matchingCount = properties.filter(
    (p) =>
      p.propertyType === propertyType &&
      (p.city || "").trim().toLowerCase() === city.trim().toLowerCase()
  ).length;

  const nextNumber = String(matchingCount + 1).padStart(3, "0");
  return `${prefix}-${cityCode}-${nextNumber}`;
}

export default function PropertiesPage() {
  const router = useRouter();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [user, setUser] = useState<StoredUser | null>(null);

  const [properties, setProperties] = useState<Property[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState<PropertyFormData>(
    createInitialFormData()
  );
  const [editingPropertyId, setEditingPropertyId] = useState<string | null>(
    null
  );
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [cityFilter, setCityFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");

  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

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
      console.error("Properties auth error:", error);
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      router.replace("/");
    }
  }, [router]);

  const normalizedRole = String(user?.role || "").trim().toUpperCase();
  const isSuperAdmin = normalizedRole === "OWNER";
  const canEdit = normalizedRole === "ADMIN";

  const loadProperties = async () => {
    try {
      setLoading(true);
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

      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`);
      }

      const data = await res.json();
      setProperties(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Properties fetch error:", err);
      setError("Impossible de charger les propriétés.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (checkingAuth) return;
    loadProperties();
  }, [checkingAuth]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, cityFilter, typeFilter]);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const openAddModal = () => {
    if (!canEdit) return;
    setEditingPropertyId(null);
    setFormData(createInitialFormData());
    setShowAddModal(true);
  };

  const openEditModal = (property: Property) => {
    if (!canEdit) return;

    setEditingPropertyId(property.id);
    setFormData({
      name: property.name ?? "",
      address: property.addressLine1 ?? "",
      city: property.city ?? "",
      propertyType: property.propertyType ?? "APARTMENT",
      monthlyRent:
        property.monthlyRent !== null && property.monthlyRent !== undefined
          ? String(property.monthlyRent)
          : "",
      description: property.description ?? "",
      bedrooms:
        property.bedrooms !== null && property.bedrooms !== undefined
          ? String(property.bedrooms)
          : "",
      bathrooms:
        property.bathrooms !== null && property.bathrooms !== undefined
          ? String(property.bathrooms)
          : "",
      areaSqm:
        property.areaSqm !== null && property.areaSqm !== undefined
          ? String(property.areaSqm)
          : "",
      floor:
        property.floor !== null && property.floor !== undefined
          ? String(property.floor)
          : "",
      furnishingStatus: property.furnishingStatus ?? "UNFURNISHED",
      parkingSpaces:
        property.parkingSpaces !== null && property.parkingSpaces !== undefined
          ? String(property.parkingSpaces)
          : "0",
      availableFrom: property.availableFrom
        ? String(property.availableFrom).slice(0, 10)
        : "",
      ownerName: property.ownerName ?? "",
      occupancyStatus: property.occupancyStatus ?? "AVAILABLE",
    });
    setShowAddModal(true);
  };

  const closeModal = () => {
    if (submitting) return;
    setShowAddModal(false);
    setEditingPropertyId(null);
    setFormData(createInitialFormData());
  };

  const handleSaveProperty = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!canEdit) return;

    try {
      setSubmitting(true);

      const token = localStorage.getItem("token");
      const isEditing = editingPropertyId !== null;
      const currentProperty = isEditing
        ? properties.find((p) => p.id === editingPropertyId)
        : null;

      const generatedCode = generatePropertyCode(
        formData.propertyType,
        formData.city,
        properties
      );

      const payload = {
        code: isEditing ? currentProperty?.code || generatedCode : generatedCode,
        name: formData.name.trim() || null,
        addressLine1: formData.address.trim(),
        city: formData.city.trim() || null,
        state: null,
        country: null,
        propertyType: formData.propertyType || "APARTMENT",
        unitsCount: 1,
        monthlyRent:
          formData.monthlyRent.trim() !== ""
            ? parseFloat(formData.monthlyRent)
            : null,
        description: formData.description.trim() || null,
        bedrooms:
          formData.bedrooms.trim() !== ""
            ? parseInt(formData.bedrooms, 10)
            : null,
        bathrooms:
          formData.bathrooms.trim() !== ""
            ? parseInt(formData.bathrooms, 10)
            : null,
        areaSqm:
          formData.areaSqm.trim() !== ""
            ? parseFloat(formData.areaSqm)
            : null,
        floor:
          formData.floor.trim() !== ""
            ? parseInt(formData.floor, 10)
            : null,
        furnishingStatus: formData.furnishingStatus || null,
        parkingSpaces:
          formData.parkingSpaces.trim() !== ""
            ? parseInt(formData.parkingSpaces, 10)
            : 0,
        availableFrom: formData.availableFrom || null,
        ownerName: formData.ownerName.trim() || null,
        occupancyStatus: formData.occupancyStatus || "AVAILABLE",
        isActive: true,
      };

      const url = isEditing
        ? `${API_URL}/api/properties/${editingPropertyId}`
        : `${API_URL}/api/properties`;

      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token || ""}`,
        },
        body: JSON.stringify(payload),
      });

      let data: any = null;
      try {
        data = await res.json();
      } catch {
        data = null;
      }

      if (res.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/";
        return;
      }

      if (!res.ok) {
        throw new Error(
          data?.error || `Failed to ${isEditing ? "update" : "create"} property`
        );
      }

      closeModal();
      await loadProperties();
    } catch (err: any) {
      console.error("Save property error:", err);
      alert(err.message || "Failed to save property.");
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId || !canEdit) return;

    try {
      const token = localStorage.getItem("token");

      const res = await fetch(`${API_URL}/api/properties/${deleteId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token || ""}`,
        },
      });

      let data: any = null;
      try {
        data = await res.json();
      } catch {
        data = null;
      }

      if (res.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/";
        return;
      }

      if (!res.ok) {
        throw new Error(data?.error || "Delete failed");
      }

      setDeleteId(null);
      await loadProperties();
    } catch (err: any) {
      console.error("Delete property error:", err);
      alert(err.message || "Failed to delete property.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/";
  };

  const uniqueCities = useMemo(() => {
    const cities = properties
      .map((p) => p.city?.trim())
      .filter((city): city is string => Boolean(city));

    return [
      "All",
      ...Array.from(new Set(cities)).sort((a, b) => a.localeCompare(b)),
    ];
  }, [properties]);

  const uniqueTypes = useMemo(() => {
    const types = properties
      .map((p) => p.propertyType?.trim())
      .filter((type): type is string => Boolean(type));

    return [
      "All",
      ...Array.from(new Set(types)).sort((a, b) => a.localeCompare(b)),
    ];
  }, [properties]);

  const filteredAndSortedProperties = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();

    const filtered = properties.filter((property) => {
      const matchesSearch =
        q === "" ||
        property.code?.toLowerCase().includes(q) ||
        property.name?.toLowerCase().includes(q) ||
        property.addressLine1?.toLowerCase().includes(q) ||
        property.city?.toLowerCase().includes(q) ||
        property.propertyType?.toLowerCase().includes(q);

      const matchesCity = cityFilter === "All" || property.city === cityFilter;
      const matchesType =
        typeFilter === "All" || property.propertyType === typeFilter;

      return matchesSearch && matchesCity && matchesType;
    });

    filtered.sort((a, b) => {
      const direction = sortDirection === "asc" ? 1 : -1;
      const aValue = a[sortField];
      const bValue = b[sortField];

      if (sortField === "monthlyRent" || sortField === "unitsCount") {
        const aNum = Number(aValue ?? 0);
        const bNum = Number(bValue ?? 0);
        return (aNum - bNum) * direction;
      }

      const aStr = String(aValue ?? "").toLowerCase();
      const bStr = String(bValue ?? "").toLowerCase();

      if (aStr < bStr) return -1 * direction;
      if (aStr > bStr) return 1 * direction;
      return 0;
    });

    return filtered;
  }, [properties, searchTerm, cityFilter, typeFilter, sortField, sortDirection]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredAndSortedProperties.length / pageSize)
  );

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedProperties = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAndSortedProperties.slice(start, start + pageSize);
  }, [filteredAndSortedProperties, currentPage]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }

    setSortField(field);
    setSortDirection("asc");
  };

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown size={14} className="ml-1 inline" />;
    }
    if (sortDirection === "asc") {
      return <ArrowUp size={14} className="ml-1 inline" />;
    }
    return <ArrowDown size={14} className="ml-1 inline" />;
  };

  const handleRowClick = (propertyId: string) => {
    router.push(`/properties/${propertyId}`);
  };

  const startItem =
    filteredAndSortedProperties.length === 0
      ? 0
      : (currentPage - 1) * pageSize + 1;

  const endItem = Math.min(
    currentPage * pageSize,
    filteredAndSortedProperties.length
  );

  const initials =
    (user?.fullName || user?.name || "User")
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "US";

  const displayRole =
    normalizedRole === "ADMIN"
      ? "Admin"
      : normalizedRole === "OWNER"
      ? "Super Admin"
      : "User";

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-8">
        <div className="rounded-3xl bg-white px-8 py-6 shadow-xl border border-slate-200 text-slate-700">
          Checking session...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="flex min-h-screen">
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 bg-gradient-to-b from-blue-950 via-blue-900 to-slate-900 text-white shadow-2xl lg:flex lg:flex-col">
          <div className="border-b border-white/10 px-6 py-7">
            <h1 className="text-3xl font-bold tracking-tight">PropertyOS</h1>
            <p className="mt-2 text-sm text-blue-100/70">
              Smart Property Management
            </p>
          </div>

          <nav className="flex-1 overflow-y-auto px-4 py-6">
            <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-widest text-blue-200/50">
              Main Menu
            </p>

            <div className="space-y-2">
              <SidebarItem
                label="Dashboard"
                icon={<LayoutDashboard size={18} />}
                href="/dashboard"
              />
              <SidebarItem
                label="Properties"
                icon={<Building2 size={18} />}
                href="/properties"
                active
              />
              <SidebarItem
                label="Tenants"
                icon={<Users size={18} />}
                href="/tenants"
              />
              <SidebarItem
                label="Units"
                icon={<Home size={18} />}
                href="/units"
              />
              <SidebarItem
                label="Maintenance"
                icon={<Wrench size={18} />}
                href="/maintenance"
              />
              <SidebarItem
                label="Financials"
                icon={<Wallet size={18} />}
                href="/payments"
              />
              <SidebarItem
                label="Documents"
                icon={<FileText size={18} />}
                href="/documents"
              />
              <SidebarItem
                label="AI Insights"
                icon={<Brain size={18} />}
                href="/insights"
              />
              <SidebarItem
                label="Settings"
                icon={<Settings size={18} />}
                href="/settings"
              />
            </div>
          </nav>

          <div className="border-t border-white/10 px-6 py-5">
            <p className="text-xs uppercase tracking-widest text-blue-200/50">
              Current Role
            </p>
            <p className="mt-2 font-semibold">{displayRole}</p>

            <div className="mt-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 px-3 py-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">
                  {user?.fullName || user?.name || "User"}
                </p>
                <p className="truncate text-xs text-blue-100/70">
                  {user?.email || displayRole}
                </p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-200 transition hover:bg-red-500/20 hover:text-white"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </aside>

        <main className="flex-1 lg:ml-72">
          <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
            <div className="flex flex-col gap-5 px-6 py-5 md:flex-row md:items-center md:justify-between md:px-8">
              <div>
                <h2 className="text-3xl font-bold tracking-tight text-slate-900">
                  Properties
                </h2>
                <p className="mt-1 text-slate-500">
                  Manage and review all registered properties
                </p>
              </div>

              <div className="flex items-center gap-3">
                {canEdit && (
                  <button
                    onClick={openAddModal}
                    className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-700"
                  >
                    <Plus size={16} />
                    Add Property
                  </button>
                )}

                <div className="ml-2 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                    {initials}
                  </div>
                  <div className="hidden sm:block">
                    <p className="text-sm font-semibold text-slate-900">
                      {user?.fullName || user?.name || "User"}
                    </p>
                    <p className="text-xs text-slate-500">{displayRole}</p>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <div className="p-6 md:p-8">
            {isSuperAdmin && (
              <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-700">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
                  <div>
                    <p className="font-semibold">Read-only Super Admin mode</p>
                    <p className="mt-1">
                      You can review all properties, but only Admin can add,
                      edit, or delete properties.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-slate-900">
                    Properties List
                  </h3>
                  <p className="text-sm text-slate-500">
                    All properties currently available in the system
                  </p>
                </div>

                <div className="rounded-xl bg-slate-100 px-4 py-2 text-sm text-slate-600">
                  Total: {filteredAndSortedProperties.length}
                </div>
              </div>

              <div className="mb-6 grid grid-cols-1 gap-3 lg:grid-cols-4">
                <div className="relative lg:col-span-2">
                  <Search
                    size={16}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    placeholder="Search property, code, address, city..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 py-3 pl-10 pr-4 outline-none focus:border-blue-500"
                  />
                </div>

                <select
                  value={cityFilter}
                  onChange={(e) => setCityFilter(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                >
                  {uniqueCities.map((city) => (
                    <option key={city} value={city}>
                      {city === "All" ? "All Cities" : city}
                    </option>
                  ))}
                </select>

                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                >
                  {uniqueTypes.map((type) => (
                    <option key={type} value={type}>
                      {type === "All" ? "All Types" : type}
                    </option>
                  ))}
                </select>
              </div>

              {error ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-600">
                  {error}
                </div>
              ) : loading ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
                  Loading properties...
                </div>
              ) : filteredAndSortedProperties.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
                  No properties found.
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="min-w-full border-separate border-spacing-y-3">
                      <thead>
                        <tr className="text-left text-sm text-slate-500">
                          <th className="px-4 py-2">
                            <button
                              type="button"
                              onClick={() => handleSort("code")}
                              className="font-medium hover:text-slate-900"
                            >
                              Code {renderSortIcon("code")}
                            </button>
                          </th>
                          <th className="px-4 py-2">
                            <button
                              type="button"
                              onClick={() => handleSort("name")}
                              className="font-medium hover:text-slate-900"
                            >
                              Property Name {renderSortIcon("name")}
                            </button>
                          </th>
                          <th className="px-4 py-2">
                            <button
                              type="button"
                              onClick={() => handleSort("addressLine1")}
                              className="font-medium hover:text-slate-900"
                            >
                              Address {renderSortIcon("addressLine1")}
                            </button>
                          </th>
                          <th className="px-4 py-2">City</th>
                          <th className="px-4 py-2">
                            <button
                              type="button"
                              onClick={() => handleSort("propertyType")}
                              className="font-medium hover:text-slate-900"
                            >
                              Type {renderSortIcon("propertyType")}
                            </button>
                          </th>
                          <th className="px-4 py-2">
                            <button
                              type="button"
                              onClick={() => handleSort("monthlyRent")}
                              className="font-medium hover:text-slate-900"
                            >
                              Price {renderSortIcon("monthlyRent")}
                            </button>
                          </th>
                          <th className="px-4 py-2">
                            <button
                              type="button"
                              onClick={() => handleSort("unitsCount")}
                              className="font-medium hover:text-slate-900"
                            >
                              Units {renderSortIcon("unitsCount")}
                            </button>
                          </th>
                          <th className="px-4 py-2">Status</th>
                          <th className="px-4 py-2">Actions</th>
                        </tr>
                      </thead>

                      <tbody>
                        {paginatedProperties.map((property) => (
                          <tr
                            key={property.id}
                            onClick={() => handleRowClick(property.id)}
                            className="cursor-pointer rounded-2xl bg-slate-50 shadow-sm transition hover:bg-slate-100"
                          >
                            <td className="rounded-l-2xl px-4 py-4 font-medium text-slate-700">
                              {property.code}
                            </td>

                            <td className="px-4 py-4 font-semibold text-slate-900">
                              {property.name}
                            </td>

                            <td className="px-4 py-4 text-slate-600">
                              {property.addressLine1}
                            </td>

                            <td className="px-4 py-4 text-slate-600">
                              {property.city}
                            </td>

                            <td className="px-4 py-4 text-slate-600">
                              {property.propertyType}
                            </td>

                            <td className="px-4 py-4 text-slate-600">
                              {property.monthlyRent != null
                                ? `$${Number(property.monthlyRent).toLocaleString()}`
                                : "-"}
                            </td>

                            <td className="px-4 py-4 text-slate-600">
                              {property.unitsCount}
                            </td>

                            <td className="px-4 py-4">
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-medium ${
                                  property.isActive
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-slate-200 text-slate-700"
                                }`}
                              >
                                {property.isActive ? "Active" : "Inactive"}
                              </span>
                            </td>

                            <td className="rounded-r-2xl px-4 py-4">
                              <div className="flex items-center gap-2">
                                {canEdit ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={(e: MouseEvent<HTMLButtonElement>) => {
                                        e.stopPropagation();
                                        openEditModal(property);
                                      }}
                                      className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-100"
                                      title="Edit property"
                                    >
                                      <Pencil size={16} />
                                    </button>

                                    <button
                                      type="button"
                                      onClick={(e: MouseEvent<HTMLButtonElement>) => {
                                        e.stopPropagation();
                                        setDeleteId(property.id);
                                      }}
                                      className="rounded-xl border border-red-200 bg-white p-2 text-red-500 hover:bg-red-50"
                                      title="Delete property"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </>
                                ) : (
                                  <span className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-500">
                                    Read only
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-6 flex flex-col gap-4 border-t border-slate-200 pt-4 md:flex-row md:items-center md:justify-between">
                    <p className="text-sm text-slate-500">
                      Showing {startItem} to {endItem} of{" "}
                      {filteredAndSortedProperties.length} properties
                    </p>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setCurrentPage((prev) => Math.max(1, prev - 1))
                        }
                        disabled={currentPage === 1}
                        className="inline-flex items-center gap-1 rounded-xl border border-slate-300 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <ChevronLeft size={16} />
                        Prev
                      </button>

                      <span className="px-2 text-sm text-slate-700">
                        Page {currentPage} / {totalPages}
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          setCurrentPage((prev) =>
                            Math.min(totalPages, prev + 1)
                          )
                        }
                        disabled={currentPage === totalPages}
                        className="inline-flex items-center gap-1 rounded-xl border border-slate-300 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Next
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <footer className="mt-8 border-t border-slate-200 bg-white px-6 py-4 md:px-8">
            <div className="flex flex-col gap-2 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
              <p>© 2026 PropertyOS. All rights reserved.</p>
              <p>Built for smart property management.</p>
            </div>
          </footer>
        </main>
      </div>

      {showAddModal && canEdit && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={closeModal}
          />

          <div className="absolute inset-y-0 right-0 flex w-full justify-end">
            <div className="flex h-full w-full max-w-3xl flex-col border border-white/40 bg-white/90 shadow-2xl backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
                <div>
                  <h3 className="text-2xl font-bold text-slate-900">
                    {editingPropertyId ? "Edit Property" : "Add New Property"}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Fill in the property information below.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-6">
                <form
                  id="property-form"
                  onSubmit={handleSaveProperty}
                  className="grid grid-cols-1 gap-4 md:grid-cols-2"
                >
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Property Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Sunrise Residence"
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                      required
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Address
                    </label>
                    <input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      placeholder="45 Avenue Example"
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      City
                    </label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      placeholder="Goma"
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Property Type
                    </label>
                    <select
                      name="propertyType"
                      value={formData.propertyType}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                      required
                    >
                      {PROPERTY_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                    <span className="font-semibold">Property Code Preview:</span>{" "}
                    {editingPropertyId
                      ? properties.find((p) => p.id === editingPropertyId)?.code ||
                        "Will keep existing code"
                      : generatePropertyCode(
                          formData.propertyType,
                          formData.city || "CITY",
                          properties
                        )}
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Apartment Price / Monthly Rent
                    </label>
                    <input
                      type="number"
                      name="monthlyRent"
                      value={formData.monthlyRent}
                      onChange={handleChange}
                      placeholder="1200"
                      min="0"
                      step="0.01"
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Description
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      rows={3}
                      placeholder="Beautiful furnished apartment..."
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Bedrooms
                    </label>
                    <input
                      type="number"
                      name="bedrooms"
                      value={formData.bedrooms}
                      onChange={handleChange}
                      min="0"
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Bathrooms
                    </label>
                    <input
                      type="number"
                      name="bathrooms"
                      value={formData.bathrooms}
                      onChange={handleChange}
                      min="0"
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Area (sqm)
                    </label>
                    <input
                      type="number"
                      name="areaSqm"
                      value={formData.areaSqm}
                      onChange={handleChange}
                      min="0"
                      step="0.01"
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Floor
                    </label>
                    <input
                      type="number"
                      name="floor"
                      value={formData.floor}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Furnishing
                    </label>
                    <select
                      name="furnishingStatus"
                      value={formData.furnishingStatus}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                    >
                      {FURNISHING_OPTIONS.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Parking Spaces
                    </label>
                    <input
                      type="number"
                      name="parkingSpaces"
                      value={formData.parkingSpaces}
                      onChange={handleChange}
                      min="0"
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Available From
                    </label>
                    <input
                      type="date"
                      name="availableFrom"
                      value={formData.availableFrom}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Owner / Landlord
                    </label>
                    <input
                      type="text"
                      name="ownerName"
                      value={formData.ownerName}
                      onChange={handleChange}
                      placeholder="John Smith"
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Status
                    </label>
                    <select
                      name="occupancyStatus"
                      value={formData.occupancyStatus}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                    >
                      {OCCUPANCY_OPTIONS.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </form>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-white px-6 py-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  disabled={submitting}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  form="property-form"
                  className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={submitting}
                >
                  {submitting
                    ? "Saving..."
                    : editingPropertyId
                    ? "Update Property"
                    : "Save Property"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {deleteId && canEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-slate-900">
              Delete Property
            </h3>

            <p className="mt-2 text-sm text-slate-500">
              Are you sure you want to delete this property? This action cannot
              be undone.
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteId(null)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmDelete}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SidebarItem({
  label,
  icon,
  href,
  active = false,
}: {
  label: string;
  icon: ReactNode;
  href: string;
  active?: boolean;
}) {
  return (
    <Link href={href}>
      <div
        className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium transition ${
          active
            ? "bg-white/15 text-white shadow"
            : "text-blue-100/80 hover:bg-white/10 hover:text-white"
        }`}
      >
        <span>{icon}</span>
        <span>{label}</span>
      </div>
    </Link>
  );
}