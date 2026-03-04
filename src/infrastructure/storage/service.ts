import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "@/infrastructure/db/client";
import { uploadAsset } from "@/infrastructure/db/schema";
import type { UploadAccessLevel } from "@/shared/types/uploads";
import {
  createPresignedGetUrl,
  createPresignedPutUrl,
  getR2Config,
  headObject,
} from "./r2-client";
import type {
  UploadAccessInput,
  UploadCompleteInput,
  UploadInitInput,
} from "./contracts";

const DEFAULT_ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "video/mp4",
  "application/pdf",
];

function parseIntWithDefault(raw: string | undefined, fallback: number) {
  const parsed = Number.parseInt(raw ?? "", 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function getAllowedMimeTypes() {
  const configured = process.env.R2_ALLOWED_MIME_TYPES;
  if (!configured) return DEFAULT_ALLOWED_MIME_TYPES;

  const values = configured
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  return values.length > 0 ? values : DEFAULT_ALLOWED_MIME_TYPES;
}

function normalizeMimeType(mimeType: string) {
  return mimeType.toLowerCase().split(";")[0]?.trim() ?? mimeType.toLowerCase();
}

function getMaxUploadBytes() {
  return parseIntWithDefault(process.env.R2_MAX_UPLOAD_BYTES, 20 * 1024 * 1024);
}

function getInitRateLimitMax() {
  return parseIntWithDefault(process.env.R2_INIT_RATE_LIMIT_PER_MINUTE, 30);
}

function getInitRateLimitWindowMs() {
  return parseIntWithDefault(process.env.R2_INIT_RATE_LIMIT_WINDOW_SECONDS, 60) * 1000;
}

function buildPublicUrl(storageKey: string) {
  const baseUrl = process.env.R2_PUBLIC_BASE_URL?.trim();
  if (!baseUrl) return null;

  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(storageKey, normalizedBase).toString();
}

function extensionFromFileName(fileName: string) {
  const dotIndex = fileName.lastIndexOf(".");
  if (dotIndex === -1 || dotIndex === fileName.length - 1) return "bin";
  return fileName.slice(dotIndex + 1).toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
}

function buildStorageKey(input: {
  accessLevel: UploadAccessLevel;
  propertyId?: string;
  fileName: string;
}) {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const ext = extensionFromFileName(input.fileName);
  const publicPrefix = process.env.R2_PUBLIC_PREFIX?.trim() || "public";
  const privatePrefix = process.env.R2_PRIVATE_PREFIX?.trim() || "private";
  const prefix = input.accessLevel === "public" ? publicPrefix : privatePrefix;
  const propertyPathSegment = input.propertyId ?? "pending";

  return `${prefix}/properties/${propertyPathSegment}/${year}/${month}/${randomUUID()}.${ext}`;
}

async function enforceInitRateLimit(userId: string) {
  const threshold = new Date(Date.now() - getInitRateLimitWindowMs());
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(uploadAsset)
    .where(
      and(
        eq(uploadAsset.userId, userId),
        isNull(uploadAsset.deletedAt),
        gt(uploadAsset.createdAt, threshold),
      ),
    );

  if (Number(count) >= getInitRateLimitMax()) {
    throw new Error("UPLOAD_RATE_LIMITED");
  }
}

function toInitResponse(input: {
  id: string;
  bucket: string;
  storageKey: string;
  accessLevel: UploadAccessLevel;
  mimeType: string;
  uploadUrl: string;
  expiresIn: number;
}) {
  return {
    fileId: input.id,
    bucket: input.bucket,
    storageKey: input.storageKey,
    accessLevel: input.accessLevel,
    uploadUrl: input.uploadUrl,
    expiresAt: new Date(Date.now() + input.expiresIn * 1000).toISOString(),
    requiredHeaders: {
      "Content-Type": input.mimeType,
    },
  };
}

function toUploadSummary(asset: typeof uploadAsset.$inferSelect) {
  return {
    fileId: asset.id,
    bucket: asset.bucket,
    storageKey: asset.storageKey,
    accessLevel: asset.accessLevel,
    mimeType: asset.mimeType,
    bytes: asset.bytes,
    checksum: asset.checksum,
    publicUrl: asset.publicUrl,
    uploadStatus: asset.uploadStatus,
    completedAt: asset.completedAt?.toISOString() ?? null,
  };
}

export async function initUploadForUser(
  userId: string,
  input: UploadInitInput,
  idempotencyKey: string | null,
) {
  const normalizedMimeType = normalizeMimeType(input.mimeType);
  const allowedMimeTypes = getAllowedMimeTypes();
  if (!allowedMimeTypes.includes(normalizedMimeType)) {
    throw new Error("UNSUPPORTED_MEDIA_TYPE");
  }

  if (input.bytes != null && input.bytes > getMaxUploadBytes()) {
    throw new Error("UPLOAD_TOO_LARGE");
  }

  if (idempotencyKey) {
    const existing = await db.query.uploadAsset.findFirst({
      where: and(
        eq(uploadAsset.userId, userId),
        eq(uploadAsset.initIdempotencyKey, idempotencyKey),
        isNull(uploadAsset.deletedAt),
      ),
    });

    if (existing) {
      const presigned = await createPresignedPutUrl({
        key: existing.storageKey,
        contentType: existing.mimeType,
      });
      return toInitResponse({
        id: existing.id,
        bucket: existing.bucket,
        storageKey: existing.storageKey,
        accessLevel: existing.accessLevel,
        mimeType: existing.mimeType,
        uploadUrl: presigned.uploadUrl,
        expiresIn: presigned.expiresIn,
      });
    }
  }

  await enforceInitRateLimit(userId);

  const key = buildStorageKey({
    accessLevel: input.accessLevel,
    propertyId: input.propertyId,
    fileName: input.fileName,
  });
  const r2Config = getR2Config();

  const [created] = await db
    .insert(uploadAsset)
    .values({
      userId,
      propertyId: input.propertyId ?? null,
      bucket: r2Config.bucket,
      storageKey: key,
      accessLevel: input.accessLevel,
      mimeType: normalizedMimeType,
      bytes: input.bytes ?? null,
      uploadStatus: "pending",
      initIdempotencyKey: idempotencyKey,
      metadataJson: {
        originalFileName: input.fileName,
      },
    })
    .returning();

  if (!created) {
    throw new Error("FAILED_TO_CREATE_UPLOAD_ASSET");
  }

  const presigned = await createPresignedPutUrl({
    key,
    contentType: normalizedMimeType,
  });

  return toInitResponse({
    id: created.id,
    bucket: created.bucket,
    storageKey: created.storageKey,
    accessLevel: created.accessLevel,
    mimeType: created.mimeType,
    uploadUrl: presigned.uploadUrl,
    expiresIn: presigned.expiresIn,
  });
}

export async function completeUploadForUser(
  userId: string,
  input: UploadCompleteInput,
  idempotencyKey: string | null,
) {
  if (idempotencyKey) {
    const byCompleteKey = await db.query.uploadAsset.findFirst({
      where: and(
        eq(uploadAsset.userId, userId),
        eq(uploadAsset.completeIdempotencyKey, idempotencyKey),
        isNull(uploadAsset.deletedAt),
      ),
    });
    if (byCompleteKey) {
      return toUploadSummary(byCompleteKey);
    }
  }

  const current = await db.query.uploadAsset.findFirst({
    where: and(
      eq(uploadAsset.id, input.fileId),
      eq(uploadAsset.userId, userId),
      isNull(uploadAsset.deletedAt),
    ),
  });

  if (!current) throw new Error("UPLOAD_ASSET_NOT_FOUND");
  if (current.storageKey !== input.storageKey) {
    throw new Error("UPLOAD_STORAGE_KEY_MISMATCH");
  }

  let objectHead: Awaited<ReturnType<typeof headObject>>;
  try {
    objectHead = await headObject({ key: current.storageKey });
  } catch {
    throw new Error("UPLOAD_OBJECT_NOT_FOUND");
  }

  const remoteMimeType = normalizeMimeType(objectHead.contentType ?? "");
  if (remoteMimeType && remoteMimeType !== normalizeMimeType(current.mimeType)) {
    throw new Error("UPLOAD_MIME_MISMATCH");
  }

  if (
    current.bytes != null &&
    objectHead.contentLength != null &&
    Number(current.bytes) !== Number(objectHead.contentLength)
  ) {
    throw new Error("UPLOAD_SIZE_MISMATCH");
  }

  const publicUrl =
    current.accessLevel === "public"
      ? current.publicUrl ?? buildPublicUrl(current.storageKey)
      : null;

  const [saved] = await db
    .update(uploadAsset)
    .set({
      bytes: objectHead.contentLength ?? current.bytes ?? null,
      checksum: input.checksum ?? objectHead.etag ?? current.checksum ?? null,
      uploadStatus: "uploaded",
      completeIdempotencyKey: idempotencyKey,
      publicUrl,
      completedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(uploadAsset.id, current.id))
    .returning();

  if (!saved) throw new Error("FAILED_TO_COMPLETE_UPLOAD");
  return toUploadSummary(saved);
}

export async function createUploadAccessForUser(
  userId: string,
  input: UploadAccessInput,
) {
  const asset = await db.query.uploadAsset.findFirst({
    where: and(
      eq(uploadAsset.id, input.fileId),
      eq(uploadAsset.userId, userId),
      isNull(uploadAsset.deletedAt),
    ),
  });

  if (!asset) throw new Error("UPLOAD_ASSET_NOT_FOUND");
  if (asset.uploadStatus === "pending") throw new Error("UPLOAD_NOT_COMPLETED");

  if (asset.accessLevel === "public") {
    const publicUrl = asset.publicUrl ?? buildPublicUrl(asset.storageKey);
    if (!publicUrl) {
      throw new Error("PUBLIC_URL_NOT_CONFIGURED");
    }
    return {
      fileId: asset.id,
      accessUrl: publicUrl,
      expiresAt: null,
      signed: false,
    };
  }

  const signed = await createPresignedGetUrl({ key: asset.storageKey });
  return {
    fileId: asset.id,
    accessUrl: signed.accessUrl,
    expiresAt: new Date(Date.now() + signed.expiresIn * 1000).toISOString(),
    signed: true,
  };
}
