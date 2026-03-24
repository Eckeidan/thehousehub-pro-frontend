const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type PropertyQueryParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  city?: string;
  type?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};

export function buildPropertiesUrl(params: PropertyQueryParams = {}) {
  const url = new URL(`${API_BASE}/api/properties`);

  if (params.page) {
    url.searchParams.set("page", String(params.page));
  }

  if (params.pageSize) {
    url.searchParams.set("pageSize", String(params.pageSize));
  }

  if (params.search) {
    url.searchParams.set("search", String(params.search));
  }

  if (params.city) {
    url.searchParams.set("city", String(params.city));
  }

  if (params.type) {
    url.searchParams.set("type", String(params.type));
  }

  if (params.sortBy) {
    url.searchParams.set("sortBy", String(params.sortBy));
  }

  if (params.sortOrder) {
    url.searchParams.set("sortOrder", String(params.sortOrder));
  }

  return url.toString();
}

export async function fetchProperties(
  params: PropertyQueryParams = {},
  token = ""
) {
  try {
    const url = buildPropertiesUrl(params);

    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      cache: "no-store",
    });

    if (!res.ok) {
      let errorMessage = `Request failed with status ${res.status}`;

      try {
        const errorData = await res.json();
        if (errorData?.error) {
          errorMessage = errorData.error;
        }
      } catch {
        // ignore json parse error
      }

      throw new Error(errorMessage);
    }

    return await res.json();
  } catch (error) {
    console.error("fetchProperties error:", error);
    throw error;
  }
}