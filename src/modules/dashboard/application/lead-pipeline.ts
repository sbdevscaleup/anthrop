import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/infrastructure/db/client";
import {
  leadActivity,
  property,
  propertyInquiry,
  propertyLead,
  propertyThread,
  rentalApplication,
} from "@/infrastructure/db/schema";
import { emitDomainEvent } from "@/modules/events/service";

type SourceType = "inquiry" | "thread" | "rental_application";

async function findLeadBySource(sourceType: SourceType, sourceId: string) {
  return db.query.propertyLead.findFirst({
    where: and(
      eq(propertyLead.sourceType, sourceType),
      eq(propertyLead.sourceId, sourceId),
      isNull(propertyLead.deletedAt),
    ),
  });
}

function mapApplicationStatusToLeadStatus(
  status: "draft" | "submitted" | "under_review" | "approved" | "rejected" | "withdrawn",
) {
  if (status === "under_review") return "under_review" as const;
  if (status === "approved") return "closed_won" as const;
  if (status === "rejected" || status === "withdrawn") return "closed_lost" as const;
  return "new" as const;
}

export async function ensureLeadForThread(threadId: string) {
  const thread = await db.query.propertyThread.findFirst({
    where: eq(propertyThread.id, threadId),
  });
  if (!thread) return null;

  if (thread.leadId) {
    const linked = await db.query.propertyLead.findFirst({
      where: and(eq(propertyLead.id, thread.leadId), isNull(propertyLead.deletedAt)),
    });
    if (linked) {
      return linked;
    }
  }

  const existing = await findLeadBySource("thread", thread.id);
  if (existing) {
    await db
      .update(propertyThread)
      .set({ leadId: existing.id })
      .where(eq(propertyThread.id, thread.id));
    return existing;
  }

  const targetProperty = await db.query.property.findFirst({
    where: and(eq(property.id, thread.propertyId), isNull(property.deletedAt)),
    columns: {
      id: true,
      organizationId: true,
      ownerUserId: true,
      agentUserId: true,
    },
  });
  if (!targetProperty) return null;

  const [created] = await db
    .insert(propertyLead)
    .values({
      propertyId: targetProperty.id,
      organizationId: thread.organizationId ?? targetProperty.organizationId ?? null,
      sourceType: "thread",
      sourceId: thread.id,
      assignedUserId: targetProperty.agentUserId ?? targetProperty.ownerUserId,
      status: "contacted",
      priority: "medium",
      lastActivityAt: thread.lastMessageAt ?? thread.createdAt ?? new Date(),
      metadataJson: { source: "property_thread" },
      createdByUserId: thread.createdByUserId,
    })
    .returning();

  if (!created) return null;

  await db
    .update(propertyThread)
    .set({ leadId: created.id })
    .where(eq(propertyThread.id, thread.id));

  await emitDomainEvent({
    eventType: "lead.created",
    aggregateType: "property_lead",
    aggregateId: created.id,
    payload: { sourceType: "thread", sourceId: thread.id },
    channels: ["in_app"],
  });

  return created;
}

export async function ensureLeadForRentalApplication(rentalApplicationId: string) {
  const application = await db.query.rentalApplication.findFirst({
    where: and(
      eq(rentalApplication.id, rentalApplicationId),
      isNull(rentalApplication.deletedAt),
    ),
  });
  if (!application) return null;

  if (application.leadId) {
    const linked = await db.query.propertyLead.findFirst({
      where: and(eq(propertyLead.id, application.leadId), isNull(propertyLead.deletedAt)),
    });
    if (linked) {
      return linked;
    }
  }

  const existing = await findLeadBySource("rental_application", application.id);
  if (existing) {
    await db
      .update(rentalApplication)
      .set({ leadId: existing.id })
      .where(eq(rentalApplication.id, application.id));
    return existing;
  }

  const targetProperty = await db.query.property.findFirst({
    where: and(eq(property.id, application.propertyId), isNull(property.deletedAt)),
    columns: {
      id: true,
      organizationId: true,
      ownerUserId: true,
      agentUserId: true,
    },
  });
  if (!targetProperty) return null;

  const [created] = await db
    .insert(propertyLead)
    .values({
      propertyId: targetProperty.id,
      organizationId: targetProperty.organizationId,
      sourceType: "rental_application",
      sourceId: application.id,
      assignedUserId: targetProperty.agentUserId ?? targetProperty.ownerUserId,
      status: mapApplicationStatusToLeadStatus(application.status),
      priority: "medium",
      lastActivityAt:
        application.decidedAt ?? application.submittedAt ?? application.createdAt ?? new Date(),
      metadataJson: { source: "rental_application" },
      createdByUserId: application.applicantUserId,
    })
    .returning();

  if (!created) return null;

  await db
    .update(rentalApplication)
    .set({ leadId: created.id })
    .where(eq(rentalApplication.id, application.id));

  await emitDomainEvent({
    eventType: "lead.created",
    aggregateType: "property_lead",
    aggregateId: created.id,
    payload: { sourceType: "rental_application", sourceId: application.id },
    channels: ["in_app"],
  });

  return created;
}

