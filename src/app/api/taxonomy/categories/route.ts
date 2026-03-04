import { asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/infrastructure/db/client";
import { propertyCategory } from "@/infrastructure/db/schema";

export async function GET() {
  try {
    const categories = await db
      .select({
        id: propertyCategory.id,
        slug: propertyCategory.slug,
        name: propertyCategory.name,
        sortOrder: propertyCategory.sortOrder,
      })
      .from(propertyCategory)
      .where(eq(propertyCategory.isActive, true))
      .orderBy(asc(propertyCategory.sortOrder), asc(propertyCategory.name));

    return NextResponse.json({ success: true, categories });
  } catch (error) {
    console.error("Failed to fetch categories", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch categories" },
      { status: 500 },
    );
  }
}

