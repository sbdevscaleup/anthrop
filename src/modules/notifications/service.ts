import { and, desc, eq, lt } from "drizzle-orm";
import { db } from "@/infrastructure/db/client";
import { notification, notificationPreference } from "@/infrastructure/db/schema";
import {
  type NotificationEvent,
  type NotificationPreference,
  notificationEventSchema,
  notificationPreferenceSchema,
} from "./contracts";
import { emitDomainEvent } from "../events/service";

export async function createNotification(input: NotificationEvent) {
  const parsed = notificationEventSchema.parse(input);

  const [created] = await db
    .insert(notification)
    .values({
      userId: parsed.userId,
      organizationId: parsed.organizationId ?? null,
      type: parsed.type,
      title: parsed.title,
      body: parsed.body,
      dataJson: parsed.data ?? {},
    })
    .returning();

  if (!created) throw new Error("Failed to create notification");

  await emitDomainEvent({
    eventType: `notification.${parsed.type}`,
    aggregateType: "notification",
    aggregateId: created.id,
    payload: { userId: created.userId, notificationId: created.id },
    channels: ["in_app", "email"],
  });

  return created;
}

export async function listNotificationsForUser(
  userId: string,
  opts: { limit: number; cursor?: string },
) {
  const where = opts.cursor
    ? and(eq(notification.userId, userId), lt(notification.id, opts.cursor))
    : eq(notification.userId, userId);

  const rows = await db
    .select()
    .from(notification)
    .where(where)
    .orderBy(desc(notification.createdAt), desc(notification.id))
    .limit(opts.limit + 1);

  const hasMore = rows.length > opts.limit;
  const items = hasMore ? rows.slice(0, opts.limit) : rows;
  const nextCursor = hasMore ? items.at(-1)?.id : null;

  return { items, nextCursor, hasMore };
}

export async function upsertNotificationPreference(
  userId: string,
  input: NotificationPreference,
) {
  const parsed = notificationPreferenceSchema.parse(input);

  const [created] = await db
    .insert(notificationPreference)
    .values({
      userId,
      eventType: parsed.eventType,
      inAppEnabled: parsed.inAppEnabled,
      emailEnabled: parsed.emailEnabled,
      pushEnabled: parsed.pushEnabled,
    })
    .onConflictDoUpdate({
      target: [notificationPreference.userId, notificationPreference.eventType],
      set: {
        inAppEnabled: parsed.inAppEnabled,
        emailEnabled: parsed.emailEnabled,
        pushEnabled: parsed.pushEnabled,
        updatedAt: new Date(),
      },
    })
    .returning();

  if (!created) throw new Error("Failed to save notification preference");
  return created;
}

export async function getNotificationPreference(
  userId: string,
  eventType: string,
) {
  return db.query.notificationPreference.findFirst({
    where: and(
      eq(notificationPreference.userId, userId),
      eq(notificationPreference.eventType, eventType),
    ),
  });
}