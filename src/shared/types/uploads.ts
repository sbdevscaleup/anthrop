export const uploadAccessLevels = ["public", "private"] as const;
export type UploadAccessLevel = (typeof uploadAccessLevels)[number];

export type UploadInitRequest = {
  fileName: string;
  mimeType: string;
  bytes?: number;
  accessLevel: UploadAccessLevel;
  propertyId?: string;
};

export type UploadInitResponse = {
  fileId: string;
  bucket: string;
  storageKey: string;
  accessLevel: UploadAccessLevel;
  uploadUrl: string;
  expiresAt: string;
  requiredHeaders: Record<string, string>;
};

export type UploadCompleteRequest = {
  fileId: string;
  storageKey: string;
  checksum?: string;
};

export type UploadAccessRequest = {
  fileId: string;
};
