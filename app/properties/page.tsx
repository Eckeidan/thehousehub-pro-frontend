"use client";

import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
  type MouseEvent,
} from "react";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Search,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Check,
  Home,
  MapPin,
  DollarSign,
  Camera,
  ClipboardCheck,
  Upload,
  Building2,
  Eye,
  BedDouble,
  Bath,
  Ruler,
  Layers,
  type LucideIcon,
} from "lucide-react";
import AdminShell from "@/components/AdminShell";

type Property = {
  id: string;
  code: string;
  name: string | null;
  addressLine1: string;
  addressLine2?: string | null;
  city: string | null;
  state: string | null;
  postalCode?: string | null;
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
  organizationId?: string;
};

type PropertyFormData = {
  name: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
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
};

type SortField =
  | "code"
  | "name"
  | "addressLine1"
  | "city"
  | "state"
  | "country"
  | "propertyType"
  | "monthlyRent";

type StoredUser = {
  id?: string;
  fullName?: string;
  name?: string;
  email?: string;
  role?: string;
  organizationId?: string;
};

type CityOption = {
  city: string;
  state: string;
  postalCode: string;
};

type WizardStep = "basics" | "location" | "details" | "photos" | "review";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

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

const PROPERTY_DRAFT_KEY = "thehousehub.propertyOnboardingDraft.v1";

const WIZARD_STEPS: Array<{
  key: WizardStep;
  label: string;
  icon: LucideIcon;
}> = [
  { key: "basics", label: "Basics", icon: Home },
  { key: "location", label: "Location", icon: MapPin },
  { key: "details", label: "Details", icon: DollarSign },
  { key: "photos", label: "Photos", icon: Camera },
  { key: "review", label: "Review", icon: ClipboardCheck },
];

const US_CITY_OPTIONS: CityOption[] = [
  { city: "New York", state: "NY", postalCode: "10001" },
  { city: "Los Angeles", state: "CA", postalCode: "90001" },
  { city: "Chicago", state: "IL", postalCode: "60601" },
  { city: "Houston", state: "TX", postalCode: "77001" },
  { city: "Phoenix", state: "AZ", postalCode: "85001" },
  { city: "Philadelphia", state: "PA", postalCode: "19101" },
  { city: "San Antonio", state: "TX", postalCode: "78201" },
  { city: "San Diego", state: "CA", postalCode: "92101" },
  { city: "Dallas", state: "TX", postalCode: "75201" },
  { city: "San Jose", state: "CA", postalCode: "95101" },
  { city: "Austin", state: "TX", postalCode: "73301" },
  { city: "Jacksonville", state: "FL", postalCode: "32099" },
  { city: "Fort Worth", state: "TX", postalCode: "76101" },
  { city: "Columbus", state: "OH", postalCode: "43004" },
  { city: "Charlotte", state: "NC", postalCode: "28201" },
  { city: "San Francisco", state: "CA", postalCode: "94102" },
  { city: "Indianapolis", state: "IN", postalCode: "46201" },
  { city: "Seattle", state: "WA", postalCode: "98101" },
  { city: "Denver", state: "CO", postalCode: "80201" },
  { city: "Washington", state: "DC", postalCode: "20001" },
  { city: "Boston", state: "MA", postalCode: "02108" },
  { city: "El Paso", state: "TX", postalCode: "79901" },
  { city: "Nashville", state: "TN", postalCode: "37201" },
  { city: "Detroit", state: "MI", postalCode: "48201" },
  { city: "Oklahoma City", state: "OK", postalCode: "73101" },
  { city: "Portland", state: "OR", postalCode: "97201" },
  { city: "Las Vegas", state: "NV", postalCode: "89101" },
  { city: "Memphis", state: "TN", postalCode: "38101" },
  { city: "Louisville", state: "KY", postalCode: "40201" },
  { city: "Baltimore", state: "MD", postalCode: "21201" },
  { city: "Milwaukee", state: "WI", postalCode: "53201" },
  { city: "Albuquerque", state: "NM", postalCode: "87101" },
  { city: "Tucson", state: "AZ", postalCode: "85701" },
  { city: "Fresno", state: "CA", postalCode: "93650" },
  { city: "Sacramento", state: "CA", postalCode: "94203" },
  { city: "Mesa", state: "AZ", postalCode: "85201" },
  { city: "Atlanta", state: "GA", postalCode: "30301" },
  { city: "Kansas City", state: "MO", postalCode: "64101" },
  { city: "Colorado Springs", state: "CO", postalCode: "80901" },
  { city: "Miami", state: "FL", postalCode: "33101" },
  { city: "Raleigh", state: "NC", postalCode: "27601" },
  { city: "Omaha", state: "NE", postalCode: "68101" },
  { city: "Minneapolis", state: "MN", postalCode: "55401" },
  { city: "Tulsa", state: "OK", postalCode: "74101" },
  { city: "Wichita", state: "KS", postalCode: "67201" },
  { city: "New Orleans", state: "LA", postalCode: "70112" },
  { city: "Cleveland", state: "OH", postalCode: "44101" },
  { city: "Tampa", state: "FL", postalCode: "33601" },
  { city: "Orlando", state: "FL", postalCode: "32801" },
  { city: "Pittsburgh", state: "PA", postalCode: "15201" },
  { city: "Cincinnati", state: "OH", postalCode: "45201" },
];

