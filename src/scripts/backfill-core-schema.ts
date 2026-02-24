import { sql } from "drizzle-orm";
import { db } from "../drizzle/db";

async function backfillAdminHierarchy() {
  await db.execute(sql`
    INSERT INTO admin_l1 (
      id, code, name_mn, name_en, level_type, geom, geom_simplified, bbox, created_at, updated_at, deleted_at
    )
    SELECT
      a.id,
      a.code,
      a.name,
      NULL,
      CASE WHEN a.is_capital THEN 'capital_city'::admin_l1_type ELSE 'province'::admin_l1_type END,
      ST_GeomFromText('MULTIPOLYGON EMPTY', 4326),
      ST_GeomFromText('MULTIPOLYGON EMPTY', 4326),
      ST_GeomFromText('POLYGON EMPTY', 4326),
      COALESCE(a.created_at, NOW()),
      COALESCE(a.updated_at, NOW()),
      NULL
    FROM aimags a
    ON CONFLICT (id) DO UPDATE SET
      code = EXCLUDED.code,
      name_mn = EXCLUDED.name_mn,
      level_type = EXCLUDED.level_type,
      updated_at = EXCLUDED.updated_at,
      deleted_at = NULL
  `);

  await db.execute(sql`
    INSERT INTO admin_l2 (
      id, l1_id, code, name_mn, name_en, level_type, geom, geom_simplified, bbox, created_at, updated_at, deleted_at
    )
    SELECT
      d.id,
      d.aimag_id,
      d.code,
      d.name,
      NULL,
      CASE WHEN a.is_capital THEN 'district'::admin_l2_type ELSE 'soum'::admin_l2_type END,
      ST_GeomFromText('MULTIPOLYGON EMPTY', 4326),
      ST_GeomFromText('MULTIPOLYGON EMPTY', 4326),
      ST_GeomFromText('POLYGON EMPTY', 4326),
      COALESCE(d.created_at, NOW()),
      COALESCE(d.updated_at, NOW()),
      NULL
    FROM districts d
    JOIN aimags a ON a.id = d.aimag_id
    ON CONFLICT (id) DO UPDATE SET
      l1_id = EXCLUDED.l1_id,
      code = EXCLUDED.code,
      name_mn = EXCLUDED.name_mn,
      level_type = EXCLUDED.level_type,
      updated_at = EXCLUDED.updated_at,
      deleted_at = NULL
  `);

  await db.execute(sql`
    INSERT INTO admin_l3 (
      id, l2_id, code, name_mn, name_en, level_type, geom, geom_simplified, bbox, created_at, updated_at, deleted_at
    )
    SELECT
      s.id,
      s.district_id,
      s.code,
      s.name,
      NULL,
      CASE WHEN a.is_capital THEN 'khoroo'::admin_l3_type ELSE 'bag'::admin_l3_type END,
      ST_GeomFromText('MULTIPOLYGON EMPTY', 4326),
      ST_GeomFromText('MULTIPOLYGON EMPTY', 4326),
      ST_GeomFromText('POLYGON EMPTY', 4326),
      COALESCE(s.created_at, NOW()),
      COALESCE(s.updated_at, NOW()),
      NULL
    FROM subdistricts s
    JOIN districts d ON d.id = s.district_id
    JOIN aimags a ON a.id = d.aimag_id
    ON CONFLICT (id) DO UPDATE SET
      l2_id = EXCLUDED.l2_id,
      code = EXCLUDED.code,
      name_mn = EXCLUDED.name_mn,
      level_type = EXCLUDED.level_type,
      updated_at = EXCLUDED.updated_at,
      deleted_at = NULL
  `);
}

