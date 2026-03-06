import { z } from "zod";
import {
  leadActivityTypeEnum,
  leadPriorityEnum,
  leadStatusEnum,
} from "@/infrastructure/db/schema";

export const dashboardPersonaSchema = z.enum(["seller", "agent"]);

export const dashboardListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().uuid().optional(),
});

export const updateLeadInputSchema = z
  .object({
    status: z.enum(leadStatusEnum.enumValues).optional(),
    priority: z.enum(leadPriorityEnum.enumValues).optional(),
    assignedUserId: z.string().optional(),
    note: z.string().max(2000).optional(),
  })
  .refine(
    (input) =>
      input.status != null ||
      input.priority != null ||
      input.assignedUserId != null ||
      input.note != null,
    { message: "At least one lead field must be provided" },
  );

export const createLeadActivityInputSchema = z.object({
  type: z.enum(leadActivityTypeEnum.enumValues),
  payload: z.record(z.string(), z.unknown()).default({}),
});

export const setDashboardPersonaInputSchema = z.object({
  persona: dashboardPersonaSchema,
});

export type DashboardPersona = z.infer<typeof dashboardPersonaSchema>;
