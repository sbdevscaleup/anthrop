import { z } from "zod";

export const notificationEventSchema = z.object({
  userId: z.string(),
  organizationId: z.string().optional(),
  type: z.string().min(1),
  title: z.string().min(1),
  body: z.string().min(1),
  data: z.record(z.string(), z.unknown()).optional(),
});

export const notificationDeliveryRequestSchema = z.object({
  eventType: z.string().min(1),
  channels: z.array(z.enum(["in_app", "email", "push"])).min(1),
});

export const notificationPreferenceSchema = z.object({
  eventType: z.string().min(1),
  inAppEnabled: z.boolean().default(true),
  emailEnabled: z.boolean().default(true),
  pushEnabled: z.boolean().default(false),
});

export const getNotificationsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
});

export type NotificationEvent = z.infer<typeof notificationEventSchema>;
export type NotificationDeliveryRequest = z.infer<
  typeof notificationDeliveryRequestSchema
>;
export type NotificationPreference = z.infer<typeof notificationPreferenceSchema>;