async function backfillProperties() {
  await db.execute(sql`
    INSERT INTO property (
      id,
      owner_user_id,
      organization_id,
      agent_user_id,
      title,
      description,
      property_type,
      listing_type,
      workflow_status,
      publish_state,
      price_minor,
      currency_code,
      area_m2,
      bedrooms,
      bathrooms,
      floors,
      year_built,
      location_source,
      location_precision,
      location_point,
      l1_id,
      l2_id,
      l3_id,
      address_text,
      features_json,
      view_count,
      favorite_count,
      created_at,
      updated_at,
      published_at,
      closed_at,
      deleted_at
    )
    SELECT
      p.id,
      p.owner_id,
      CASE
        WHEN EXISTS (SELECT 1 FROM organization o WHERE o.id = p.organization_id) THEN p.organization_id
        ELSE NULL
      END,
      p.agent_id,
      p.title,
      p.description,
      p.property_type,
      p.listing_type,
      CASE
        WHEN p.status = 'draft' THEN 'draft'::property_workflow_status
        WHEN p.status = 'active' THEN 'published'::property_workflow_status
        WHEN p.status IN ('sold', 'rented', 'expired') THEN 'closed'::property_workflow_status
        ELSE 'archived'::property_workflow_status
      END,
      CASE
        WHEN p.status IN ('active', 'sold', 'rented') THEN 'public'::property_publish_state
        ELSE 'private'::property_publish_state
      END,
      p.price,
      'MNT',
      p.area,
      p.bedrooms,
      p.bathrooms,
      p.floors,
      p.year_built,
      'manual'::property_location_source,
      CASE
        WHEN p.subdistrict_id IS NOT NULL THEN 'l3'::property_location_precision
        ELSE 'l2'::property_location_precision
      END,
      NULL,
      p.aimag_id,
      p.district_id,
      p.subdistrict_id,
      NULL,
      COALESCE(p.features, '{}'::jsonb),
      COALESCE(p.view_count, 0),
      COALESCE(p.favorite_count, 0),
      p.created_at,
      p.updated_at,
      p.published_at,
      CASE
        WHEN p.status IN ('sold', 'rented', 'expired') THEN COALESCE(p.updated_at, p.created_at)
        ELSE NULL
      END,
      NULL
    FROM properties p
    ON CONFLICT (id) DO UPDATE SET
      owner_user_id = EXCLUDED.owner_user_id,
      organization_id = EXCLUDED.organization_id,
      agent_user_id = EXCLUDED.agent_user_id,
      title = EXCLUDED.title,
      description = EXCLUDED.description,
      property_type = EXCLUDED.property_type,
      listing_type = EXCLUDED.listing_type,
      workflow_status = EXCLUDED.workflow_status,
      publish_state = EXCLUDED.publish_state,
      price_minor = EXCLUDED.price_minor,
      currency_code = EXCLUDED.currency_code,
      area_m2 = EXCLUDED.area_m2,
      bedrooms = EXCLUDED.bedrooms,
      bathrooms = EXCLUDED.bathrooms,
      floors = EXCLUDED.floors,
      year_built = EXCLUDED.year_built,
      location_source = EXCLUDED.location_source,
      location_precision = EXCLUDED.location_precision,
      l1_id = EXCLUDED.l1_id,
      l2_id = EXCLUDED.l2_id,
      l3_id = EXCLUDED.l3_id,
      features_json = EXCLUDED.features_json,
      view_count = EXCLUDED.view_count,
      favorite_count = EXCLUDED.favorite_count,
      updated_at = EXCLUDED.updated_at,
      published_at = EXCLUDED.published_at,
      closed_at = EXCLUDED.closed_at
  `);

  await db.execute(sql`
    DELETE FROM property_media pm
    USING properties p
    WHERE pm.property_id = p.id
  `);

  await db.execute(sql`
    INSERT INTO property_media (
      property_id,
      url,
      media_type,
      sort_order,
      metadata_json,
      created_at,
      deleted_at
    )
    SELECT
      p.id,
      img.url,
      'image'::property_media_type,
      img.ordinality - 1,
      '{}'::jsonb,
      COALESCE(p.created_at, NOW()),
      NULL
    FROM properties p
    CROSS JOIN LATERAL jsonb_array_elements_text(COALESCE(p.images, '[]'::jsonb)) WITH ORDINALITY AS img(url, ordinality)
    WHERE img.url <> ''
  `);

  await db.execute(sql`
    INSERT INTO property_favorite (id, property_id, user_id, created_at, deleted_at)
    SELECT
      pf.id,
      pf.property_id,
      pf.user_id,
      pf.created_at,
      NULL
    FROM property_favorites pf
    WHERE EXISTS (SELECT 1 FROM property np WHERE np.id = pf.property_id)
    ON CONFLICT (id) DO UPDATE SET
      property_id = EXCLUDED.property_id,
      user_id = EXCLUDED.user_id,
      created_at = EXCLUDED.created_at,
      deleted_at = NULL
  `);

  await db.execute(sql`
    INSERT INTO property_inquiry (
      id,
      property_id,
      inquirer_user_id,
      message,
      contact_email,
      status,
      created_at,
      deleted_at
    )
    SELECT
      pi.id,
      pi.property_id,
      pi.inquirer_id,
      pi.message,
      pi.contact_email,
      pi.status,
      pi.created_at,
      NULL
    FROM property_inquiries pi
    WHERE EXISTS (SELECT 1 FROM property np WHERE np.id = pi.property_id)
    ON CONFLICT (id) DO UPDATE SET
      property_id = EXCLUDED.property_id,
      inquirer_user_id = EXCLUDED.inquirer_user_id,
      message = EXCLUDED.message,
      contact_email = EXCLUDED.contact_email,
      status = EXCLUDED.status,
      created_at = EXCLUDED.created_at,
      deleted_at = NULL
  `);
}

async function run() {
  console.log("Starting core schema backfill...");
  await backfillAdminHierarchy();
  await backfillProperties();
  console.log("Core schema backfill completed.");
}

run().catch((error) => {
  console.error("Core schema backfill failed:", error);
  process.exit(1);
});
