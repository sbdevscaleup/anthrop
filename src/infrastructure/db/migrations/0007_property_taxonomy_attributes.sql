DO $$
BEGIN
  CREATE TYPE property_attribute_value_type AS ENUM ('number', 'string', 'boolean', 'enum', 'json');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE property_attribute_scope AS ENUM ('global', 'category', 'subcategory');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS property_category (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL,
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp NOT NULL DEFAULT NOW(),
  updated_at timestamp NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS property_category_slug_uidx
  ON property_category (slug);

CREATE TABLE IF NOT EXISTS property_subcategory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES property_category(id) ON DELETE CASCADE,
  slug text NOT NULL,
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp NOT NULL DEFAULT NOW(),
  updated_at timestamp NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS property_subcategory_category_slug_uidx
  ON property_subcategory (category_id, slug);

CREATE TABLE IF NOT EXISTS property_attribute_definition (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  label text NOT NULL,
  value_type property_attribute_value_type NOT NULL,
  unit text,
  is_filterable boolean NOT NULL DEFAULT false,
  is_required boolean NOT NULL DEFAULT false,
  scope property_attribute_scope NOT NULL DEFAULT 'global',
  created_at timestamp NOT NULL DEFAULT NOW(),
  updated_at timestamp NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS property_attribute_definition_code_uidx
  ON property_attribute_definition (code);

CREATE TABLE IF NOT EXISTS property_subcategory_attribute (
  subcategory_id uuid NOT NULL REFERENCES property_subcategory(id) ON DELETE CASCADE,
  attribute_id uuid NOT NULL REFERENCES property_attribute_definition(id) ON DELETE CASCADE,
  is_required boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  PRIMARY KEY (subcategory_id, attribute_id)
);

CREATE TABLE IF NOT EXISTS property_attribute_option (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attribute_id uuid NOT NULL REFERENCES property_attribute_definition(id) ON DELETE CASCADE,
  value text NOT NULL,
  label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX IF NOT EXISTS property_attribute_option_attribute_value_uidx
  ON property_attribute_option (attribute_id, value);

CREATE TABLE IF NOT EXISTS property_attribute_value (
  property_id uuid NOT NULL REFERENCES property(id) ON DELETE CASCADE,
  attribute_id uuid NOT NULL REFERENCES property_attribute_definition(id) ON DELETE CASCADE,
  number_value numeric(14,2),
  text_value text,
  boolean_value boolean,
  option_id uuid REFERENCES property_attribute_option(id) ON DELETE SET NULL,
  json_value jsonb,
  created_at timestamp NOT NULL DEFAULT NOW(),
  updated_at timestamp NOT NULL DEFAULT NOW(),
  PRIMARY KEY (property_id, attribute_id),
  CONSTRAINT property_attribute_value_single_typed_ck CHECK (
    (CASE WHEN number_value IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN text_value IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN boolean_value IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN option_id IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN json_value IS NOT NULL THEN 1 ELSE 0 END) <= 1
  )
);

CREATE INDEX IF NOT EXISTS property_attribute_value_attribute_id_idx
  ON property_attribute_value (attribute_id);
CREATE INDEX IF NOT EXISTS property_attribute_value_property_id_idx
  ON property_attribute_value (property_id);
CREATE INDEX IF NOT EXISTS property_attribute_value_number_idx
  ON property_attribute_value (attribute_id, number_value);
CREATE INDEX IF NOT EXISTS property_attribute_value_boolean_idx
  ON property_attribute_value (attribute_id, boolean_value);

CREATE TABLE IF NOT EXISTS property_rental_terms (
  property_id uuid PRIMARY KEY REFERENCES property(id) ON DELETE CASCADE,
  hoa_fee_minor bigint,
  furnished boolean,
  lease_term_months integer,
  deposit_minor bigint,
  utilities_included_json jsonb DEFAULT '{}'::jsonb,
  created_at timestamp NOT NULL DEFAULT NOW(),
  updated_at timestamp NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS property_rental_terms_furnished_idx
  ON property_rental_terms (furnished);
CREATE INDEX IF NOT EXISTS property_rental_terms_hoa_fee_minor_idx
  ON property_rental_terms (hoa_fee_minor);

ALTER TABLE property
  ADD COLUMN IF NOT EXISTS category_id uuid,
  ADD COLUMN IF NOT EXISTS subcategory_id uuid;

DO $$
BEGIN
  ALTER TABLE property
    ADD CONSTRAINT property_category_id_fk
    FOREIGN KEY (category_id) REFERENCES property_category(id) ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE property
    ADD CONSTRAINT property_subcategory_id_fk
    FOREIGN KEY (subcategory_id) REFERENCES property_subcategory(id) ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS property_category_subcategory_listing_workflow_idx
  ON property (category_id, subcategory_id, listing_type, workflow_status);

-- Seed categories
INSERT INTO property_category (slug, name, sort_order)
VALUES
  ('house', 'House', 10),
  ('apartment', 'Apartment', 20),
  ('land', 'Land', 30),
  ('commercial', 'Commercial', 40)
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name,
    sort_order = EXCLUDED.sort_order,
    is_active = true,
    updated_at = NOW();

-- Seed baseline subcategories
INSERT INTO property_subcategory (category_id, slug, name, sort_order)
SELECT c.id, c.slug, c.name, c.sort_order
FROM property_category c
ON CONFLICT (category_id, slug) DO UPDATE
SET name = EXCLUDED.name,
    sort_order = EXCLUDED.sort_order,
    is_active = true,
    updated_at = NOW();

-- Backfill category/subcategory from legacy property_type
UPDATE property p
SET category_id = c.id,
    subcategory_id = s.id
FROM property_category c
JOIN property_subcategory s ON s.category_id = c.id AND s.slug = c.slug
WHERE p.property_type::text = c.slug
  AND (p.category_id IS NULL OR p.subcategory_id IS NULL);

-- Attribute definitions
INSERT INTO property_attribute_definition (code, label, value_type, unit, is_filterable, is_required, scope)
VALUES
  ('area_m2', 'Area (m2)', 'number', 'm2', true, false, 'global'),
  ('bedrooms', 'Bedrooms', 'number', NULL, true, false, 'global'),
  ('bathrooms', 'Bathrooms', 'number', NULL, true, false, 'global'),
  ('lot_size_m2', 'Lot size (m2)', 'number', 'm2', true, false, 'subcategory'),
  ('floor_level', 'Floor level', 'number', NULL, true, false, 'subcategory'),
  ('land_use_type', 'Land use type', 'enum', NULL, true, false, 'subcategory'),
  ('permitted_uses', 'Permitted uses', 'json', NULL, false, false, 'subcategory'),
  ('fencing', 'Fencing', 'boolean', NULL, true, false, 'subcategory'),
  ('hoa_fee_minor', 'HOA fee (minor)', 'number', NULL, true, false, 'subcategory'),
  ('furnished', 'Furnished', 'boolean', NULL, true, false, 'subcategory')
ON CONFLICT (code) DO UPDATE
SET label = EXCLUDED.label,
    value_type = EXCLUDED.value_type,
    unit = EXCLUDED.unit,
    is_filterable = EXCLUDED.is_filterable,
    is_required = EXCLUDED.is_required,
    scope = EXCLUDED.scope,
    updated_at = NOW();

-- Land-use options
INSERT INTO property_attribute_option (attribute_id, value, label, sort_order)
SELECT ad.id, v.value, v.label, v.sort_order
FROM property_attribute_definition ad
JOIN (
  VALUES
    ('residential', 'Residential', 10),
    ('commercial', 'Commercial', 20),
    ('industrial', 'Industrial', 30),
    ('agricultural', 'Agricultural', 40),
    ('mixed_use', 'Mixed use', 50)
) AS v(value, label, sort_order) ON true
WHERE ad.code = 'land_use_type'
ON CONFLICT (attribute_id, value) DO UPDATE
SET label = EXCLUDED.label,
    sort_order = EXCLUDED.sort_order;

-- Subcategory-attribute mapping
INSERT INTO property_subcategory_attribute (subcategory_id, attribute_id, is_required, sort_order)
SELECT s.id, ad.id, false, rel.sort_order
FROM property_subcategory s
JOIN property_category c ON c.id = s.category_id
JOIN (
  VALUES
    ('house', 'lot_size_m2', 10),
    ('apartment', 'floor_level', 10),
    ('land', 'land_use_type', 10),
    ('land', 'permitted_uses', 20),
    ('land', 'fencing', 30),
    ('apartment', 'hoa_fee_minor', 40),
    ('apartment', 'furnished', 50),
    ('house', 'hoa_fee_minor', 40),
    ('house', 'furnished', 50)
) AS rel(subcategory_slug, code, sort_order)
  ON c.slug = rel.subcategory_slug
JOIN property_attribute_definition ad ON ad.code = rel.code
ON CONFLICT (subcategory_id, attribute_id) DO UPDATE
SET is_required = EXCLUDED.is_required,
    sort_order = EXCLUDED.sort_order;
