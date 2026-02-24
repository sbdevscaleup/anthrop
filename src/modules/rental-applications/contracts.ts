import { z } from "zod";

export const createRentalApplicationInputSchema = z.object({
  propertyId: z.string().uuid(),
  payload: z.record(z.string(), z.unknown()).default({}),
  documentUrls: z.array(z.string().url()).default([]),
});

export const rentalApplicationDecisionInputSchema = z.object({
  status: z.enum(["under_review", "approved", "rejected"]),
  note: z.string().max(2000).optional(),
});

export const listRentalApplicationsQuerySchema = z.object({
  propertyId: z.string().uuid().optional(),
  status: z
    .enum(["draft", "submitted", "under_review", "approved", "rejected", "withdrawn"])
    .optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
});

export type CreateRentalApplicationInput = z.infer<
  typeof createRentalApplicationInputSchema
>;
export type RentalApplicationDecisionInput = z.infer<
  typeof rentalApplicationDecisionInputSchema
>;

