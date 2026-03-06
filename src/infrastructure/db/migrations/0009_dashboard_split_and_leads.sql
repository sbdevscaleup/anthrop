DO $$
BEGIN
  CREATE TYPE dashboard_persona AS ENUM ('renter', 'buyer', 'seller', 'agent');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE session
  ADD COLUMN IF NOT EXISTS active_persona dashboard_persona;

DO $$
BEGIN
  CREATE TYPE lead_source AS ENUM ('inquiry', 'thread', 'rental_application', 'manual');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE lead_status AS ENUM ('new', 'contacted', 'qualified', 'under_review', 'closed_won', 'closed_lost');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE lead_priority AS ENUM ('low', 'medium', 'high', 'urgent');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE lead_activity_type AS ENUM ('note', 'status_changed', 'assignment_changed', 'message_sent', 'application_status_changed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS property_agent_assignment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES property(id) ON DELETE CASCADE,
  organization_id text REFERENCES organization(id) ON DELETE SET NULL,
  agent_user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  assigned_by_user_id text REFERENCES "user"(id) ON DELETE SET NULL,
  assigned_at timestamp NOT NULL DEFAULT NOW(),
  ended_at timestamp,
  reason text
);

CREATE INDEX IF NOT EXISTS property_agent_assignment_property_idx
  ON property_agent_assignment (property_id, ended_at);
