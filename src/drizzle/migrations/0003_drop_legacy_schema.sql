-- Rebind legacy user organization references from agency -> organization
DO $$
BEGIN
  ALTER TABLE user_profile DROP CONSTRAINT IF EXISTS user_profile_organization_id_agency_id_fk;
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_organization_id_agency_id_fk;
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE user_profile
    ADD CONSTRAINT user_profile_organization_id_organization_id_fk
    FOREIGN KEY (organization_id) REFERENCES organization(id) ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE user_roles
    ADD CONSTRAINT user_roles_organization_id_organization_id_fk
    FOREIGN KEY (organization_id) REFERENCES organization(id) ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Drop compatibility views created during parallel migration if present.
DROP VIEW IF EXISTS agency_compat_v;
DROP VIEW IF EXISTS agency_member_compat_v;
DROP VIEW IF EXISTS agency_invitation_compat_v;

-- Drop legacy tables (initial-stage clean slate requested).
DROP TABLE IF EXISTS property_inquiries CASCADE;
DROP TABLE IF EXISTS property_favorites CASCADE;
DROP TABLE IF EXISTS properties CASCADE;
DROP TABLE IF EXISTS subdistricts CASCADE;
DROP TABLE IF EXISTS districts CASCADE;
DROP TABLE IF EXISTS aimags CASCADE;
DROP TABLE IF EXISTS agency_invitation CASCADE;
DROP TABLE IF EXISTS agency_member CASCADE;
DROP TABLE IF EXISTS agency CASCADE;
