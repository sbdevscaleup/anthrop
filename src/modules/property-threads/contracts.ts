import { z } from "zod";

export const createThreadInputSchema = z.object({
  propertyId: z.string().uuid(),
  participantUserIds: z.array(z.string()).min(1),
  organizationId: z.string().optional(),
});

export const sendMessageInputSchema = z.object({
  body: z.string().min(1).max(5000),
  messageType: z.enum(["text", "system"]).default("text"),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export const listThreadsQuerySchema = z.object({
  propertyId: z.string().uuid(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type CreateThreadInput = z.infer<typeof createThreadInputSchema>;
export type SendMessageInput = z.infer<typeof sendMessageInputSchema>;