export async function ensureLeadForInquiry(inquiryId: string) {
  const inquiry = await db.query.propertyInquiry.findFirst({
    where: and(eq(propertyInquiry.id, inquiryId), isNull(propertyInquiry.deletedAt)),
  });
  if (!inquiry) return null;

  const existing = await findLeadBySource("inquiry", inquiry.id);
  if (existing) return existing;

  const targetProperty = await db.query.property.findFirst({
    where: and(eq(property.id, inquiry.propertyId), isNull(property.deletedAt)),
    columns: {
      id: true,
      organizationId: true,
      ownerUserId: true,
      agentUserId: true,
    },
  });
  if (!targetProperty) return null;

  const [created] = await db
    .insert(propertyLead)
    .values({
      propertyId: targetProperty.id,
      organizationId: targetProperty.organizationId,
      sourceType: "inquiry",
      sourceId: inquiry.id,
      assignedUserId: targetProperty.agentUserId ?? targetProperty.ownerUserId,
      status: inquiry.status === "new" ? "new" : inquiry.status === "closed" ? "qualified" : "contacted",
      priority: "medium",
      lastActivityAt: inquiry.createdAt,
      metadataJson: { source: "property_inquiry" },
      createdByUserId: inquiry.inquirerUserId,
    })
    .returning();

  if (!created) return null;

  await emitDomainEvent({
    eventType: "lead.created",
    aggregateType: "property_lead",
    aggregateId: created.id,
    payload: { sourceType: "inquiry", sourceId: inquiry.id },
    channels: ["in_app"],
  });

  return created;
}

export async function createLeadActivity(input: {
  leadId: string;
  actorUserId: string;
  activityType:
    | "note"
    | "status_changed"
    | "assignment_changed"
    | "message_sent"
    | "application_status_changed";
  payload?: Record<string, unknown>;
}) {
  return db.transaction(async (tx) => {
    const existing = await tx.query.propertyLead.findFirst({
      where: and(eq(propertyLead.id, input.leadId), isNull(propertyLead.deletedAt)),
    });
    if (!existing) {
      throw new Error("LEAD_NOT_FOUND");
    }

    const [activity] = await tx
      .insert(leadActivity)
      .values({
        leadId: input.leadId,
        actorUserId: input.actorUserId,
        activityType: input.activityType,
        payloadJson: input.payload ?? {},
      })
      .returning();

    if (!activity) {
      throw new Error("FAILED_TO_CREATE_LEAD_ACTIVITY");
    }

    const now = new Date();
    await tx
      .update(propertyLead)
      .set({
        lastActivityAt: now,
        firstResponseAt:
          input.activityType === "message_sent" && existing.firstResponseAt == null
            ? now
            : existing.firstResponseAt,
        updatedAt: now,
      })
      .where(eq(propertyLead.id, input.leadId));

    return activity;
  });
}

export async function syncLeadForRentalDecision(
  rentalApplicationId: string,
  actorUserId: string,
  status: "under_review" | "approved" | "rejected",
  note?: string,
) {
  const lead = await ensureLeadForRentalApplication(rentalApplicationId);
  if (!lead) return null;

  const mappedStatus =
    status === "under_review"
      ? ("under_review" as const)
      : status === "approved"
        ? ("closed_won" as const)
        : ("closed_lost" as const);
  const now = new Date();

  await db
    .update(propertyLead)
    .set({
      status: mappedStatus,
      closedAt: mappedStatus === "closed_won" || mappedStatus === "closed_lost" ? now : null,
      lastActivityAt: now,
      updatedAt: now,
    })
    .where(eq(propertyLead.id, lead.id));

  await createLeadActivity({
    leadId: lead.id,
    actorUserId,
    activityType: "application_status_changed",
    payload: { rentalApplicationId, status, note: note ?? null },
  });

  return lead.id;
}
