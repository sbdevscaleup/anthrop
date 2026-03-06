import {
  and,
  desc,
  eq,
  inArray,
  isNull,
  lt,
  or,
  sql,
} from "drizzle-orm";
import { db } from "@/infrastructure/db/client";
import {
  leadActivity,
  property,
  propertyAgentAssignment,
  propertyLead,
  propertyThread,
  rentalApplication,
} from "@/infrastructure/db/schema";
import { createLeadActivity as createLeadActivityRecord } from "@/modules/dashboard/application/lead-pipeline";
import { emitDomainEvent } from "@/modules/events/service";

function cursorCondition<T extends { id: unknown }>(
  column: T["id"],
  cursor?: string,
) {
  return cursor ? lt(column as never, cursor as never) : undefined;
}

function isClosedLeadStatus(status: string) {
  return status === "closed_won" || status === "closed_lost";
}

async function getAgentPropertyIds(userId: string, organizationId?: string | null) {
  const assignmentRows = await db
    .select({ propertyId: propertyAgentAssignment.propertyId })
    .from(propertyAgentAssignment)
    .where(
      and(
        eq(propertyAgentAssignment.agentUserId, userId),
        isNull(propertyAgentAssignment.endedAt),
        organizationId
          ? eq(propertyAgentAssignment.organizationId, organizationId)
          : undefined,
      ),
    );

  const legacyRows = await db
    .select({ id: property.id })
    .from(property)
    .where(
      and(
        eq(property.agentUserId, userId),
        isNull(property.deletedAt),
        organizationId ? eq(property.organizationId, organizationId) : undefined,
      ),
    );

  return Array.from(
    new Set([
      ...assignmentRows.map((row) => row.propertyId),
      ...legacyRows.map((row) => row.id),
    ]),
  );
}

export async function getSellerOverview(userId: string) {
  const [listingCounts, openLeads, pendingApplications, activeThreads] = await Promise.all([
    db
      .select({
        total: sql<number>`COUNT(*)`,
        draft: sql<number>`COUNT(*) FILTER (WHERE ${property.workflowStatus} = 'draft')`,
        published: sql<number>`COUNT(*) FILTER (WHERE ${property.workflowStatus} = 'published')`,
      })
      .from(property)
      .where(and(eq(property.ownerUserId, userId), isNull(property.deletedAt))),
    db
      .select({ count: sql<number>`COUNT(*)` })
      .from(propertyLead)
      .innerJoin(
        property,
        and(
          eq(property.id, propertyLead.propertyId),
          eq(property.ownerUserId, userId),
          isNull(property.deletedAt),
        ),
      )
      .where(
        and(
          isNull(propertyLead.deletedAt),
          sql`${propertyLead.status} NOT IN ('closed_won', 'closed_lost')`,
        ),
      ),
    db
      .select({ count: sql<number>`COUNT(*)` })
      .from(rentalApplication)
      .innerJoin(
        property,
        and(
          eq(property.id, rentalApplication.propertyId),
          eq(property.ownerUserId, userId),
          isNull(property.deletedAt),
        ),
      )
      .where(
        and(
          isNull(rentalApplication.deletedAt),
          sql`${rentalApplication.status} IN ('submitted', 'under_review')`,
        ),
      ),
    db
      .select({ count: sql<number>`COUNT(*)` })
      .from(propertyThread)
      .innerJoin(
        property,
        and(
          eq(property.id, propertyThread.propertyId),
          eq(property.ownerUserId, userId),
          isNull(property.deletedAt),
        ),
      )
      .where(isNull(propertyThread.archivedAt)),
  ]);

  return {
    listings: {
      total: Number(listingCounts[0]?.total ?? 0),
      draft: Number(listingCounts[0]?.draft ?? 0),
      published: Number(listingCounts[0]?.published ?? 0),
    },
    openLeads: Number(openLeads[0]?.count ?? 0),
    pendingApplications: Number(pendingApplications[0]?.count ?? 0),
    activeThreads: Number(activeThreads[0]?.count ?? 0),
  };
}

