import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

type R2Config = {
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  putTtlSeconds: number;
  getTtlSeconds: number;
};

function parseIntWithDefault(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

export function getR2Config(): R2Config {
  const endpoint = process.env.R2_ENDPOINT;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;

  if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) {
    throw new Error("R2_NOT_CONFIGURED");
  }

  return {
    endpoint,
    accessKeyId,
    secretAccessKey,
    bucket,
    putTtlSeconds: parseIntWithDefault(process.env.R2_PRESIGN_TTL_SECONDS, 300),
    getTtlSeconds: parseIntWithDefault(process.env.R2_PRIVATE_GET_TTL_SECONDS, 120),
  };
}

function createClient(config: R2Config) {
  return new S3Client({
    endpoint: config.endpoint,
    region: "auto",
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}

export async function createPresignedPutUrl(input: {
  key: string;
  contentType: string;
}) {
  const config = getR2Config();
  const client = createClient(config);
  const command = new PutObjectCommand({
    Bucket: config.bucket,
    Key: input.key,
    ContentType: input.contentType,
  });

  const uploadUrl = await getSignedUrl(client, command, {
    expiresIn: config.putTtlSeconds,
  });

  return {
    uploadUrl,
    bucket: config.bucket,
    expiresIn: config.putTtlSeconds,
  };
}

export async function createPresignedGetUrl(input: { key: string }) {
  const config = getR2Config();
  const client = createClient(config);
  const command = new GetObjectCommand({
    Bucket: config.bucket,
    Key: input.key,
  });

  const accessUrl = await getSignedUrl(client, command, {
    expiresIn: config.getTtlSeconds,
  });

  return {
    accessUrl,
    expiresIn: config.getTtlSeconds,
  };
}

export async function headObject(input: { key: string }) {
  const config = getR2Config();
  const client = createClient(config);
  const response = await client.send(
    new HeadObjectCommand({
      Bucket: config.bucket,
      Key: input.key,
    }),
  );

  return {
    contentType: response.ContentType ?? null,
    contentLength:
      response.ContentLength == null ? null : Number(response.ContentLength),
    etag: response.ETag?.replaceAll('"', "") ?? null,
    lastModified: response.LastModified ?? null,
  };
}

export async function deleteObject(input: { key: string }) {
  const config = getR2Config();
  const client = createClient(config);
  await client.send(
    new DeleteObjectCommand({
      Bucket: config.bucket,
      Key: input.key,
    }),
  );
}
