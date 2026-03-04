import { z } from "zod";
import { uploadAccessLevels } from "@/shared/types/uploads";

export const uploadInitRequestSchema = z.object({
  fileName: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(255),
  bytes: z.number().int().positive().max(1024 * 1024 * 200).optional(),
  accessLevel: z.enum(uploadAccessLevels),
  propertyId: z.string().uuid().optional(),
});

export const uploadCompleteRequestSchema = z.object({
  fileId: z.string().uuid(),
  storageKey: z.string().min(1),
  checksum: z.string().min(1).max(255).optional(),
});

export const uploadAccessRequestSchema = z.object({
  fileId: z.string().uuid(),
});

export type UploadInitInput = z.infer<typeof uploadInitRequestSchema>;
export type UploadCompleteInput = z.infer<typeof uploadCompleteRequestSchema>;
export type UploadAccessInput = z.infer<typeof uploadAccessRequestSchema>;
