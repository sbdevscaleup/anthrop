import { and, asc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/infrastructure/db/client";
import {
  propertyAttributeDefinition,
  propertyAttributeOption,
  propertySubcategory,
  propertySubcategoryAttribute,
} from "@/infrastructure/db/schema";

export async function GET(request: NextRequest) {
  try {
    const subcategorySlug = request.nextUrl.searchParams.get("subcategory");
    if (!subcategorySlug) {
      return NextResponse.json(
        { success: false, error: "subcategory query param is required" },
        { status: 400 },
      );
    }

    const subcategory = await db.query.propertySubcategory.findFirst({
      where: and(
        eq(propertySubcategory.slug, subcategorySlug),
        eq(propertySubcategory.isActive, true),
      ),
      columns: { id: true, categoryId: true },
    });

    if (!subcategory) {
      return NextResponse.json({ success: true, attributes: [] });
    }

    const mappings = await db
      .select({
        attributeId: propertySubcategoryAttribute.attributeId,
        isRequired: propertySubcategoryAttribute.isRequired,
        sortOrder: propertySubcategoryAttribute.sortOrder,
      })
      .from(propertySubcategoryAttribute)
      .where(eq(propertySubcategoryAttribute.subcategoryId, subcategory.id))
      .orderBy(asc(propertySubcategoryAttribute.sortOrder));

    if (mappings.length === 0) {
      return NextResponse.json({ success: true, attributes: [] });
    }

    const allDefinitions = await db.select().from(propertyAttributeDefinition);
    const defById = new Map(allDefinitions.map((d) => [d.id, d]));

    const options = await db
      .select({
        id: propertyAttributeOption.id,
        attributeId: propertyAttributeOption.attributeId,
        value: propertyAttributeOption.value,
        label: propertyAttributeOption.label,
      })
      .from(propertyAttributeOption)
      .orderBy(asc(propertyAttributeOption.sortOrder));

    const optionsByAttributeId = new Map<
      string,
      Array<{ id: string; value: string; label: string }>
    >();
    for (const option of options) {
      const next = optionsByAttributeId.get(option.attributeId) ?? [];
      next.push({ id: option.id, value: option.value, label: option.label });
      optionsByAttributeId.set(option.attributeId, next);
    }

    const mappedAttributes = mappings
      .map((mapping) => {
        const def = defById.get(mapping.attributeId);
        if (!def) return null;
        return {
          id: def.id,
          code: def.code,
          label: def.label,
          valueType: def.valueType,
          unit: def.unit,
          isFilterable: def.isFilterable,
          scope: def.scope,
          isRequired: mapping.isRequired || def.isRequired,
          options: optionsByAttributeId.get(def.id) ?? [],
        };
      })
      .filter(Boolean);

    const globalAttributes = allDefinitions
      .filter((definition) => definition.scope === "global")
      .map((definition) => ({
        id: definition.id,
        code: definition.code,
        label: definition.label,
        valueType: definition.valueType,
        unit: definition.unit,
        isFilterable: definition.isFilterable,
        scope: definition.scope,
        isRequired: definition.isRequired,
        options: optionsByAttributeId.get(definition.id) ?? [],
      }));

    const payload = [...globalAttributes, ...mappedAttributes];

    return NextResponse.json({ success: true, attributes: payload });
  } catch (error) {
    console.error("Failed to fetch attributes", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch attributes" },
      { status: 500 },
    );
  }
}
