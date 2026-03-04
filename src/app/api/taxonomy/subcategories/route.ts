import { and, asc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/infrastructure/db/client";
import { propertyCategory, propertySubcategory } from "@/infrastructure/db/schema";

export async function GET(request: NextRequest) {
  try {
    const categorySlug = request.nextUrl.searchParams.get("category");
    if (!categorySlug) {
      return NextResponse.json(
        { success: false, error: "category query param is required" },
        { status: 400 },
      );
    }

    const category = await db.query.propertyCategory.findFirst({
      where: and(
        eq(propertyCategory.slug, categorySlug),
        eq(propertyCategory.isActive, true),
      ),
      columns: { id: true },
    });

    if (!category) {
      return NextResponse.json({ success: true, subcategories: [] });
    }

    const subcategories = await db
      .select({
        id: propertySubcategory.id,
        slug: propertySubcategory.slug,
        name: propertySubcategory.name,
        sortOrder: propertySubcategory.sortOrder,
      })
      .from(propertySubcategory)
      .where(
        and(
          eq(propertySubcategory.categoryId, category.id),
          eq(propertySubcategory.isActive, true),
        ),
      )
      .orderBy(asc(propertySubcategory.sortOrder), asc(propertySubcategory.name));

    return NextResponse.json({ success: true, subcategories });
  } catch (error) {
    console.error("Failed to fetch subcategories", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch subcategories" },
      { status: 500 },
    );
  }
}

