DO $$
BEGIN
  CREATE TYPE media_access_level AS ENUM ('public', 'private');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE upload_asset_status AS ENUM ('pending', 'uploaded', 'failed', 'attached');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE property_media
  ALTER COLUMN url DROP NOT NULL;

ALTER TABLE property_media
  ADD COLUMN IF NOT EXISTS storage_key text,
  ADD COLUMN IF NOT EXISTS bucket text,
  ADD COLUMN IF NOT EXISTS access_level media_access_level NOT NULL DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS mime_type text,
  ADD COLUMN IF NOT EXISTS bytes bigint,
  ADD COLUMN IF NOT EXISTS checksum text,
  ADD COLUMN IF NOT EXISTS upload_status upload_asset_status NOT NULL DEFAULT 'uploaded';

CREATE UNIQUE INDEX IF NOT EXISTS property_media_storage_key_uidx
  ON property_media (storage_key);

CREATE TABLE IF NOT EXISTS upload_asset (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  property_id uuid REFERENCES property(id) ON DELETE SET NULL,
  bucket text NOT NULL,
  storage_key text NOT NULL,
  access_level media_access_level NOT NULL DEFAULT 'public',
  mime_type text NOT NULL,
  bytes bigint,
  checksum text,
  upload_status upload_asset_status NOT NULL DEFAULT 'pending',
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  init_idempotency_key text,
  complete_idempotency_key text,
  public_url text,
  completed_at timestamp,
  created_at timestamp NOT NULL DEFAULT NOW(),
  updated_at timestamp NOT NULL DEFAULT NOW(),
  deleted_at timestamp
);

CREATE UNIQUE INDEX IF NOT EXISTS upload_asset_storage_key_uidx
  ON upload_asset (storage_key);
CREATE UNIQUE INDEX IF NOT EXISTS upload_asset_user_init_idempotency_uidx
  ON upload_asset (user_id, init_idempotency_key);
CREATE UNIQUE INDEX IF NOT EXISTS upload_asset_user_complete_idempotency_uidx
  ON upload_asset (user_id, complete_idempotency_key);
CREATE INDEX IF NOT EXISTS upload_asset_user_created_idx
  ON upload_asset (user_id, created_at);
CREATE INDEX IF NOT EXISTS upload_asset_status_created_idx
  ON upload_asset (upload_status, created_at);
