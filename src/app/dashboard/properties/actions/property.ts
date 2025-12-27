"use server";

import {
  properties,
  propertyStatusEnum,
  propertyTypeEnum,
  listingTypeEnum,
} from "@/drizzle/schema";
import { db } from "@/drizzle/db";
import { z } from "zod";
import { auth } from "@/lib/auth/auth";
import { headers } from "next/headers";

const propertySchema = z.object({
  title: z.string().min(1, "Title is required"),
  status: z.enum(propertyStatusEnum.enumValues),
  description: z.string().optional(),
});

export async function createProperty(
  unsafeData: z.infer<typeof propertySchema>
) {
  const data = propertySchema.safeParse(unsafeData);

  if (!data.success) {
    return {
      success: false,
      errors: data.error.flatten().fieldErrors,
    };
  }

  try {
    // get current user (server-side)
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return { success: false, errors: { root: ["Not authenticated"] } };
    }

    // build insert payload including required fields the table expects
    const insertPayload = {
      title: data.data.title,
      status: data.data.status,
      description: data.data.description ?? null,
      ownerId: session.user.id,
      propertyType: propertyTypeEnum.enumValues[0] ?? "house",
      listingType: listingTypeEnum.enumValues[0] ?? "sale",
    } as const;

    // Use proper Drizzle insert syntax with db instance
    const [newProperty] = await db
      .insert(properties)
      .values(insertPayload)
      .returning();

    return {
      success: true,
      property: newProperty,
    };
  } catch (error) {
    console.error("Failed to create property:", error);
    return {
      success: false,
      errors: { root: ["Failed to create property"] },
    };
  }
}
