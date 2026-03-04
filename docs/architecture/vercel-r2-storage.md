# Vercel + R2 Storage Setup

This project keeps runtime deployment on Vercel and uses Cloudflare R2 for direct media upload.

## Required Environment Variables

Set these in Vercel project env:

- `R2_ENDPOINT` (example: `https://<account-id>.r2.cloudflarestorage.com`)
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET`
- `R2_PRESIGN_TTL_SECONDS` (default `300`)
- `R2_PRIVATE_GET_TTL_SECONDS` (default `120`)
- `R2_ALLOWED_MIME_TYPES` (comma-separated allowlist)
- `R2_MAX_UPLOAD_BYTES` (default `20971520`)
- `R2_PUBLIC_PREFIX` (default `public`)
- `R2_PRIVATE_PREFIX` (default `private`)
- `R2_PUBLIC_BASE_URL` (custom domain/base URL for public objects)
- `NEXT_PUBLIC_R2_PUBLIC_BASE_URL` (same value as `R2_PUBLIC_BASE_URL` for Next image host config)

## R2 CORS

Configure bucket CORS so browser uploads from your web origin can `PUT` using signed URLs:

- Allowed origins: your web app origins.
- Allowed methods: `PUT`, `GET`, `HEAD`.
- Allowed headers: `Content-Type`, `x-amz-*`.
- Expose headers: `ETag`.

## API Endpoints

- `POST /api/uploads/init`
- `POST /api/uploads/complete`
- `POST /api/uploads/access`

`Idempotency-Key` is supported on `init` and `complete`.

## Property Integration

Property create flow can upload media first, then submit uploaded media references with the property payload.

Property media is persisted with compatibility support for legacy `url` while storing canonical R2 metadata.