export async function getAgentOverview(
  userId: string,
  organizationId: string | null,
) {
  const propertyIds = await getAgentPropertyIds(userId, organizationId);
  if (propertyIds.length === 0) {
    return {
      assignedListings: 0,
      openLeads: 0,
      pendingApplications: 0,
      activeThreads: 0,
    };
  }

  const [openLeads, pendingApplications, activeThreads] = await Promise.all([
    db
      .select({ count: sql<number>`COUNT(*)` })
      .from(propertyLead)
      .where(
        and(
          inArray(propertyLead.propertyId, propertyIds),
          isNull(propertyLead.deletedAt),
          sql`${propertyLead.status} NOT IN ('closed_won', 'closed_lost')`,
        ),
      ),
    db
      .select({ count: sql<number>`COUNT(*)` })
      .from(rentalApplication)
      .where(
        and(
          inArray(rentalApplication.propertyId, propertyIds),
          isNull(rentalApplication.deletedAt),
          sql`${rentalApplication.status} IN ('submitted', 'under_review')`,
        ),
      ),
    db
      .select({ count: sql<number>`COUNT(*)` })
      .from(propertyThread)
      .where(
        and(
          inArray(propertyThread.propertyId, propertyIds),
          isNull(propertyThread.archivedAt),
        ),
      ),
  ]);

  return {
    assignedListings: propertyIds.length,
    openLeads: Number(openLeads[0]?.count ?? 0),
    pendingApplications: Number(pendingApplications[0]?.count ?? 0),
    activeThreads: Number(activeThreads[0]?.count ?? 0),
  };
}

export async function listSellerListings(input: {
  userId: string;
  limit: number;
  cursor?: string;
}) {
  const rows = await db
    .select()
    .from(property)
    .where(
      and(
        eq(property.ownerUserId, input.userId),
        isNull(property.deletedAt),
        cursorCondition(property.id, input.cursor),
      ),
    )
    .orderBy(desc(property.createdAt), desc(property.id))
    .limit(input.limit + 1);

  const hasMore = rows.length > input.limit;
  const items = hasMore ? rows.slice(0, input.limit) : rows;

  return {
    items,
    hasMore,
    nextCursor: hasMore ? items.at(-1)?.id : null,
  };
}

export async function listAgentListings(input: {
  userId: string;
  organizationId?: string | null;
  limit: number;
  cursor?: string;
}) {
  const propertyIds = await getAgentPropertyIds(input.userId, input.organizationId);
  if (propertyIds.length === 0) {
    return { items: [], hasMore: false, nextCursor: null };
  }

  const rows = await db
    .select()
    .from(property)
    .where(
      and(
        inArray(property.id, propertyIds),
        isNull(property.deletedAt),
        cursorCondition(property.id, input.cursor),
      ),
    )
    .orderBy(desc(property.createdAt), desc(property.id))
    .limit(input.limit + 1);

  const hasMore = rows.length > input.limit;
  const items = hasMore ? rows.slice(0, input.limit) : rows;

  return {
    items,
    hasMore,
    nextCursor: hasMore ? items.at(-1)?.id : null,
  };
}

export async function listSellerLeads(input: {
  userId: string;
  limit: number;
  cursor?: string;
}) {
  const rows = await db
    .select({
      id: propertyLead.id,
      propertyId: propertyLead.propertyId,
      organizationId: propertyLead.organizationId,
      sourceType: propertyLead.sourceType,
      sourceId: propertyLead.sourceId,
      assignedUserId: propertyLead.assignedUserId,
      status: propertyLead.status,
      priority: propertyLead.priority,
      firstResponseAt: propertyLead.firstResponseAt,
      lastActivityAt: propertyLead.lastActivityAt,
      closedAt: propertyLead.closedAt,
      metadataJson: propertyLead.metadataJson,
      createdByUserId: propertyLead.createdByUserId,
      createdAt: propertyLead.createdAt,
      updatedAt: propertyLead.updatedAt,
      title: property.title,
    })
    .from(propertyLead)
    .innerJoin(
      property,
      and(
        eq(property.id, propertyLead.propertyId),
        eq(property.ownerUserId, input.userId),
        isNull(property.deletedAt),
      ),
    )
    .where(
      and(
        isNull(propertyLead.deletedAt),
        cursorCondition(propertyLead.id, input.cursor),
      ),
    )
    .orderBy(desc(propertyLead.lastActivityAt), desc(propertyLead.id))
    .limit(input.limit + 1);

  const hasMore = rows.length > input.limit;
  const items = hasMore ? rows.slice(0, input.limit) : rows;
  return { items, hasMore, nextCursor: hasMore ? items.at(-1)?.id : null };
}

