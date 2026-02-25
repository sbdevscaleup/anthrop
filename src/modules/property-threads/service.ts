import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/infrastructure/db/client";
import {
  messageReadState,
  property,
  propertyThread,
  threadMessage,
  threadParticipant,
} from "@/infrastructure/db/schema";
import type { CreateThreadInput, SendMessageInput } from "./contracts";
import { emitDomainEvent } from "../events/service";

async function assertThreadParticipant(threadId: string, userId: string) {
  const participant = await db.query.threadParticipant.findFirst({
    where: and(
      eq(threadParticipant.threadId, threadId),
      eq(threadParticipant.userId, userId),
      isNull(threadParticipant.leftAt),
    ),
  });

  if (!participant) throw new Error("FORBIDDEN");
}

export async function createThread(actorUserId: string, input: CreateThreadInput) {
  return db.transaction(async (tx) => {
    const targetProperty = await tx.query.property.findFirst({
      where: and(eq(property.id, input.propertyId), isNull(property.deletedAt)),
      columns: { id: true, ownerUserId: true, agentUserId: true },
    });
    if (!targetProperty) throw new Error("PROPERTY_NOT_FOUND");

    const [createdThread] = await tx
      .insert(propertyThread)
      .values({
        propertyId: input.propertyId,
        createdByUserId: actorUserId,
        organizationId: input.organizationId ?? null,
      })
      .returning();

    if (!createdThread) throw new Error("FAILED_TO_CREATE_THREAD");

    const participantIds = new Set([
      actorUserId,
      ...input.participantUserIds,
      targetProperty.ownerUserId,
      ...(targetProperty.agentUserId ? [targetProperty.agentUserId] : []),
    ]);

    await tx.insert(threadParticipant).values(
      [...participantIds].map((userId) => ({
        threadId: createdThread.id,
        userId,
        role:
          userId === targetProperty.ownerUserId
            ? ("owner" as const)
            : userId === targetProperty.agentUserId
              ? ("agent" as const)
              : userId === actorUserId
                ? ("inquirer" as const)
                : ("inquirer" as const),
      })),
    );

    await emitDomainEvent({
      eventType: "property_thread.created",
      aggregateType: "property_thread",
      aggregateId: createdThread.id,
      payload: { propertyId: input.propertyId },
      channels: ["in_app"],
    });

    return createdThread;
  });
}

export async function sendMessage(
  actorUserId: string,
  threadId: string,
  input: SendMessageInput,
) {
  await assertThreadParticipant(threadId, actorUserId);

  return db.transaction(async (tx) => {
    const [created] = await tx
      .insert(threadMessage)
      .values({
        threadId,
        senderUserId: actorUserId,
        body: input.body,
        messageType: input.messageType,
        metadataJson: input.metadata,
      })
      .returning();

    if (!created) throw new Error("FAILED_TO_SEND_MESSAGE");

    await tx
      .update(propertyThread)
      .set({ lastMessageAt: new Date() })
      .where(eq(propertyThread.id, threadId));

    await tx
      .insert(messageReadState)
      .values({
        threadId,
        userId: actorUserId,
        lastReadMessageId: created.id,
        lastReadAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [messageReadState.threadId, messageReadState.userId],
        set: {
          lastReadMessageId: created.id,
          lastReadAt: new Date(),
        },
      });

    await emitDomainEvent({
      eventType: "property_thread.message_sent",
      aggregateType: "property_thread",
      aggregateId: threadId,
      payload: { senderUserId: actorUserId, messageId: created.id },
      channels: ["in_app"],
    });

    return created;
  });
}

export async function listThreadsForProperty(
  actorUserId: string,
  propertyId: string,
  limit: number,
) {
  const rows = await db
    .select({
      id: propertyThread.id,
      propertyId: propertyThread.propertyId,
      createdByUserId: propertyThread.createdByUserId,
      organizationId: propertyThread.organizationId,
      lastMessageAt: propertyThread.lastMessageAt,
      archivedAt: propertyThread.archivedAt,
      createdAt: propertyThread.createdAt,
      unreadCount: sql<number>`COALESCE((
        SELECT COUNT(*)
        FROM thread_message tm
        LEFT JOIN message_read_state rs
          ON rs.thread_id = tm.thread_id AND rs.user_id = ${actorUserId}
        WHERE tm.thread_id = ${propertyThread.id}
          AND tm.deleted_at IS NULL
          AND (rs.last_read_at IS NULL OR tm.created_at > rs.last_read_at)
      ), 0)`,
    })
    .from(propertyThread)
    .innerJoin(
      threadParticipant,
      and(
        eq(threadParticipant.threadId, propertyThread.id),
        eq(threadParticipant.userId, actorUserId),
        isNull(threadParticipant.leftAt),
      ),
    )
    .where(and(eq(propertyThread.propertyId, propertyId), isNull(propertyThread.archivedAt)))
    .orderBy(desc(propertyThread.lastMessageAt), desc(propertyThread.createdAt))
    .limit(limit);

  return rows;
}