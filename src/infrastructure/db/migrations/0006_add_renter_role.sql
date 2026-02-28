DO $$
BEGIN
  ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'renter';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
