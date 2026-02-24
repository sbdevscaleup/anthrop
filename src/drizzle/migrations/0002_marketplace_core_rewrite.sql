CREATE EXTENSION IF NOT EXISTS postgis;

DO $$
BEGIN
  CREATE TYPE admin_l1_type AS ENUM ('province', 'capital_city');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE admin_l2_type AS ENUM ('district', 'soum');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE admin_l3_type AS ENUM ('khoroo', 'bag');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE property_workflow_status AS ENUM ('draft', 'published', 'closed', 'archived');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE property_publish_state AS ENUM ('private', 'public');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE property_location_source AS ENUM ('pin', 'manual');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE property_location_precision AS ENUM ('point', 'l2', 'l3');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE property_media_type AS ENUM ('image', 'video', 'document');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS admin_l1 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  name_mn text NOT NULL,
  name_en text,
  level_type admin_l1_type NOT NULL,
  geom geometry(MultiPolygon, 4326) NOT NULL,
  geom_simplified geometry(MultiPolygon, 4326) NOT NULL,
  bbox geometry(Polygon, 4326) NOT NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),
  deleted_at timestamp
);

CREATE UNIQUE INDEX IF NOT EXISTS admin_l1_code_unique ON admin_l1(code);
CREATE INDEX IF NOT EXISTS admin_l1_level_type_idx ON admin_l1(level_type);
CREATE INDEX IF NOT EXISTS admin_l1_geom_gix ON admin_l1 USING GIST(geom);
CREATE INDEX IF NOT EXISTS admin_l1_geom_simplified_gix ON admin_l1 USING GIST(geom_simplified);

CREATE TABLE IF NOT EXISTS admin_l2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  l1_id uuid NOT NULL REFERENCES admin_l1(id) ON DELETE CASCADE,
  code text NOT NULL,
  name_mn text NOT NULL,
  name_en text,
  level_type admin_l2_type NOT NULL,
  geom geometry(MultiPolygon, 4326) NOT NULL,
  geom_simplified geometry(MultiPolygon, 4326) NOT NULL,
  bbox geometry(Polygon, 4326) NOT NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),
  deleted_at timestamp
);

CREATE UNIQUE INDEX IF NOT EXISTS admin_l2_parent_code_unique ON admin_l2(l1_id, code);
CREATE INDEX IF NOT EXISTS admin_l2_level_type_idx ON admin_l2(level_type);
CREATE INDEX IF NOT EXISTS admin_l2_l1_id_idx ON admin_l2(l1_id);
CREATE INDEX IF NOT EXISTS admin_l2_geom_gix ON admin_l2 USING GIST(geom);
CREATE INDEX IF NOT EXISTS admin_l2_geom_simplified_gix ON admin_l2 USING GIST(geom_simplified);

CREATE TABLE IF NOT EXISTS admin_l3 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  l2_id uuid NOT NULL REFERENCES admin_l2(id) ON DELETE CASCADE,
  code text NOT NULL,
  name_mn text NOT NULL,
  name_en text,
  level_type admin_l3_type NOT NULL,
  geom geometry(MultiPolygon, 4326) NOT NULL,
  geom_simplified geometry(MultiPolygon, 4326) NOT NULL,
  bbox geometry(Polygon, 4326) NOT NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),
  deleted_at timestamp
);

CREATE UNIQUE INDEX IF NOT EXISTS admin_l3_parent_code_unique ON admin_l3(l2_id, code);
CREATE INDEX IF NOT EXISTS admin_l3_level_type_idx ON admin_l3(level_type);
CREATE INDEX IF NOT EXISTS admin_l3_l2_id_idx ON admin_l3(l2_id);
CREATE INDEX IF NOT EXISTS admin_l3_geom_gix ON admin_l3 USING GIST(geom);
CREATE INDEX IF NOT EXISTS admin_l3_geom_simplified_gix ON admin_l3 USING GIST(geom_simplified);

CREATE TABLE IF NOT EXISTS boundary_dataset_version (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version text NOT NULL UNIQUE,
  checksum text NOT NULL,
  source_meta_json text,
  imported_at timestamp NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS boundary_dataset_version_imported_at_idx
  ON boundary_dataset_version(imported_at);

ALTER TABLE user_profile
  ADD COLUMN IF NOT EXISTS deleted_at timestamp;

CREATE TABLE IF NOT EXISTS user_role_assignment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  organization_id text REFERENCES organization(id) ON DELETE SET NULL,
  role "UserRole" NOT NULL,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamp NOT NULL DEFAULT now(),
  deleted_at timestamp
);

CREATE INDEX IF NOT EXISTS user_role_assignment_user_idx ON user_role_assignment(user_id);
CREATE INDEX IF NOT EXISTS user_role_assignment_org_idx ON user_role_assignment(organization_id);