CREATE INDEX IF NOT EXISTS property_agent_assignment_agent_active_idx
  ON property_agent_assignment (agent_user_id, ended_at, assigned_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS property_agent_assignment_active_uidx
  ON property_agent_assignment (property_id)
  WHERE ended_at IS NULL;

CREATE TABLE IF NOT EXISTS property_lead (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES property(id) ON DELETE CASCADE,
  organization_id text REFERENCES organization(id) ON DELETE SET NULL,
  source_type lead_source NOT NULL,
  source_id uuid,
  assigned_user_id text REFERENCES "user"(id) ON DELETE SET NULL,
  status lead_status NOT NULL DEFAULT 'new',
  priority lead_priority NOT NULL DEFAULT 'medium',
  first_response_at timestamp,
  last_activity_at timestamp NOT NULL DEFAULT NOW(),
  closed_at timestamp,
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by_user_id text REFERENCES "user"(id) ON DELETE SET NULL,
  created_at timestamp NOT NULL DEFAULT NOW(),
  updated_at timestamp NOT NULL DEFAULT NOW(),
  deleted_at timestamp
);

CREATE INDEX IF NOT EXISTS property_lead_org_status_assignee_activity_idx
  ON property_lead (organization_id, status, assigned_user_id, last_activity_at DESC);
CREATE INDEX IF NOT EXISTS property_lead_property_status_idx
  ON property_lead (property_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS property_lead_source_uidx
  ON property_lead (source_type, source_id)
  WHERE source_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS lead_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES property_lead(id) ON DELETE CASCADE,
  actor_user_id text REFERENCES "user"(id) ON DELETE SET NULL,
  activity_type lead_activity_type NOT NULL,
  payload_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS lead_activity_lead_created_idx
  ON lead_activity (lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS lead_activity_actor_idx
  ON lead_activity (actor_user_id);

ALTER TABLE property_thread
  ADD COLUMN IF NOT EXISTS lead_id uuid;
DO $$
BEGIN
  ALTER TABLE property_thread
    ADD CONSTRAINT property_thread_lead_id_fk
    FOREIGN KEY (lead_id) REFERENCES property_lead(id) ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE rental_application
  ADD COLUMN IF NOT EXISTS lead_id uuid,
  ADD COLUMN IF NOT EXISTS assigned_reviewer_user_id text,
  ADD COLUMN IF NOT EXISTS decision_note text;
DO $$
BEGIN
  ALTER TABLE rental_application
    ADD CONSTRAINT rental_application_lead_id_fk
    FOREIGN KEY (lead_id) REFERENCES property_lead(id) ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE rental_application
    ADD CONSTRAINT rental_application_assigned_reviewer_user_id_fk
    FOREIGN KEY (assigned_reviewer_user_id) REFERENCES "user"(id) ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS rental_application_assigned_status_created_idx
  ON rental_application (assigned_reviewer_user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS property_thread_org_last_message_idx
  ON property_thread (organization_id, last_message_at DESC);

WITH latest_profile AS (
  SELECT DISTINCT ON (user_id) user_id, metadata
  FROM user_profile
  ORDER BY user_id, created_at DESC
)
UPDATE session s
SET active_persona = CASE
  WHEN lp.metadata IS NOT NULL
    AND (lp.metadata->>'lastIntendedRole') IN ('renter', 'buyer', 'seller', 'agent')
    THEN (lp.metadata->>'lastIntendedRole')::dashboard_persona
  WHEN ur.primary_role::text IN ('renter', 'buyer', 'seller', 'agent')
    THEN ur.primary_role::text::dashboard_persona
  ELSE NULL
END
FROM "user" u
LEFT JOIN latest_profile lp ON lp.user_id = u.id
LEFT JOIN user_role ur ON ur.user_id = u.id
WHERE s.user_id = u.id
  AND s.active_persona IS NULL;

INSERT INTO property_agent_assignment (
  id,
  property_id,
  organization_id,
  agent_user_id,
  assigned_by_user_id,
  assigned_at,
  reason
)
SELECT
  gen_random_uuid(),
  p.id,
  p.organization_id,
  p.agent_user_id,
  p.owner_user_id,
  COALESCE(p.updated_at, p.created_at, NOW()),
  'backfill_from_property_agent_user_id'
FROM property p
WHERE p.agent_user_id IS NOT NULL
  AND p.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM property_agent_assignment paa
    WHERE paa.property_id = p.id
      AND paa.ended_at IS NULL
  );

INSERT INTO property_lead (
  id,
  property_id,
  organization_id,
  source_type,
  source_id,
  assigned_user_id,
  status,
  priority,
  last_activity_at,
  metadata_json,
  created_by_user_id,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid(),
  pi.property_id,
  p.organization_id,
  'inquiry'::lead_source,
  pi.id,
  COALESCE(p.agent_user_id, p.owner_user_id),
  CASE
    WHEN pi.status::text = 'contacted' THEN 'contacted'::lead_status
    WHEN pi.status::text = 'scheduled' THEN 'qualified'::lead_status
    WHEN pi.status::text = 'closed' THEN 'closed_won'::lead_status
    ELSE 'new'::lead_status
  END,
  'medium'::lead_priority,
  COALESCE(pi.created_at, NOW()),
  jsonb_build_object('backfill', true, 'source', 'property_inquiry'),
  pi.inquirer_user_id,
  COALESCE(pi.created_at, NOW()),
  COALESCE(pi.created_at, NOW())
FROM property_inquiry pi
INNER JOIN property p ON p.id = pi.property_id
WHERE pi.deleted_at IS NULL
  AND p.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM property_lead pl
    WHERE pl.source_type = 'inquiry'
      AND pl.source_id = pi.id
  );

INSERT INTO property_lead (
  id,
  property_id,
  organization_id,
  source_type,
  source_id,
  assigned_user_id,
  status,
  priority,
  last_activity_at,
  metadata_json,
  created_by_user_id,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid(),
  ra.property_id,
  p.organization_id,
  'rental_application'::lead_source,
  ra.id,
  COALESCE(p.agent_user_id, p.owner_user_id),
  CASE
    WHEN ra.status::text = 'under_review' THEN 'under_review'::lead_status
    WHEN ra.status::text = 'approved' THEN 'closed_won'::lead_status
    WHEN ra.status::text = 'rejected' THEN 'closed_lost'::lead_status
    ELSE 'new'::lead_status
  END,
  'medium'::lead_priority,
  COALESCE(ra.decided_at, ra.submitted_at, ra.created_at, NOW()),
  jsonb_build_object('backfill', true, 'source', 'rental_application'),
  ra.applicant_user_id,
  COALESCE(ra.created_at, NOW()),
  COALESCE(ra.updated_at, ra.created_at, NOW())
FROM rental_application ra
INNER JOIN property p ON p.id = ra.property_id
WHERE ra.deleted_at IS NULL
  AND p.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM property_lead pl
    WHERE pl.source_type = 'rental_application'
      AND pl.source_id = ra.id
  );

INSERT INTO property_lead (
  id,
  property_id,
  organization_id,
  source_type,
  source_id,
  assigned_user_id,
  status,
  priority,
  last_activity_at,
  metadata_json,
  created_by_user_id,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid(),
  pt.property_id,
  p.organization_id,
  'thread'::lead_source,
  pt.id,
  COALESCE(p.agent_user_id, p.owner_user_id),
  'contacted'::lead_status,
  'medium'::lead_priority,
  COALESCE(pt.last_message_at, pt.created_at, NOW()),
  jsonb_build_object('backfill', true, 'source', 'property_thread'),
  pt.created_by_user_id,
  COALESCE(pt.created_at, NOW()),
  COALESCE(pt.last_message_at, pt.created_at, NOW())
FROM property_thread pt
INNER JOIN property p ON p.id = pt.property_id
WHERE pt.archived_at IS NULL
  AND p.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM property_lead pl
    WHERE pl.source_type = 'thread'
      AND pl.source_id = pt.id
  );

UPDATE rental_application ra
SET lead_id = pl.id
FROM property_lead pl
WHERE ra.lead_id IS NULL
  AND pl.source_type = 'rental_application'
  AND pl.source_id = ra.id;

UPDATE property_thread pt
SET lead_id = pl.id
FROM property_lead pl
WHERE pt.lead_id IS NULL
  AND pl.source_type = 'thread'
  AND pl.source_id = pt.id;
