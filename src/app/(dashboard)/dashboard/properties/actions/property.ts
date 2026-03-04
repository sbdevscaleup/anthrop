"use server";

import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { headers } from "next/headers";
import { auth } from "@/modules/auth/infrastructure/auth";
import { db } from "@/infrastructure/db/client";
import {
  adminL1,
  adminL2,
  adminL3,
  listingTypeEnum,
  mediaTypeEnum,
  property,
  propertyAttributeDefinition,
  propertyAttributeOption,
  propertyAttributeValue,
  propertyCategory,
  propertyLocationSourceEnum,
  propertyMedia,
  propertyRentalTerms,
  propertySubcategory,
  propertyTypeEnum,
  propertyWorkflowStatusEnum,
  uploadAsset,
} from "@/infrastructure/db/schema";
import { resolveAdminUnitsByPoint } from "@/modules/admin-boundaries/infrastructure/resolve-admin-units";

const locationSourceValues = propertyLocationSourceEnum.enumValues;
const propertyTypeValues = propertyTypeEnum.enumValues;
const listingTypeValues = listingTypeEnum.enumValues;
const workflowValues = propertyWorkflowStatusEnum.enumValues;
const mediaTypeValues = mediaTypeEnum.enumValues;

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
    categorySlug: z.string().min(1).optional(),
    subcategorySlug: z.string().min(1).optional(),
    attributes: z.record(z.string(), z.unknown()).optional(),
    rentalTerms: z
      .object({
        hoaFeeMinor: z.number().int().nonnegative().optional(),
        furnished: z.boolean().optional(),
        leaseTermMonths: z.number().int().positive().optional(),
        depositMinor: z.number().int().nonnegative().optional(),
        utilitiesIncluded: z.record(z.string(), z.boolean()).optional(),
      })
      .optional(),
    uploadedMedia: z
      .array(
        z.object({
          fileId: z.string().uuid(),
          storageKey: z.string().min(1),
          mediaType: z.enum(mediaTypeValues).optional(),
          sortOrder: z.number().int().nonnegative().optional(),
        }),
      )
      .max(30)
      .optional(),
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

    const categorySlug = data.data.categorySlug ?? data.data.propertyType;
    const category = await db.query.propertyCategory.findFirst({
      where: and(
        eq(propertyCategory.slug, categorySlug),
        eq(propertyCategory.isActive, true),
      ),
    });

    const subcategorySlug = data.data.subcategorySlug ?? categorySlug;
    const subcategory = category
      ? await db.query.propertySubcategory.findFirst({
          where: and(
            eq(propertySubcategory.categoryId, category.id),
            eq(propertySubcategory.slug, subcategorySlug),
            eq(propertySubcategory.isActive, true),
          ),
        })
      : null;

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
        categoryId: category?.id ?? null,
        subcategoryId: subcategory?.id ?? null,
        priceMinor: data.data.priceMinor ?? null,
        currencyCode: data.data.currencyCode,
      })
      .returning();

    if (!created) {
      return { success: false, errors: { root: ["Failed to create property"] } };
    }

    const inputAttributes = data.data.attributes ?? {};
    const allDefinitions = await db.select().from(propertyAttributeDefinition);
    const defByCode = new Map(allDefinitions.map((d) => [d.code, d]));

    const attributeRows: Array<
      typeof propertyAttributeValue.$inferInsert
    > = [];
    for (const [code, rawValue] of Object.entries(inputAttributes)) {
      const definition = defByCode.get(code);
      if (!definition || rawValue == null) continue;

      const base = {
        propertyId: created.id,
        attributeId: definition.id,
      } as const;

      if (definition.valueType === "number") {
        const num = Number(rawValue);
        if (!Number.isNaN(num)) {
          attributeRows.push({ ...base, numberValue: String(num) });
        }
        continue;
      }

      if (definition.valueType === "boolean") {
        if (typeof rawValue === "boolean") {
          attributeRows.push({ ...base, booleanValue: rawValue });
        }
        continue;
      }

      if (definition.valueType === "string") {
        attributeRows.push({ ...base, textValue: String(rawValue) });
        continue;
      }

      if (definition.valueType === "json") {
        attributeRows.push({ ...base, jsonValue: rawValue });
        continue;
      }

      if (definition.valueType === "enum") {
        const option = await db.query.propertyAttributeOption.findFirst({
          where: and(
            eq(propertyAttributeOption.attributeId, definition.id),
            eq(propertyAttributeOption.value, String(rawValue)),
          ),
        });
        if (option) {
          attributeRows.push({ ...base, optionId: option.id });
        }
      }
    }

    if (attributeRows.length > 0) {
      for (const row of attributeRows) {
        await db
          .insert(propertyAttributeValue)
          .values(row)
          .onConflictDoUpdate({
            target: [propertyAttributeValue.propertyId, propertyAttributeValue.attributeId],
            set: {
              numberValue: row.numberValue ?? null,
              textValue: row.textValue ?? null,
              booleanValue: row.booleanValue ?? null,
              optionId: row.optionId ?? null,
              jsonValue: row.jsonValue ?? null,
              updatedAt: new Date(),
            },
          });
      }
    }

    if (data.data.listingType === "rent" && data.data.rentalTerms) {
      await db
        .insert(propertyRentalTerms)
        .values({
          propertyId: created.id,
          hoaFeeMinor: data.data.rentalTerms.hoaFeeMinor ?? null,
          furnished: data.data.rentalTerms.furnished ?? null,
          leaseTermMonths: data.data.rentalTerms.leaseTermMonths ?? null,
          depositMinor: data.data.rentalTerms.depositMinor ?? null,
          utilitiesIncludedJson: data.data.rentalTerms.utilitiesIncluded ?? {},
        })
        .onConflictDoUpdate({
          target: propertyRentalTerms.propertyId,
          set: {
            hoaFeeMinor: data.data.rentalTerms.hoaFeeMinor ?? null,
            furnished: data.data.rentalTerms.furnished ?? null,
            leaseTermMonths: data.data.rentalTerms.leaseTermMonths ?? null,
            depositMinor: data.data.rentalTerms.depositMinor ?? null,
            utilitiesIncludedJson: data.data.rentalTerms.utilitiesIncluded ?? {},
            updatedAt: new Date(),
          },
        });
    }

    if ((data.data.uploadedMedia?.length ?? 0) > 0) {
      for (const [index, mediaInput] of (data.data.uploadedMedia ?? []).entries()) {
        const uploaded = await db.query.uploadAsset.findFirst({
          where: and(
            eq(uploadAsset.id, mediaInput.fileId),
            eq(uploadAsset.userId, userId),
            isNull(uploadAsset.deletedAt),
          ),
        });

        if (!uploaded) {
          return {
            success: false,
            errors: { root: [`Upload asset not found: ${mediaInput.fileId}`] },
          };
        }

        if (uploaded.storageKey !== mediaInput.storageKey) {
          return {
            success: false,
            errors: {
              root: [`Upload storage key mismatch: ${mediaInput.fileId}`],
            },
          };
        }

        if (uploaded.uploadStatus !== "uploaded" && uploaded.uploadStatus !== "attached") {
          return {
            success: false,
            errors: {
              root: [`Upload has not completed: ${mediaInput.fileId}`],
            },
          };
        }

        const fallbackUrl = `r2://${uploaded.bucket}/${uploaded.storageKey}`;
        const mediaUrl = uploaded.publicUrl ?? fallbackUrl;

        await db.insert(propertyMedia).values({
          propertyId: created.id,
          url: mediaUrl,
          storageKey: uploaded.storageKey,
          bucket: uploaded.bucket,
          accessLevel: uploaded.accessLevel,
          mimeType: uploaded.mimeType,
          bytes: uploaded.bytes ?? null,
          checksum: uploaded.checksum ?? null,
          uploadStatus: "attached",
          mediaType:
            mediaInput.mediaType ??
            (uploaded.mimeType.startsWith("video/")
              ? "video"
              : uploaded.mimeType.startsWith("image/")
                ? "image"
                : "document"),
          sortOrder: mediaInput.sortOrder ?? index,
          metadataJson: {
            source: "r2",
            uploadAssetId: uploaded.id,
            accessLevel: uploaded.accessLevel,
          },
        });

        await db
          .update(uploadAsset)
          .set({
            propertyId: created.id,
            uploadStatus: "attached",
            updatedAt: new Date(),
          })
          .where(eq(uploadAsset.id, uploaded.id));
      }
    }

    return { success: true, property: created };
  } catch (error) {
    console.error("Failed to create property:", error);
    return { success: false, errors: { root: ["Failed to create property"] } };
  }
}
