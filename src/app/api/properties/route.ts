import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/drizzle/db";
import { property } from "@/drizzle/schema";

const MAX_LIMIT = 100;

function parseBbox(raw: string | null) {
  if (!raw) return null;
  const parts = raw.split(",").map((v) => Number(v.trim()));
  if (parts.length !== 4 || parts.some((v) => Number.isNaN(v))) return null;
  const [minLng, minLat, maxLng, maxLat] = parts;
  return { minLng, minLat, maxLng, maxLat };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const l1Id = searchParams.get("l1Id");
    const l2Id = searchParams.get("l2Id");
    const l3Id = searchParams.get("l3Id");
    const listingType = searchParams.get("listingType");
    const workflowStatus = searchParams.get("status");
    const bbox = parseBbox(searchParams.get("bbox"));

    const limit = Math.min(
      Number(searchParams.get("limit") ?? "20") || 20,
      MAX_LIMIT,
    );
    const offset = Math.max(Number(searchParams.get("offset") ?? "0") || 0, 0);

    const conditions = [isNull(property.deletedAt)] as Array<
      ReturnType<typeof eq> | ReturnType<typeof isNull> | ReturnType<typeof sql>
    >;

    if (l1Id) conditions.push(eq(property.l1Id, l1Id));
    if (l2Id) conditions.push(eq(property.l2Id, l2Id));
    if (l3Id) conditions.push(eq(property.l3Id, l3Id));
    if (listingType) conditions.push(eq(property.listingType, listingType as never));
    if (workflowStatus) {
      conditions.push(eq(property.workflowStatus, workflowStatus as never));
    }

    if (bbox) {
      conditions.push(sql`
        ${property.locationPoint} && ST_MakeEnvelope(
          ${bbox.minLng},
          ${bbox.minLat},
          ${bbox.maxLng},
          ${bbox.maxLat},
          4326
        )::geography
      `);
    }

    const rows = await db
      .select()
      .from(property)
      .where(and(...conditions))
      .orderBy(desc(property.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({ success: true, rows, limit, offset });
  } catch (error) {
    console.error("Failed to search properties", error);
    return NextResponse.json(
      { success: false, error: "Failed to search properties" },
      { status: 500 },
    );
  }
}
