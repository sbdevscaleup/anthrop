ALTER TABLE "user"
ADD COLUMN IF NOT EXISTS "phone_number_verified" boolean DEFAULT false NOT NULL;