const US_STATE_OPTIONS = Array.from(
  new Set(US_CITY_OPTIONS.map((option) => option.state))
).sort((a, b) => a.localeCompare(b));

const createInitialFormData = (): PropertyFormData => ({
  name: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "",
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
  const baseCode = `${prefix}-${cityCode}`;

  const existingNumbers = properties
    .filter((p) => String(p.code || "").startsWith(baseCode))
    .map((p) => {
      const match = String(p.code || "").match(/-(\d+)$/);
      return match ? Number(match[1]) : 0;
    })
    .filter((n) => Number.isFinite(n));

  const nextNumber =
    existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;

  return `${baseCode}-${String(nextNumber).padStart(3, "0")}`;
}

function formatCurrency(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "Not set";
  }

  return `$${Number(value).toLocaleString()}`;
}

function formatPropertyType(type?: string | null) {
  return String(type || "PROPERTY")
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatPropertyAddress(property: Property) {
  return [property.addressLine1, property.city, property.state, property.postalCode]
    .filter(Boolean)
    .join(", ");
}

function getPropertyInitials(property: Property) {
  const source = property.name || property.code || "Property";
  return source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
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
  const [wizardStep, setWizardStep] = useState<WizardStep>("basics");
  const [selectedPhotoFiles, setSelectedPhotoFiles] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<
    Array<{ name: string; url: string }>
  >([]);
  const [formError, setFormError] = useState("");

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
    if (!showAddModal || editingPropertyId) return;

    localStorage.setItem(
      PROPERTY_DRAFT_KEY,
      JSON.stringify({
        formData,
        wizardStep,
        updatedAt: new Date().toISOString(),
      })
    );
  }, [formData, wizardStep, showAddModal, editingPropertyId]);

  useEffect(() => {
    return () => {
      photoPreviews.forEach((preview) => URL.revokeObjectURL(preview.url));
    };
  }, [photoPreviews]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, cityFilter, typeFilter]);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    if (formError) setFormError("");
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleCitySearchChange = (value: string) => {
    if (formError) setFormError("");
    const selectedCity = US_CITY_OPTIONS.find(
      (option) =>
        `${option.city}, ${option.state}`.toLowerCase() ===
          value.toLowerCase() ||
        option.city.toLowerCase() === value.toLowerCase()
    );

    setFormData((prev) => ({
      ...prev,
      city: selectedCity?.city || value,
      state: selectedCity?.state || prev.state,
      postalCode: selectedCity?.postalCode || prev.postalCode,
      country: "USA",
    }));
  };

  const handlePhotoSelection = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter((file) =>
      ["image/jpeg", "image/png", "image/webp"].includes(file.type)
    );

    const nextFiles = [...selectedPhotoFiles, ...files].slice(0, 10);
    setSelectedPhotoFiles(nextFiles);
    setPhotoPreviews(
      nextFiles.map((file) => ({
        name: file.name,
        url: URL.createObjectURL(file),
      }))
    );
    e.target.value = "";
  };

  const removeSelectedPhoto = (index: number) => {
    const nextFiles = selectedPhotoFiles.filter((_, fileIndex) => fileIndex !== index);
    setSelectedPhotoFiles(nextFiles);
    setPhotoPreviews(
      nextFiles.map((file) => ({
        name: file.name,
        url: URL.createObjectURL(file),
      }))
    );
  };

  const currentStepIndex = WIZARD_STEPS.findIndex(
    (step) => step.key === wizardStep
  );

  const goToStep = (step: WizardStep) => {
    setFormError("");
    setWizardStep(step);
  };

  const validateWizardStep = (step: WizardStep) => {
    if (step === "basics") {
      if (!formData.name.trim()) return "Property name is required.";
      if (!formData.propertyType) return "Property type is required.";
    }

    if (step === "location") {
      if (!formData.addressLine1.trim()) return "Address is required.";
      if (!formData.city.trim()) return "City is required.";
      if (!formData.state.trim()) return "State is required.";
      if (!formData.postalCode.trim()) return "ZIP code is required.";
    }

    return "";
  };

  const continueWizard = () => {
    const validationError = validateWizardStep(wizardStep);
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setFormError("");
    const nextStep = WIZARD_STEPS[currentStepIndex + 1]?.key;
    if (nextStep) setWizardStep(nextStep);
  };

  const backWizard = () => {
    setFormError("");
    const previousStep = WIZARD_STEPS[currentStepIndex - 1]?.key;
    if (previousStep) setWizardStep(previousStep);
  };

  const openAddModal = () => {
    if (!canEdit) return;
    setEditingPropertyId(null);
    const savedDraft = localStorage.getItem(PROPERTY_DRAFT_KEY);

    if (savedDraft) {
      try {
        const parsedDraft = JSON.parse(savedDraft);
        setFormData({
          ...createInitialFormData(),
          ...(parsedDraft?.formData || {}),
        });
        setWizardStep(parsedDraft?.wizardStep || "basics");
      } catch {
        setFormData(createInitialFormData());
        setWizardStep("basics");
      }
    } else {
      setFormData(createInitialFormData());
      setWizardStep("basics");
    }

    setSelectedPhotoFiles([]);
    setPhotoPreviews([]);
    setFormError("");
    setShowAddModal(true);
  };

  const openEditModal = (property: Property) => {
    if (!canEdit) return;

    setEditingPropertyId(property.id);
    setFormData({
      name: property.name ?? "",
      addressLine1: property.addressLine1 ?? "",
      addressLine2: property.addressLine2 ?? "",
      city: property.city ?? "",
      state: property.state ?? "",
      postalCode: property.postalCode ?? "",
      country: property.country ?? "",
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
    });

    setWizardStep("basics");
    setSelectedPhotoFiles([]);
    setPhotoPreviews([]);
    setFormError("");
    setShowAddModal(true);
  };

  const closeModal = (force = false) => {
    if (submitting && !force) return;
    setShowAddModal(false);
    setEditingPropertyId(null);
    setFormData(createInitialFormData());
    setWizardStep("basics");
    setSelectedPhotoFiles([]);
    setPhotoPreviews([]);
    setFormError("");
  };

  const handleSaveProperty = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canEdit) return;

    if (wizardStep !== "review") {
      continueWizard();
      return;
    }

    for (const step of WIZARD_STEPS) {
      const validationError = validateWizardStep(step.key);
      if (validationError) {
        setWizardStep(step.key);
        setFormError(validationError);
        return;
      }
    }

    try {
      setSubmitting(true);
      setFormError("");

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

        addressLine1: formData.addressLine1.trim(),
        addressLine2: formData.addressLine2.trim() || null,

        city: formData.city.trim() || null,
        state: formData.state.trim() || null,
        postalCode: formData.postalCode.trim() || null,
        country: formData.country.trim() || null,

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
          formData.floor.trim() !== "" ? parseInt(formData.floor, 10) : null,

        furnishingStatus: formData.furnishingStatus || null,

        parkingSpaces:
          formData.parkingSpaces.trim() !== ""
            ? parseInt(formData.parkingSpaces, 10)
            : 0,

        availableFrom: formData.availableFrom || null,

        ownerName: formData.ownerName.trim() || null,

        occupancyStatus: "AVAILABLE",

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

      const data = await res.json().catch(() => null);

      if (res.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        router.replace("/");
        return;
      }

      if (!res.ok) {
        throw new Error(
          data?.error || `Failed to ${isEditing ? "update" : "create"} property`
        );
      }

      const savedPropertyId = isEditing ? editingPropertyId : data?.id;

      if (selectedPhotoFiles.length > 0 && savedPropertyId) {
        const imageFormData = new FormData();
        selectedPhotoFiles.forEach((file) => {
          imageFormData.append("images", file);
        });

        const imageRes = await fetch(
          `${API_URL}/api/property-images/property/${savedPropertyId}`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token || ""}`,
            },
            body: imageFormData,
          }
        );

        const imageData = await imageRes.json().catch(() => null);

        if (!imageRes.ok) {
          throw new Error(imageData?.error || "Failed to upload property photos");
        }
      }

      if (!isEditing) {
        localStorage.removeItem(PROPERTY_DRAFT_KEY);
      }

      closeModal(true);
      await loadProperties();
    } catch (err: any) {
      console.error("Save property error:", err);
      setFormError(err.message || "Failed to save property.");
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

      const data = await res.json().catch(() => null);

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
        property.state?.toLowerCase().includes(q) ||
        property.country?.toLowerCase().includes(q) ||
        property.postalCode?.toLowerCase().includes(q) ||
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

      if (sortField === "monthlyRent") {
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
      activeItem="properties"
      title="Properties"
      subtitle="Manage and review all registered properties."
      actions={
        canEdit ? (
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-700"
          >
            <Plus size={16} />
            Add Property
          </button>
        ) : null
      }
    >
      {isSuperAdmin && (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-700">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">Read-only Super Admin mode</p>
              <p className="mt-1">
                You can review all properties, but only Admin can add, edit, or
                delete properties.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
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
              placeholder="Search property, code, address, city, state, country..."
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

        <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase text-slate-500">
              Active properties
            </p>
            <p className="mt-2 text-2xl font-bold text-slate-950">
              {filteredAndSortedProperties.filter((property) => property.isActive).length}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase text-slate-500">
              Monthly portfolio
            </p>
            <p className="mt-2 text-2xl font-bold text-slate-950">
              {formatCurrency(
                filteredAndSortedProperties.reduce(
                  (total, property) => total + Number(property.monthlyRent || 0),
                  0
                )
              )}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase text-slate-500">
              Cities covered
            </p>
            <p className="mt-2 text-2xl font-bold text-slate-950">
              {
                new Set(
                  filteredAndSortedProperties
                    .map((property) => property.city)
                    .filter(Boolean)
                ).size
              }
            </p>
          </div>
        </div>

        <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 lg:flex-row lg:items-center lg:justify-between">
          <p className="px-2 text-sm font-medium text-slate-600">
            Showing {startItem} to {endItem} of {filteredAndSortedProperties.length} properties
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value as SortField)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500"
            >
              <option value="name">Sort by name</option>
              <option value="code">Sort by code</option>
              <option value="city">Sort by city</option>
              <option value="propertyType">Sort by type</option>
              <option value="monthlyRent">Sort by rent</option>
            </select>
            <button
              type="button"
              onClick={() =>
                setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))
              }
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              {sortDirection === "asc" ? "Ascending" : "Descending"}
            </button>
          </div>
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-600">
            {error}
          </div>
        ) : loading ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="h-80 animate-pulse rounded-3xl border border-slate-200 bg-slate-100"
              />
            ))}
          </div>
        ) : filteredAndSortedProperties.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
            <Building2 className="mx-auto mb-3 h-10 w-10 text-slate-400" />
            <p className="text-lg font-semibold text-slate-900">
              No properties found
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Adjust your filters or add your first property.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 2xl:grid-cols-3">
              {paginatedProperties.map((property) => {
                const occupancy = property.occupancyStatus || "AVAILABLE";
                const address = formatPropertyAddress(property);

                return (
                  <article
                    key={property.id}
                    className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-xl"
                  >
                    <button
                      type="button"
                      onClick={() => handleRowClick(property.id)}
                      className="block w-full text-left"
                    >
                      <div className="relative min-h-40 overflow-hidden bg-slate-950 p-5 text-white">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.45),_transparent_34%),linear-gradient(135deg,_#0f172a,_#064e3b)]" />
                        <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full border border-white/20" />
                        <div className="absolute bottom-4 right-5 text-6xl font-black text-white/10">
                          {getPropertyInitials(property)}
                        </div>

                        <div className="relative flex items-start justify-between gap-4">
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
                            <Building2 className="h-6 w-6" />
                          </div>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${
                              property.isActive
                                ? "bg-emerald-400/20 text-emerald-100 ring-1 ring-emerald-300/40"
                                : "bg-white/15 text-white/80 ring-1 ring-white/20"
                            }`}
                          >
                            {property.isActive ? "Active" : "Inactive"}
                          </span>
                        </div>

                        <div className="relative mt-8">
                          <p className="text-xs font-semibold uppercase tracking-wide text-white/60">
                            {property.code || "No code"}
                          </p>
                          <h4 className="mt-2 line-clamp-2 text-2xl font-bold">
                            {property.name || "Untitled property"}
                          </h4>
                        </div>
                      </div>
                    </button>

                    <div className="p-5">
                      <div className="mb-4 flex items-start gap-2 text-sm text-slate-600">
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                        <span className="line-clamp-2">
                          {address || "Address not configured"}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                          <p className="text-xs font-semibold uppercase text-slate-400">
                            Rent
                          </p>
                          <p className="mt-1 font-bold text-slate-950">
                            {formatCurrency(property.monthlyRent)}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                          <p className="text-xs font-semibold uppercase text-slate-400">
                            Type
                          </p>
                          <p className="mt-1 font-bold text-slate-950">
                            {formatPropertyType(property.propertyType)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-4 gap-2 text-xs font-semibold text-slate-600">
                        <div className="flex items-center gap-1 rounded-xl bg-slate-100 px-2 py-2">
                          <BedDouble className="h-3.5 w-3.5 text-slate-400" />
                          {property.bedrooms ?? "-"}
                        </div>
                        <div className="flex items-center gap-1 rounded-xl bg-slate-100 px-2 py-2">
                          <Bath className="h-3.5 w-3.5 text-slate-400" />
                          {property.bathrooms ?? "-"}
                        </div>
                        <div className="flex items-center gap-1 rounded-xl bg-slate-100 px-2 py-2">
                          <Ruler className="h-3.5 w-3.5 text-slate-400" />
                          {property.areaSqm ? `${property.areaSqm}` : "-"}
                        </div>
                        <div className="flex items-center gap-1 rounded-xl bg-slate-100 px-2 py-2">
                          <Layers className="h-3.5 w-3.5 text-slate-400" />
                          {property.floor ?? "-"}
                        </div>
                      </div>

                      <div className="mt-5 flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                          {formatPropertyType(occupancy)}
                        </span>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleRowClick(property.id)}
                            className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700"
                          >
                            <Eye className="h-4 w-4" />
                            View
                          </button>

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
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
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
                    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
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

      {showAddModal && canEdit && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => closeModal()}
          />

          <div className="absolute inset-y-0 right-0 flex w-full justify-end">
            <div className="flex h-full w-full max-w-3xl flex-col border border-white/40 bg-white/90 shadow-2xl backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-5 sm:px-6">
                <div>
                  <h3 className="text-2xl font-bold text-slate-900">
                    {editingPropertyId
                      ? "Edit Property"
                      : "Property Onboarding"}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {editingPropertyId
                      ? "Update the property details and optional photos."
                      : "Follow the steps. Your progress is saved automatically on this device."}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => closeModal()}
                  className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-6 sm:px-6">
                <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-center gap-3">
                    {WIZARD_STEPS.map((step, index) => {
                      const StepIcon = step.icon;
                      const isActive = wizardStep === step.key;
                      const isComplete = index < currentStepIndex;

                      return (
                        <button
                          key={step.key}
                          type="button"
                          onClick={() => goToStep(step.key)}
                          className="flex min-w-[112px] flex-1 items-center gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-slate-50"
                        >
                          <span
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-sm font-semibold ${
                              isComplete
                                ? "border-emerald-500 bg-emerald-500 text-white"
                                : isActive
                                ? "border-blue-600 bg-blue-600 text-white"
                                : "border-slate-200 bg-slate-50 text-slate-500"
                            }`}
                          >
                            {isComplete ? <Check size={17} /> : <StepIcon size={17} />}
                          </span>
                          <span>
                            <span className="block text-xs font-semibold uppercase tracking-wide text-slate-400">
                              Step {index + 1}
                            </span>
                            <span
                              className={`block text-sm font-semibold ${
                                isActive ? "text-slate-950" : "text-slate-600"
                              }`}
                            >
                              {step.label}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {formError && (
                  <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                    {formError}
                  </div>
                )}

                <form
                  id="property-form"
                  onSubmit={handleSaveProperty}
                  className="space-y-5"
                >
                  {wizardStep === "basics" && (
                    <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
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

                      <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700 md:col-span-2">
                        <span className="font-semibold">
                          Property Code Preview:
                        </span>{" "}
                        {editingPropertyId
                          ? properties.find((p) => p.id === editingPropertyId)
                              ?.code || "Will keep existing code"
                          : generatePropertyCode(
                              formData.propertyType,
                              formData.city || "CITY",
                              properties
                            )}
                      </div>
                    </section>
                  )}

                  {wizardStep === "location" && (
                    <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="md:col-span-2">
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          Address
                        </label>
                        <input
                          type="text"
                          name="addressLine1"
                          value={formData.addressLine1}
                          onChange={handleChange}
                          placeholder="45 Avenue Example"
                          className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                          required
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          Address 2
                        </label>
                        <input
                          type="text"
                          name="addressLine2"
                          value={formData.addressLine2}
                          onChange={handleChange}
                          placeholder="Apartment, suite, building, floor..."
                          className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          City
                        </label>
                        <input
                          type="text"
                          list="us-city-options"
                          name="city"
                          value={formData.city}
                          onChange={(e) => handleCitySearchChange(e.target.value)}
                          placeholder="Search city, e.g. Dallas, TX"
                          className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                          required
                        />
                        <datalist id="us-city-options">
                          {US_CITY_OPTIONS.map((option) => (
                            <option
                              key={`${option.city}-${option.state}`}
                              value={`${option.city}, ${option.state}`}
                            >
                              {option.postalCode}
                            </option>
                          ))}
                        </datalist>
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          State
                        </label>
                        <select
                          name="state"
                          value={formData.state}
                          onChange={handleChange}
                          className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                          required
                        >
                          <option value="">Select state</option>
                          {US_STATE_OPTIONS.map((state) => (
                            <option key={state} value={state}>
                              {state}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          ZIP Code
                        </label>
                        <input
                          type="text"
                          name="postalCode"
                          value={formData.postalCode}
                          onChange={handleChange}
                          placeholder="75001"
                          className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                          required
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          Country
                        </label>
                        <input
                          type="text"
                          name="country"
                          value={formData.country}
                          onChange={handleChange}
                          placeholder="USA"
                          className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                        />
                      </div>
                    </section>
                  )}

                  {wizardStep === "details" && (
                    <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          Monthly Rent
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
                          Area sqm
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

                      <div className="md:col-span-2">
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          Description
                        </label>
                        <textarea
                          name="description"
                          value={formData.description}
                          onChange={handleChange}
                          rows={4}
                          placeholder="Beautiful furnished apartment..."
                          className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                        />
                      </div>
                    </section>
                  )}

                  {wizardStep === "photos" && (
                    <section className="space-y-4">
                      <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-blue-300 bg-blue-50/60 px-6 py-10 text-center transition hover:border-blue-500 hover:bg-blue-50">
                        <Upload className="mb-3 text-blue-600" size={28} />
                        <span className="text-sm font-semibold text-slate-900">
                          Upload property photos
                        </span>
                        <span className="mt-1 text-sm text-slate-500">
                          JPG, PNG, or WEBP. Up to 10 photos.
                        </span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          multiple
                          onChange={handlePhotoSelection}
                          className="sr-only"
                        />
                      </label>

                      {photoPreviews.length > 0 ? (
                        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                          {photoPreviews.map((preview, index) => (
                            <div
                              key={`${preview.name}-${preview.url}`}
                              className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-100"
                            >
                              <img
                                src={preview.url}
                                alt={preview.name}
                                className="h-32 w-full object-cover"
                              />
                              <button
                                type="button"
                                onClick={() => removeSelectedPhoto(index)}
                                className="absolute right-2 top-2 rounded-full bg-white/90 p-1 text-slate-700 shadow-sm hover:bg-white"
                              >
                                <X size={16} />
                              </button>
                              <div className="truncate px-3 py-2 text-xs font-medium text-slate-600">
                                {preview.name}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                          Photos are optional, but they help investors and tenants inspect the asset faster.
                        </div>
                      )}
                    </section>
                  )}

                  {wizardStep === "review" && (
                    <section className="space-y-4">
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <div className="rounded-2xl border border-slate-200 bg-white p-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Property
                          </p>
                          <p className="mt-2 text-lg font-bold text-slate-950">
                            {formData.name || "Unnamed property"}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            {PROPERTY_TYPES.find(
                              (type) => type.value === formData.propertyType
                            )?.label || formData.propertyType}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white p-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Location
                          </p>
                          <p className="mt-2 text-sm font-semibold text-slate-900">
                            {formData.addressLine1 || "No address"}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            {[formData.city, formData.state, formData.postalCode]
                              .filter(Boolean)
                              .join(", ") || "No city selected"}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white p-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Financials
                          </p>
                          <p className="mt-2 text-lg font-bold text-slate-950">
                            {formData.monthlyRent
                              ? `$${Number(formData.monthlyRent).toLocaleString()} / mo`
                              : "Rent not set"}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            {formData.bedrooms || 0} bed / {formData.bathrooms || 0} bath
                          </p>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white p-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Photos
                          </p>
                          <p className="mt-2 text-lg font-bold text-slate-950">
                            {photoPreviews.length} selected
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            Photos will upload after the property record is saved.
                          </p>
                        </div>
                      </div>

                      <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                        <span className="font-semibold">
                          Property Code Preview:
                        </span>{" "}
                        {editingPropertyId
                          ? properties.find((p) => p.id === editingPropertyId)
                              ?.code || "Will keep existing code"
                          : generatePropertyCode(
                              formData.propertyType,
                              formData.city || "CITY",
                              properties
                            )}
                      </div>
                    </section>
                  )}
                </form>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-5 py-4 sm:px-6">
                <button
                  type="button"
                  onClick={() => closeModal()}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  disabled={submitting}
                >
                  Cancel
                </button>

                <div className="flex items-center gap-3">
                  {currentStepIndex > 0 && (
                    <button
                      type="button"
                      onClick={backWizard}
                      className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      disabled={submitting}
                    >
                      Back
                    </button>
                  )}

                  {wizardStep !== "review" ? (
                    <button
                      type="button"
                      onClick={continueWizard}
                      className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={submitting}
                    >
                      Continue
                      <ChevronRight size={16} />
                    </button>
                  ) : (
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
                  )}
                </div>
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
    </AdminShell>
  );
}