export async function listAgentLeads(input: {
  userId: string;
  organizationId?: string | null;
  limit: number;
  cursor?: string;
}) {
  const propertyIds = await getAgentPropertyIds(input.userId, input.organizationId);
  const conditions = [
    isNull(propertyLead.deletedAt),
    cursorCondition(propertyLead.id, input.cursor),
  ].filter(Boolean) as ReturnType<typeof and>[];

  if (propertyIds.length > 0 || input.organizationId) {
    conditions.push(
      or(
        propertyIds.length > 0 ? inArray(propertyLead.propertyId, propertyIds) : undefined,
        input.organizationId
          ? eq(propertyLead.organizationId, input.organizationId)
          : undefined,
        eq(propertyLead.assignedUserId, input.userId),
      )!,
    );
  } else {
    conditions.push(eq(propertyLead.assignedUserId, input.userId));
  }

  const rows = await db
    .select()
    .from(propertyLead)
    .where(and(...conditions))
    .orderBy(desc(propertyLead.lastActivityAt), desc(propertyLead.id))
    .limit(input.limit + 1);

  const hasMore = rows.length > input.limit;
  const items = hasMore ? rows.slice(0, input.limit) : rows;
  return { items, hasMore, nextCursor: hasMore ? items.at(-1)?.id : null };
}

export async function listSellerThreads(input: {
  userId: string;
  limit: number;
  cursor?: string;
}) {
  const rows = await db
    .select({
      id: propertyThread.id,
      propertyId: propertyThread.propertyId,
      organizationId: propertyThread.organizationId,
      leadId: propertyThread.leadId,
      lastMessageAt: propertyThread.lastMessageAt,
      createdAt: propertyThread.createdAt,
      title: property.title,
    })
    .from(propertyThread)
    .innerJoin(
      property,
      and(
        eq(property.id, propertyThread.propertyId),
        eq(property.ownerUserId, input.userId),
        isNull(property.deletedAt),
      ),
    )
    .where(
      and(
        isNull(propertyThread.archivedAt),
        cursorCondition(propertyThread.id, input.cursor),
      ),
    )
    .orderBy(desc(propertyThread.lastMessageAt), desc(propertyThread.id))
    .limit(input.limit + 1);

  const hasMore = rows.length > input.limit;
  const items = hasMore ? rows.slice(0, input.limit) : rows;
  return { items, hasMore, nextCursor: hasMore ? items.at(-1)?.id : null };
}

export async function listAgentThreads(input: {
  userId: string;
  organizationId?: string | null;
  limit: number;
  cursor?: string;
}) {
  const propertyIds = await getAgentPropertyIds(input.userId, input.organizationId);
  if (propertyIds.length === 0 && !input.organizationId) {
    return { items: [], hasMore: false, nextCursor: null };
  }

  const rows = await db
    .select()
    .from(propertyThread)
    .where(
      and(
        isNull(propertyThread.archivedAt),
        cursorCondition(propertyThread.id, input.cursor),
        or(
          propertyIds.length > 0 ? inArray(propertyThread.propertyId, propertyIds) : undefined,
          input.organizationId
            ? eq(propertyThread.organizationId, input.organizationId)
            : undefined,
        ),
      ),
    )
    .orderBy(desc(propertyThread.lastMessageAt), desc(propertyThread.id))
    .limit(input.limit + 1);

  const hasMore = rows.length > input.limit;
  const items = hasMore ? rows.slice(0, input.limit) : rows;
  return { items, hasMore, nextCursor: hasMore ? items.at(-1)?.id : null };
}

export async function listSellerApplications(input: {
  userId: string;
  limit: number;
  cursor?: string;
}) {
  const rows = await db
    .select({
      id: rentalApplication.id,
      propertyId: rentalApplication.propertyId,
      applicantUserId: rentalApplication.applicantUserId,
      status: rentalApplication.status,
      submittedAt: rentalApplication.submittedAt,
      decidedAt: rentalApplication.decidedAt,
      leadId: rentalApplication.leadId,
      title: property.title,
    })
    .from(rentalApplication)
    .innerJoin(
      property,
      and(
        eq(property.id, rentalApplication.propertyId),
        eq(property.ownerUserId, input.userId),
        isNull(property.deletedAt),
      ),
    )
    .where(
      and(
        isNull(rentalApplication.deletedAt),
        cursorCondition(rentalApplication.id, input.cursor),
      ),
    )
    .orderBy(desc(rentalApplication.createdAt), desc(rentalApplication.id))
    .limit(input.limit + 1);

  const hasMore = rows.length > input.limit;
  const items = hasMore ? rows.slice(0, input.limit) : rows;
  return { items, hasMore, nextCursor: hasMore ? items.at(-1)?.id : null };
}

