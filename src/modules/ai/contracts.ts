import { z } from "zod";

export const assistRequestSchema = z.object({
  consentToken: z.string().min(8),
  prompt: z.string().min(1).max(8000),
  contextScope: z.enum(["property_search", "rental_application", "general"]),
});

export const assistResponseSchema = z.object({
  sessionId: z.string().uuid(),
  interactionId: z.string().uuid(),
  response: z.string(),
  redactionReport: z.object({
    redactionCount: z.number().int().nonnegative(),
    appliedRules: z.array(z.string()),
  }),
});

export type AssistRequest = z.infer<typeof assistRequestSchema>;
export type AssistResponse = z.infer<typeof assistResponseSchema>;
export type RedactionReport = AssistResponse["redactionReport"];

