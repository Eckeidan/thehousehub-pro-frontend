import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const page = Number(searchParams.get("page") || "1");
    const pageSize = Number(searchParams.get("pageSize") || "10");
    const search = searchParams.get("search")?.trim() || "";
    const city = searchParams.get("city")?.trim() || "";
    const type = searchParams.get("type")?.trim() || "";
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";

    const allowedSortFields = [
      "code",
      "title",
      "city",
      "type",
      "price",
      "createdAt",
    ];

    const finalSortBy = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";

    const where: Prisma.PropertyWhereInput = {
      AND: [
        search
          ? {
              OR: [
                { title: { contains: search, mode: "insensitive" } },
                { code: { contains: search, mode: "insensitive" } },
                { address: { contains: search, mode: "insensitive" } },
                { city: { contains: search, mode: "insensitive" } },
              ],
            }
          : {},
        city
          ? {
              city: { equals: city, mode: "insensitive" },
            }
          : {},
        type
          ? {
              type: { equals: type, mode: "insensitive" },
            }
          : {},
      ],
    };

    const [data, total, cities, types] = await Promise.all([
      prisma.property.findMany({
        where,
        orderBy: {
          [finalSortBy]: sortOrder,
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.property.count({ where }),
      prisma.property.findMany({
        distinct: ["city"],
        select: { city: true },
        orderBy: { city: "asc" },
      }),
      prisma.property.findMany({
        distinct: ["type"],
        select: { type: true },
        orderBy: { type: "asc" },
      }),
    ]);

    return NextResponse.json({
      data,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
      filters: {
        cities: cities.map((c) => c.city).filter(Boolean),
        types: types.map((t) => t.type).filter(Boolean),
      },
    });
  } catch (error) {
    console.error("GET /api/properties error:", error);
    return NextResponse.json(
      { error: "Failed to fetch properties" },
      { status: 500 }
    );
  }
}