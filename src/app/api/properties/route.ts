import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/infrastructure/db/client";
import {
  property,
  propertyAttributeDefinition,
  propertyAttributeOption,
  propertyAttributeValue,
  propertyCategory,
  propertyRentalTerms,
  propertySubcategory,
} from "@/infrastructure/db/schema";

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
    const categorySlug = searchParams.get("categorySlug");
    const subcategorySlug = searchParams.get("subcategorySlug");
    const bedroomsMin = Number(searchParams.get("bedroomsMin"));
    const bathroomsMin = Number(searchParams.get("bathroomsMin"));
    const lotSizeMin = Number(searchParams.get("lotSizeMin"));
    const floorLevelMin = Number(searchParams.get("floorLevelMin"));
    const hoaFeeMax = Number(searchParams.get("hoaFeeMax"));
    const furnishedRaw = searchParams.get("furnished");
    const furnished =
      furnishedRaw == null
        ? null
        : furnishedRaw === "true"
          ? true
          : furnishedRaw === "false"
            ? false
            : null;
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
    if (Number.isFinite(bedroomsMin)) {
      conditions.push(sql`${property.bedrooms} >= ${bedroomsMin}`);
    }
    if (Number.isFinite(bathroomsMin)) {
      conditions.push(sql`${property.bathrooms} >= ${bathroomsMin}`);
    }

    if (categorySlug) {
      conditions.push(sql`EXISTS (
        SELECT 1
        FROM property_category c
        WHERE c.id = ${property.categoryId}
          AND c.slug = ${categorySlug}
          AND c.is_active = true
      )`);
    }

    if (subcategorySlug) {
      conditions.push(sql`EXISTS (
        SELECT 1
        FROM property_subcategory s
        WHERE s.id = ${property.subcategoryId}
          AND s.slug = ${subcategorySlug}
          AND s.is_active = true
      )`);
    }

    if (Number.isFinite(lotSizeMin)) {
      conditions.push(sql`EXISTS (
        SELECT 1
        FROM property_attribute_value v
        JOIN property_attribute_definition d ON d.id = v.attribute_id
        WHERE v.property_id = ${property.id}
          AND d.code = 'lot_size_m2'
          AND v.number_value >= ${lotSizeMin}
      )`);
    }

    if (Number.isFinite(floorLevelMin)) {
      conditions.push(sql`EXISTS (
        SELECT 1
        FROM property_attribute_value v
        JOIN property_attribute_definition d ON d.id = v.attribute_id
        WHERE v.property_id = ${property.id}
          AND d.code = 'floor_level'
          AND v.number_value >= ${floorLevelMin}
      )`);
    }

    if (Number.isFinite(hoaFeeMax)) {
      conditions.push(sql`EXISTS (
        SELECT 1
        FROM property_rental_terms rt
        WHERE rt.property_id = ${property.id}
          AND rt.hoa_fee_minor <= ${hoaFeeMax}
      )`);
    }

    if (furnished != null) {
      conditions.push(sql`EXISTS (
        SELECT 1
        FROM property_rental_terms rt
        WHERE rt.property_id = ${property.id}
          AND rt.furnished = ${furnished}
      )`);
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

    const propertyIds = rows.map((row) => row.id);
    if (propertyIds.length === 0) {
      return NextResponse.json({ success: true, rows, limit, offset });
    }

    const categories = await db
      .select({ id: propertyCategory.id, slug: propertyCategory.slug, name: propertyCategory.name })
      .from(propertyCategory)
      .where(
        sql`${propertyCategory.id} IN (${sql.join(
          rows.map((r) => sql`${r.categoryId}`),
          sql`, `,
        )})`,
      );
    const categoryById = new Map(categories.map((c) => [c.id, c]));

    const subcategories = await db
      .select({
        id: propertySubcategory.id,
        slug: propertySubcategory.slug,
        name: propertySubcategory.name,
      })
      .from(propertySubcategory)
      .where(
        sql`${propertySubcategory.id} IN (${sql.join(
          rows.map((r) => sql`${r.subcategoryId}`),
          sql`, `,
        )})`,
      );
    const subcategoryById = new Map(subcategories.map((s) => [s.id, s]));

    const attributeRows = await db
      .select({
        propertyId: propertyAttributeValue.propertyId,
        code: propertyAttributeDefinition.code,
        numberValue: propertyAttributeValue.numberValue,
        textValue: propertyAttributeValue.textValue,
        booleanValue: propertyAttributeValue.booleanValue,
        jsonValue: propertyAttributeValue.jsonValue,
        optionValue: propertyAttributeOption.value,
      })
      .from(propertyAttributeValue)
      .innerJoin(
        propertyAttributeDefinition,
        eq(propertyAttributeDefinition.id, propertyAttributeValue.attributeId),
      )
      .leftJoin(
        propertyAttributeOption,
        eq(propertyAttributeOption.id, propertyAttributeValue.optionId),
      )
      .where(
        sql`${propertyAttributeValue.propertyId} IN (${sql.join(
          propertyIds.map((id) => sql`${id}`),
          sql`, `,
        )})`,
      );

    const attributesByPropertyId = new Map<string, Record<string, unknown>>();
    for (const row of attributeRows) {
      const payload = attributesByPropertyId.get(row.propertyId) ?? {};
      payload[row.code] =
        row.optionValue ??
        row.numberValue ??
        row.booleanValue ??
        row.textValue ??
        row.jsonValue;
      attributesByPropertyId.set(row.propertyId, payload);
    }

    const rentalRows = await db
      .select()
      .from(propertyRentalTerms)
      .where(
        sql`${propertyRentalTerms.propertyId} IN (${sql.join(
          propertyIds.map((id) => sql`${id}`),
          sql`, `,
        )})`,
      );
    const rentalByPropertyId = new Map(rentalRows.map((r) => [r.propertyId, r]));

    const enrichedRows = rows.map((row) => ({
      ...row,
      taxonomy: {
        category: row.categoryId ? categoryById.get(row.categoryId) ?? null : null,
        subcategory: row.subcategoryId
          ? subcategoryById.get(row.subcategoryId) ?? null
          : null,
      },
      attributes: attributesByPropertyId.get(row.id) ?? {},
      rentalTerms: rentalByPropertyId.get(row.id) ?? null,
    }));

    return NextResponse.json({ success: true, rows: enrichedRows, limit, offset });
  } catch (error) {
    console.error("Failed to search properties", error);
    return NextResponse.json(
      { success: false, error: "Failed to search properties" },
      { status: 500 },
    );
  }
}
