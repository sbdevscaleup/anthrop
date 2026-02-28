DO $$
BEGIN
  CREATE TYPE outbox_status AS ENUM ('pending', 'processing', 'completed', 'failed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE notification_channel AS ENUM ('in_app', 'email', 'push');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE rental_application_status AS ENUM ('draft', 'submitted', 'under_review', 'approved', 'rejected', 'withdrawn');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE thread_participant_role AS ENUM ('owner', 'agent', 'inquirer', 'admin');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE thread_message_type AS ENUM ('text', 'system');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS domain_event (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  aggregate_type text NOT NULL,
  aggregate_id uuid NOT NULL,
  payload_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamp NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS domain_event_aggregate_idx
  ON domain_event (aggregate_type, aggregate_id);
CREATE INDEX IF NOT EXISTS domain_event_occurred_at_idx
  ON domain_event (occurred_at);

CREATE TABLE IF NOT EXISTS event_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES domain_event(id) ON DELETE CASCADE,
  channel notification_channel NOT NULL,
  status outbox_status NOT NULL DEFAULT 'pending',
  attempt_count integer NOT NULL DEFAULT 0,
  next_attempt_at timestamp,
  last_error text,
  created_at timestamp NOT NULL DEFAULT NOW(),
  updated_at timestamp NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS event_outbox_status_idx
  ON event_outbox (status);
CREATE INDEX IF NOT EXISTS event_outbox_next_attempt_idx
  ON event_outbox (next_attempt_at);
CREATE INDEX IF NOT EXISTS event_outbox_event_id_idx
  ON event_outbox (event_id);

CREATE TABLE IF NOT EXISTS notification (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  organization_id text REFERENCES organization(id) ON DELETE SET NULL,
  type text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  data_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamp,
  created_at timestamp NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS notification_user_read_idx
  ON notification (user_id, read_at);
CREATE INDEX IF NOT EXISTS notification_created_at_idx
  ON notification (created_at DESC);

CREATE TABLE IF NOT EXISTS notification_preference (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  in_app_enabled boolean NOT NULL DEFAULT true,
  email_enabled boolean NOT NULL DEFAULT true,
  push_enabled boolean NOT NULL DEFAULT false,
  created_at timestamp NOT NULL DEFAULT NOW(),
  updated_at timestamp NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS notification_preference_user_event_uidx
  ON notification_preference (user_id, event_type);

CREATE TABLE IF NOT EXISTS rental_application (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES property(id) ON DELETE CASCADE,
  applicant_user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  status rental_application_status NOT NULL DEFAULT 'draft',
  submitted_at timestamp,
  decided_at timestamp,
  decided_by_user_id text REFERENCES "user"(id) ON DELETE SET NULL,
  deleted_at timestamp,
  created_at timestamp NOT NULL DEFAULT NOW(),
  updated_at timestamp NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS rental_application_property_status_idx
  ON rental_application (property_id, status);
CREATE INDEX IF NOT EXISTS rental_application_applicant_idx
  ON rental_application (applicant_user_id);
CREATE INDEX IF NOT EXISTS rental_application_decided_by_idx
  ON rental_application (decided_by_user_id);
CREATE UNIQUE INDEX IF NOT EXISTS rental_application_active_unique_idx
  ON rental_application (property_id, applicant_user_id)
  WHERE deleted_at IS NULL
    AND status IN ('draft', 'submitted', 'under_review');

CREATE TABLE IF NOT EXISTS rental_application_snapshot (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rental_application_id uuid NOT NULL REFERENCES rental_application(id) ON DELETE CASCADE,
  submitted_payload_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS rental_application_snapshot_app_idx
  ON rental_application_snapshot (rental_application_id);

CREATE TABLE IF NOT EXISTS rental_application_document (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rental_application_id uuid NOT NULL REFERENCES rental_application(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp NOT NULL DEFAULT NOW(),
  deleted_at timestamp
);

CREATE INDEX IF NOT EXISTS rental_application_document_app_idx
  ON rental_application_document (rental_application_id);

CREATE TABLE IF NOT EXISTS property_thread (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES property(id) ON DELETE CASCADE,
  created_by_user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  organization_id text REFERENCES organization(id) ON DELETE SET NULL,
  last_message_at timestamp,
  archived_at timestamp,
  created_at timestamp NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS property_thread_property_idx
  ON property_thread (property_id);
CREATE INDEX IF NOT EXISTS property_thread_last_message_idx
  ON property_thread (last_message_at DESC);

CREATE TABLE IF NOT EXISTS thread_participant (
  thread_id uuid NOT NULL REFERENCES property_thread(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  role thread_participant_role NOT NULL DEFAULT 'inquirer',
  joined_at timestamp NOT NULL DEFAULT NOW(),
  left_at timestamp,
  PRIMARY KEY (thread_id, user_id)
);

CREATE INDEX IF NOT EXISTS thread_participant_user_idx
  ON thread_participant (user_id);

CREATE TABLE IF NOT EXISTS thread_message (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES property_thread(id) ON DELETE CASCADE,
  sender_user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  message_type thread_message_type NOT NULL DEFAULT 'text',
  body text NOT NULL,
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp NOT NULL DEFAULT NOW(),
  deleted_at timestamp
);

CREATE INDEX IF NOT EXISTS thread_message_thread_created_idx
  ON thread_message (thread_id, created_at);

CREATE TABLE IF NOT EXISTS message_read_state (
  thread_id uuid NOT NULL REFERENCES property_thread(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  last_read_message_id uuid REFERENCES thread_message(id) ON DELETE SET NULL,
  last_read_at timestamp,
  PRIMARY KEY (thread_id, user_id)
);

CREATE INDEX IF NOT EXISTS message_read_state_user_idx
  ON message_read_state (user_id);

CREATE TABLE IF NOT EXISTS ai_session (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  organization_id text REFERENCES organization(id) ON DELETE SET NULL,
  consent_granted_at timestamp NOT NULL,
  context_scope text NOT NULL,
  created_at timestamp NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ai_session_user_idx
  ON ai_session (user_id);
CREATE INDEX IF NOT EXISTS ai_session_org_idx
  ON ai_session (organization_id);

CREATE TABLE IF NOT EXISTS ai_interaction (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES ai_session(id) ON DELETE CASCADE,
  prompt_redacted text NOT NULL,
  response_redacted text NOT NULL,
  model text NOT NULL,
  token_usage_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  latency_ms integer NOT NULL,
  created_at timestamp NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ai_interaction_session_idx
  ON ai_interaction (session_id);

CREATE TABLE IF NOT EXISTS ai_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  interaction_id uuid NOT NULL REFERENCES ai_interaction(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  rating integer NOT NULL,
  feedback_text text,
  created_at timestamp NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ai_feedback_interaction_idx
  ON ai_feedback (interaction_id);

CREATE TABLE IF NOT EXISTS ai_redaction_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  interaction_id uuid NOT NULL REFERENCES ai_interaction(id) ON DELETE CASCADE,
  redaction_report_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ai_redaction_audit_interaction_idx
  ON ai_redaction_audit (interaction_id);