export async function listAgentApplications(input: {
  userId: string;
  organizationId?: string | null;
  limit: number;
  cursor?: string;
}) {
  const propertyIds = await getAgentPropertyIds(input.userId, input.organizationId);
  if (propertyIds.length === 0) {
    return { items: [], hasMore: false, nextCursor: null };
  }

  const rows = await db
    .select()
    .from(rentalApplication)
    .where(
      and(
        inArray(rentalApplication.propertyId, propertyIds),
        isNull(rentalApplication.deletedAt),
        cursorCondition(rentalApplication.id, input.cursor),
      ),
    )
    .orderBy(desc(rentalApplication.createdAt), desc(rentalApplication.id))
    .limit(input.limit + 1);

  const hasMore = rows.length > input.limit;
  const items = hasMore ? rows.slice(0, input.limit) : rows;
  return { items, hasMore, nextCursor: hasMore ? items.at(-1)?.id : null };
}

async function assertLeadAccess(leadId: string, actorUserId: string) {
  const row = await db
    .select({
      id: propertyLead.id,
      assignedUserId: propertyLead.assignedUserId,
      ownerUserId: property.ownerUserId,
      agentUserId: property.agentUserId,
      organizationId: propertyLead.organizationId,
    })
    .from(propertyLead)
    .innerJoin(property, eq(property.id, propertyLead.propertyId))
    .where(and(eq(propertyLead.id, leadId), isNull(propertyLead.deletedAt)))
    .limit(1)
    .then((result) => result[0] ?? null);

  if (!row) {
    throw new Error("LEAD_NOT_FOUND");
  }

  const canAccess =
    row.ownerUserId === actorUserId ||
    row.agentUserId === actorUserId ||
    row.assignedUserId === actorUserId;

  if (!canAccess) {
    throw new Error("FORBIDDEN");
  }

  return row;
}

export async function updateLead(
  leadId: string,
  actorUserId: string,
  input: {
    status?: "new" | "contacted" | "qualified" | "under_review" | "closed_won" | "closed_lost";
    priority?: "low" | "medium" | "high" | "urgent";
    assignedUserId?: string;
    note?: string;
  },
) {
  await assertLeadAccess(leadId, actorUserId);

  const now = new Date();
  const updatePayload: Partial<typeof propertyLead.$inferInsert> = {};

  if (input.status != null) {
    updatePayload.status = input.status;
    updatePayload.closedAt = isClosedLeadStatus(input.status) ? now : null;
  }
  if (input.priority != null) {
    updatePayload.priority = input.priority;
  }
  if (input.assignedUserId != null) {
    updatePayload.assignedUserId = input.assignedUserId;
  }
  updatePayload.lastActivityAt = now;
  updatePayload.updatedAt = now;

  const [updated] = await db
    .update(propertyLead)
    .set(updatePayload)
    .where(eq(propertyLead.id, leadId))
    .returning();

  if (!updated) {
    throw new Error("FAILED_TO_UPDATE_LEAD");
  }

  if (input.status != null) {
    await createLeadActivityRecord({
      leadId,
      actorUserId,
      activityType: "status_changed",
      payload: { status: input.status },
    });
  }
  if (input.assignedUserId != null) {
    await createLeadActivityRecord({
      leadId,
      actorUserId,
      activityType: "assignment_changed",
      payload: { assignedUserId: input.assignedUserId },
    });
  }
  if (input.note) {
    await createLeadActivityRecord({
      leadId,
      actorUserId,
      activityType: "note",
      payload: { note: input.note },
    });
  }

  await emitDomainEvent({
    eventType: "lead.updated",
    aggregateType: "property_lead",
    aggregateId: leadId,
    payload: {
      status: input.status ?? null,
      priority: input.priority ?? null,
      assignedUserId: input.assignedUserId ?? null,
    },
    channels: ["in_app"],
  });

  return updated;
}

export async function addLeadActivity(
  leadId: string,
  actorUserId: string,
  input: {
    type:
      | "note"
      | "status_changed"
      | "assignment_changed"
      | "message_sent"
      | "application_status_changed";
    payload?: Record<string, unknown>;
  },
) {
  await assertLeadAccess(leadId, actorUserId);
  const activity = await createLeadActivityRecord({
    leadId,
    actorUserId,
    activityType: input.type,
    payload: input.payload,
  });

  await emitDomainEvent({
    eventType: "lead.activity_created",
    aggregateType: "property_lead",
    aggregateId: leadId,
    payload: { activityId: activity.id, type: input.type },
    channels: ["in_app"],
  });

  return activity;
}

export async function listLeadActivities(
  leadId: string,
  actorUserId: string,
  limit = 30,
) {
  await assertLeadAccess(leadId, actorUserId);

  return db
    .select()
    .from(leadActivity)
    .where(eq(leadActivity.leadId, leadId))
    .orderBy(desc(leadActivity.createdAt))
    .limit(limit);
}