CREATE TABLE IF NOT EXISTS property (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id text NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
  organization_id text REFERENCES organization(id) ON DELETE SET NULL,
  agent_user_id text REFERENCES "user"(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  property_type "PropertyType" NOT NULL,
  listing_type "ListingType" NOT NULL,
  workflow_status property_workflow_status NOT NULL DEFAULT 'draft',
  publish_state property_publish_state NOT NULL DEFAULT 'private',
  price_minor bigint,
  currency_code text DEFAULT 'MNT',
  area_m2 numeric(12,2),
  bedrooms integer,
  bathrooms integer,
  floors integer,
  year_built integer,
  location_source property_location_source NOT NULL DEFAULT 'manual',
  location_precision property_location_precision NOT NULL DEFAULT 'l2',
  location_point geography(Point, 4326),
  l1_id uuid REFERENCES admin_l1(id) ON DELETE SET NULL,
  l2_id uuid REFERENCES admin_l2(id) ON DELETE SET NULL,
  l3_id uuid REFERENCES admin_l3(id) ON DELETE SET NULL,
  address_text text,
  features_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  view_count integer NOT NULL DEFAULT 0,
  favorite_count integer NOT NULL DEFAULT 0,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),
  published_at timestamp,
  closed_at timestamp,
  deleted_at timestamp
);

CREATE INDEX IF NOT EXISTS property_location_point_gix ON property USING GIST(location_point);
CREATE INDEX IF NOT EXISTS property_l1_id_idx ON property(l1_id);
CREATE INDEX IF NOT EXISTS property_l2_id_idx ON property(l2_id);
CREATE INDEX IF NOT EXISTS property_l3_id_idx ON property(l3_id);
CREATE INDEX IF NOT EXISTS property_workflow_status_idx ON property(workflow_status);
CREATE INDEX IF NOT EXISTS property_listing_type_idx ON property(listing_type);
CREATE INDEX IF NOT EXISTS property_price_minor_idx ON property(price_minor);
CREATE INDEX IF NOT EXISTS property_l2_status_listing_idx ON property(l2_id, workflow_status, listing_type);
CREATE INDEX IF NOT EXISTS property_l3_status_listing_idx ON property(l3_id, workflow_status, listing_type);

CREATE TABLE IF NOT EXISTS property_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES property(id) ON DELETE CASCADE,
  url text NOT NULL,
  media_type property_media_type NOT NULL DEFAULT 'image',
  sort_order integer NOT NULL DEFAULT 0,
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp NOT NULL DEFAULT now(),
  deleted_at timestamp
);

CREATE INDEX IF NOT EXISTS property_media_property_id_idx ON property_media(property_id);
CREATE INDEX IF NOT EXISTS property_media_sort_order_idx ON property_media(sort_order);

CREATE TABLE IF NOT EXISTS property_favorite (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES property(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  created_at timestamp NOT NULL DEFAULT now(),
  deleted_at timestamp
);

CREATE INDEX IF NOT EXISTS property_favorite_property_id_idx ON property_favorite(property_id);
CREATE INDEX IF NOT EXISTS property_favorite_user_id_idx ON property_favorite(user_id);

CREATE TABLE IF NOT EXISTS property_inquiry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES property(id) ON DELETE CASCADE,
  inquirer_user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  message text,
  contact_email text,
  status "InquiryStatus" NOT NULL DEFAULT 'new',
  created_at timestamp NOT NULL DEFAULT now(),
  deleted_at timestamp
);

CREATE INDEX IF NOT EXISTS property_inquiry_property_id_idx ON property_inquiry(property_id);
CREATE INDEX IF NOT EXISTS property_inquiry_user_id_idx ON property_inquiry(inquirer_user_id);
CREATE INDEX IF NOT EXISTS property_inquiry_status_idx ON property_inquiry(status);

CREATE TABLE IF NOT EXISTS entity_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  action text NOT NULL,
  actor_user_id text REFERENCES "user"(id) ON DELETE SET NULL,
  before_json jsonb,
  after_json jsonb,
  request_id text,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS entity_audit_log_entity_idx ON entity_audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS entity_audit_log_actor_idx ON entity_audit_log(actor_user_id);
CREATE INDEX IF NOT EXISTS entity_audit_log_created_at_idx ON entity_audit_log(created_at);

-- Compatibility read views from better-auth organization tables.
-- Old agency tables still exist during parallel migration; new code can opt into these views.
CREATE OR REPLACE VIEW agency_compat_v AS
SELECT
  organization.id,
  organization.name,
  organization.slug,
  organization.logo,
  NULL::text AS phone,
  NULL::text AS email,
  NULL::text AS address,
  NULL::text AS website,
  NULL::text AS license_number,
  '{}'::jsonb AS metadata,
  organization.created_at
FROM organization;

CREATE OR REPLACE VIEW agency_member_compat_v AS
SELECT
  gen_random_uuid() AS id,
  member.organization_id,
  member.user_id,
  member.role,
  member.created_at
FROM member;

CREATE OR REPLACE VIEW agency_invitation_compat_v AS
SELECT
  gen_random_uuid() AS id,
  invitation.organization_id,
  invitation.email,
  COALESCE(invitation.role, 'member') AS role,
  invitation.status,
  invitation.expires_at,
  invitation.inviter_id
FROM invitation;
