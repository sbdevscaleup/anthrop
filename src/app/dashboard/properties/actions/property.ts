"use server";

import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { db } from "@/drizzle/db";
import {
  adminL1,
  adminL2,
  adminL3,
  listingTypeEnum,
  property,
  propertyLocationSourceEnum,
  propertyTypeEnum,
  propertyWorkflowStatusEnum,
} from "@/drizzle/schema";
import { resolveAdminUnitsByPoint } from "@/lib/geo/resolve-admin-units";

const locationSourceValues = propertyLocationSourceEnum.enumValues;
const propertyTypeValues = propertyTypeEnum.enumValues;
const listingTypeValues = listingTypeEnum.enumValues;
const workflowValues = propertyWorkflowStatusEnum.enumValues;

const propertySchema = z
  .object({
    title: z.string().min(1, "Title is required"),
    description: z.string().optional(),
    propertyType: z.enum(propertyTypeValues).default(propertyTypeValues[0]),
    listingType: z.enum(listingTypeValues).default(listingTypeValues[0]),
    workflowStatus: z.enum(workflowValues).default("draft"),
    locationSource: z.enum(locationSourceValues).default("manual"),
    lat: z.number().min(-90).max(90).optional(),
    lng: z.number().min(-180).max(180).optional(),
    l1Id: z.string().uuid().optional(),
    l2Id: z.string().uuid().optional(),
    l3Id: z.string().uuid().optional(),
    priceMinor: z.number().int().nonnegative().optional(),
    currencyCode: z.string().min(3).max(3).default("MNT"),
  })
  .superRefine((value, ctx) => {
    if (value.locationSource === "pin") {
      if (value.lat == null || value.lng == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Pin location requires both lat and lng",
          path: ["lat"],
        });
      }
      return;
    }

    if (!value.l2Id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least district/soum (l2Id) is required for manual mode",
        path: ["l2Id"],
      });
    }
  });

type PropertyInput = z.infer<typeof propertySchema>;

async function getCurrentUserId() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user?.id ?? null;
}

async function validateManualAdminSelection(data: PropertyInput) {
  if (!data.l2Id) return { ok: false, message: "Missing l2Id" } as const;

  const l2 = await db.query.adminL2.findFirst({
    where: and(eq(adminL2.id, data.l2Id), isNull(adminL2.deletedAt)),
  });
  if (!l2) return { ok: false, message: "Invalid l2Id" } as const;

  if (data.l1Id && data.l1Id !== l2.l1Id) {
    return { ok: false, message: "l1Id does not match selected l2Id" } as const;
  }

  if (data.l3Id) {
    const l3 = await db.query.adminL3.findFirst({
      where: and(eq(adminL3.id, data.l3Id), isNull(adminL3.deletedAt)),
    });
    if (!l3) return { ok: false, message: "Invalid l3Id" } as const;
    if (l3.l2Id !== l2.id) {
      return { ok: false, message: "l3Id does not belong to selected l2Id" } as const;
    }
  }

  return { ok: true, l1Id: data.l1Id ?? l2.l1Id, l2Id: l2.id, l3Id: data.l3Id ?? null } as const;
}

export async function createProperty(unsafeData: PropertyInput) {
  const data = propertySchema.safeParse(unsafeData);
  if (!data.success) {
    return {
      success: false,
      errors: data.error.flatten().fieldErrors,
    };
  }

  const userId = await getCurrentUserId();
  if (!userId) {
    return { success: false, errors: { root: ["Not authenticated"] } };
  }

  try {
    let resolvedL1Id: string | null = null;
    let resolvedL2Id: string | null = null;
    let resolvedL3Id: string | null = null;
    let precision: "point" | "l2" | "l3" = "l2";
    let locationPointSql: string | null = null;

    if (data.data.locationSource === "pin") {
      const resolved = await resolveAdminUnitsByPoint(data.data.lat!, data.data.lng!);
      if (!resolved?.l2Id) {
        return {
          success: false,
          errors: { root: ["Could not resolve district/soum from selected pin"] },
        };
      }

      resolvedL1Id = resolved.l1Id;
      resolvedL2Id = resolved.l2Id;
      resolvedL3Id = resolved.l3Id;
      precision = resolved.l3Id ? "l3" : "point";
      locationPointSql = `SRID=4326;POINT(${data.data.lng} ${data.data.lat})`;
    } else {
      const validation = await validateManualAdminSelection(data.data);
      if (!validation.ok) {
        return { success: false, errors: { root: [validation.message] } };
      }
      resolvedL1Id = validation.l1Id;
      resolvedL2Id = validation.l2Id;
      resolvedL3Id = validation.l3Id;
      precision = resolvedL3Id ? "l3" : "l2";
    }

    const [created] = await db
      .insert(property)
      .values({
        ownerUserId: userId,
        title: data.data.title,
        description: data.data.description ?? null,
        propertyType: data.data.propertyType,
        listingType: data.data.listingType,
        workflowStatus: data.data.workflowStatus,
        locationSource: data.data.locationSource,
        locationPrecision: precision,
        locationPoint: locationPointSql,
        l1Id: resolvedL1Id,
        l2Id: resolvedL2Id,
        l3Id: resolvedL3Id,
        priceMinor: data.data.priceMinor ?? null,
        currencyCode: data.data.currencyCode,
      })
      .returning();

    return { success: true, property: created };
  } catch (error) {
    console.error("Failed to create property:", error);
    return { success: false, errors: { root: ["Failed to create property"] } };
  }
}
