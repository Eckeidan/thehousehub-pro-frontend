"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, Pencil, Trash2 } from "lucide-react";

type Property = {
  id: string;
  code: string;
  title: string;
  address?: string | null;
  city: string;
  type: string;
  price?: string | number | null;
  createdAt: string;
};

type ApiResponse = {
  data: Property[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  filters: {
    cities: string[];
    types: string[];
  };
};

export default function PropertiesTable({
  onEdit,
  onDelete,
}: {
  onEdit: (property: Property) => void;
  onDelete: (property: Property) => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [items, setItems] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  const [meta, setMeta] = useState({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 1,
  });

  const [filterOptions, setFilterOptions] = useState({
    cities: [] as string[],
    types: [] as string[],
  });

  const page = Number(searchParams.get("page") || "1");
  const pageSize = Number(searchParams.get("pageSize") || "10");
  const search = searchParams.get("search") || "";
  const city = searchParams.get("city") || "";
  const type = searchParams.get("type") || "";
  const sortBy = searchParams.get("sortBy") || "createdAt";
  const sortOrder = searchParams.get("sortOrder") || "desc";

  const [searchInput, setSearchInput] = useState(search);

  const updateQuery = (updates: Record<string, string | number | null>) => {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === "" || value === undefined) {
        params.delete(key);
      } else {
        params.set(key, String(value));
      }
    });

    router.push(`/properties?${params.toString()}`);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      updateQuery({
        search: searchInput || null,
        page: 1,
      });
    }, 400);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const params = new URLSearchParams({
          page: String(page),
          pageSize: String(pageSize),
          search,
          city,
          type,
          sortBy,
          sortOrder,
        });

        const res = await fetch(`/api/properties?${params.toString()}`);
        const json: ApiResponse = await res.json();

        setItems(json.data || []);
        setMeta(json.meta);
        setFilterOptions(json.filters);
      } catch (error) {
        console.error("Failed to load properties:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [page, pageSize, search, city, type, sortBy, sortOrder]);

  const handleSort = (column: string) => {
    const isCurrent = sortBy === column;
    const nextOrder = isCurrent && sortOrder === "asc" ? "desc" : "asc";

    updateQuery({
      sortBy: column,
      sortOrder: nextOrder,
      page: 1,
    });
  };

  const renderSortIcon = (column: string) => {
    if (sortBy !== column) return <ArrowUpDown className="w-4 h-4 ml-1 inline" />;
    if (sortOrder === "asc") return <ArrowUp className="w-4 h-4 ml-1 inline" />;
    return <ArrowDown className="w-4 h-4 ml-1 inline" />;
  };

  const startItem = meta.total === 0 ? 0 : (meta.page - 1) * meta.pageSize + 1;
  const endItem = Math.min(meta.page * meta.pageSize, meta.total);

  const rows = useMemo(() => items, [items]);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by title, code, city, address..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full rounded-xl border border-gray-300 pl-10 pr-4 py-2.5 text-sm outline-none focus:border-black"
            />
          </div>

          <select
            value={city}
            onChange={(e) =>
              updateQuery({
                city: e.target.value || null,
                page: 1,
              })
            }
            className="rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-black"
          >
            <option value="">All Cities</option>
            {filterOptions.cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={type}
            onChange={(e) =>
              updateQuery({
                type: e.target.value || null,
                page: 1,
              })
            }
            className="rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-black"
          >
            <option value="">All Types</option>
            {filterOptions.types.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr>
                <th className="px-4 py-3 font-semibold">
                  <button onClick={() => handleSort("code")} className="flex items-center">
                    Code {renderSortIcon("code")}
                  </button>
                </th>
                <th className="px-4 py-3 font-semibold">
                  <button onClick={() => handleSort("title")} className="flex items-center">
                    Property {renderSortIcon("title")}
                  </button>
                </th>
                <th className="px-4 py-3 font-semibold">
                  <button onClick={() => handleSort("city")} className="flex items-center">
                    City {renderSortIcon("city")}
                  </button>
                </th>
                <th className="px-4 py-3 font-semibold">
                  <button onClick={() => handleSort("type")} className="flex items-center">
                    Type {renderSortIcon("type")}
                  </button>
                </th>
                <th className="px-4 py-3 font-semibold">
                  <button onClick={() => handleSort("price")} className="flex items-center">
                    Price {renderSortIcon("price")}
                  </button>
                </th>
                <th className="px-4 py-3 font-semibold">
                  <button onClick={() => handleSort("createdAt")} className="flex items-center">
                    Created {renderSortIcon("createdAt")}
                  </button>
                </th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-gray-500">
                    Loading properties...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-gray-500">
                    No properties found.
                  </td>
                </tr>
              ) : (
                rows.map((property) => (
                  <tr key={property.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{property.code}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{property.title}</div>
                      <div className="text-xs text-gray-500">{property.address || "-"}</div>
                    </td>
                    <td className="px-4 py-3">{property.city}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                        {property.type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {property.price ? `$${Number(property.price).toLocaleString()}` : "-"}
                    </td>
                    <td className="px-4 py-3">
                      {new Date(property.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => onEdit(property)}
                          className="rounded-lg border border-gray-200 p-2 hover:bg-gray-100"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onDelete(property)}
                          className="rounded-lg border border-red-200 p-2 text-red-600 hover:bg-red-50"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-gray-100 px-4 py-4 md:flex-row md:items-center md:justify-between">
          <div className="text-sm text-gray-600">
            Showing {startItem} to {endItem} of {meta.total} properties
          </div>

          <div className="flex items-center gap-2">
            <select
              value={pageSize}
              onChange={(e) =>
                updateQuery({
                  pageSize: Number(e.target.value),
                  page: 1,
                })
              }
              className="rounded-xl border border-gray-300 px-3 py-2 text-sm"
            >
              <option value={10}>10 / page</option>
              <option value={20}>20 / page</option>
              <option value={50}>50 / page</option>
            </select>

            <button
              onClick={() => updateQuery({ page: page - 1 })}
              disabled={page <= 1}
              className="inline-flex items-center gap-1 rounded-xl border border-gray-300 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
              Prev
            </button>

            <span className="px-2 text-sm text-gray-700">
              Page {meta.page} / {meta.totalPages || 1}
            </span>

            <button
              onClick={() => updateQuery({ page: page + 1 })}
              disabled={page >= meta.totalPages}
              className="inline-flex items-center gap-1 rounded-xl border border-gray-300 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}