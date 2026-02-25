import { and, desc, eq, isNull, lt, sql } from "drizzle-orm";
import { db } from "@/infrastructure/db/client";
import {
  rentalApplication,
  rentalApplicationDocument,
  rentalApplicationSnapshot,
  property,
} from "@/infrastructure/db/schema";
import { emitDomainEvent } from "../events/service";
import type {
  CreateRentalApplicationInput,
  RentalApplicationDecisionInput,
} from "./contracts";

export async function createRentalApplication(
  userId: string,
  input: CreateRentalApplicationInput,
) {
  return db.transaction(async (tx) => {
    const targetProperty = await tx.query.property.findFirst({
      where: and(eq(property.id, input.propertyId), isNull(property.deletedAt)),
      columns: {
        id: true,
      },
    });

    if (!targetProperty) {
      throw new Error("PROPERTY_NOT_FOUND");
    }

    const [created] = await tx
      .insert(rentalApplication)
      .values({
        propertyId: input.propertyId,
        applicantUserId: userId,
        status: "submitted",
        submittedAt: new Date(),
      })
      .returning();

    if (!created) throw new Error("FAILED_TO_CREATE_RENTAL_APPLICATION");

    await tx.insert(rentalApplicationSnapshot).values({
      rentalApplicationId: created.id,
      submittedPayloadJson: input.payload,
    });

    if (input.documentUrls.length > 0) {
      await tx.insert(rentalApplicationDocument).values(
        input.documentUrls.map((fileUrl) => ({
          rentalApplicationId: created.id,
          fileUrl,
          metadataJson: {},
        })),
      );
    }

    await emitDomainEvent({
      eventType: "rental_application.submitted",
      aggregateType: "rental_application",
      aggregateId: created.id,
      payload: {
        propertyId: created.propertyId,
        applicantUserId: created.applicantUserId,
      },
      channels: ["in_app", "email"],
    });

    return created;
  });
}

export async function listRentalApplications(
  userId: string,
  opts: {
    propertyId?: string;
    status?: string;
    limit: number;
    cursor?: string;
  },
) {
  const conditions = [isNull(rentalApplication.deletedAt)] as Array<
    ReturnType<typeof isNull> | ReturnType<typeof eq> | ReturnType<typeof lt> | ReturnType<typeof sql>
  >;

  if (opts.propertyId) {
    const targetProperty = await db.query.property.findFirst({
      where: and(eq(property.id, opts.propertyId), isNull(property.deletedAt)),
      columns: { ownerUserId: true, agentUserId: true },
    });

    if (!targetProperty) throw new Error("PROPERTY_NOT_FOUND");
    const canModerate =
      targetProperty.ownerUserId === userId || targetProperty.agentUserId === userId;
    if (!canModerate) throw new Error("FORBIDDEN");

    conditions.push(eq(rentalApplication.propertyId, opts.propertyId));
  } else {
    conditions.push(eq(rentalApplication.applicantUserId, userId));
  }

  if (opts.status) conditions.push(eq(rentalApplication.status, opts.status as never));
  if (opts.cursor) conditions.push(lt(rentalApplication.id, opts.cursor));

  const rows = await db
    .select()
    .from(rentalApplication)
    .where(and(...conditions))
    .orderBy(desc(rentalApplication.createdAt), desc(rentalApplication.id))
    .limit(opts.limit + 1);

  const hasMore = rows.length > opts.limit;
  const items = hasMore ? rows.slice(0, opts.limit) : rows;

  return {
    items,
    hasMore,
    nextCursor: hasMore ? items.at(-1)?.id : null,
  };
}

const VALID_DECISIONS = new Set(["under_review", "approved", "rejected"]);

export async function decideRentalApplication(
  actorUserId: string,
  id: string,
  input: RentalApplicationDecisionInput,
) {
  if (!VALID_DECISIONS.has(input.status)) {
    throw new Error("INVALID_STATUS");
  }

  return db.transaction(async (tx) => {
    const existing = await tx.query.rentalApplication.findFirst({
      where: and(eq(rentalApplication.id, id), isNull(rentalApplication.deletedAt)),
    });

    if (!existing) throw new Error("RENTAL_APPLICATION_NOT_FOUND");
    const targetProperty = await tx.query.property.findFirst({
      where: and(
        eq(property.id, existing.propertyId),
        isNull(property.deletedAt),
      ),
      columns: { ownerUserId: true, agentUserId: true },
    });
    const canDecide =
      targetProperty &&
      (targetProperty.ownerUserId === actorUserId ||
        targetProperty.agentUserId === actorUserId);
    if (!canDecide) throw new Error("FORBIDDEN");

    if (existing.status === "approved" || existing.status === "rejected") {
      throw new Error("TERMINAL_STATE");
    }

    const [updated] = await tx
      .update(rentalApplication)
      .set({
        status: input.status,
        decidedAt: input.status === "under_review" ? existing.decidedAt : new Date(),
        decidedByUserId:
          input.status === "under_review" ? existing.decidedByUserId : actorUserId,
      })
      .where(eq(rentalApplication.id, id))
      .returning();

    if (!updated) throw new Error("FAILED_TO_UPDATE_RENTAL_APPLICATION");

    await emitDomainEvent({
      eventType: `rental_application.${input.status}`,
      aggregateType: "rental_application",
      aggregateId: updated.id,
      payload: { actorUserId, note: input.note ?? null },
      channels: ["in_app", "email"],
    });

    return updated;
  });
}