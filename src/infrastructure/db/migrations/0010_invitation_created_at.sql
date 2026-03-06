ALTER TABLE invitation
  ADD COLUMN IF NOT EXISTS created_at timestamp;

UPDATE invitation
SET created_at = NOW()
WHERE created_at IS NULL;

ALTER TABLE invitation
  ALTER COLUMN created_at SET DEFAULT NOW();

ALTER TABLE invitation
  ALTER COLUMN created_at SET NOT NULL;
