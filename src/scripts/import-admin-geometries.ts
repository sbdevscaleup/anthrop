import crypto from "crypto";
import fs from "fs";
import path from "path";
import { Client } from "pg";
import { importConfig } from "./geo/import-config";

type Feature = {
  properties: Record<string, unknown>;
  geometry: unknown;
};

type FeatureCollection = {
  name?: string;
  crs?: { properties?: { name?: string } };
  features: Feature[];
};

type StgL1 = {
  code: string;
  nameMn: string;
  nameEn: string | null;
  levelType: "province" | "capital_city";
  geomJson: string;
};

type StgL2 = {
  code: string;
  parentCode: string;
  nameMn: string;
  nameEn: string | null;
  levelType: "district" | "soum";
  geomJson: string;
};

type StgL3 = {
  code: string;
  parentCode: string;
  nameMn: string;
  nameEn: string | null;
  levelType: "khoroo" | "bag";
  geomJson: string;
};

function getArg(name: string) {
  const item = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  return item ? item.slice(name.length + 3) : undefined;
}

function hasFlag(flag: string) {
  return process.argv.includes(`--${flag}`);
}

function stripWrappingQuotes(value: string) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseDotEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx <= 0) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = stripWrappingQuotes(trimmed.slice(idx + 1));
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function resolveConnectionString() {
  if (!process.env.DATABASE_URL) {
    parseDotEnvFile(path.resolve(process.cwd(), ".env"));
  }

  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error(
      "DATABASE_URL is missing. Set it in environment or .env before running db:import:geo.",
    );
  }

  return stripWrappingQuotes(url);
}

function readFeatureCollection(filePath: string): FeatureCollection {
  const raw = fs.readFileSync(filePath, "utf8");
  const parsed = JSON.parse(raw) as FeatureCollection;
  if (!Array.isArray(parsed.features)) {
    throw new Error(`Invalid GeoJSON feature collection: ${filePath}`);
  }
  return parsed;
}

function normalizeCode(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeName(value: unknown) {
  return String(value ?? "").trim();
}

function isCapitalL1(code: string, nameMn: string) {
  return code === "011" || /улаанбаатар/i.test(nameMn);
}

function deriveL3ParentCode(rawCode: string) {
  const normalized = rawCode.length < 7 ? rawCode.padStart(7, "0") : rawCode;
  return normalized.slice(0, 5);
}

function buildL1Rows(fc: FeatureCollection): StgL1[] {
  return fc.features.map((f) => {
    const code = normalizeCode(f.properties.AU1_CODE);
    const nameMn = normalizeName(f.properties.NAME);
    return {
      code,
      nameMn,
      nameEn: null,
      levelType: isCapitalL1(code, nameMn) ? "capital_city" : "province",
      geomJson: JSON.stringify(f.geometry),
    };
  });
}

function buildL2Rows(
  fc: FeatureCollection,
  l1ByCode: Map<string, StgL1>,
): StgL2[] {
  return fc.features.map((f) => {
    const code = normalizeCode(f.properties.AU2_CODE);
    const parentCode = code.slice(0, 3);
    const l1 = l1ByCode.get(parentCode);
    return {
      code,
      parentCode,
      nameMn: normalizeName(f.properties.NAME),
      nameEn: null,
      levelType: l1?.levelType === "capital_city" ? "district" : "soum",
      geomJson: JSON.stringify(f.geometry),
    };
  });
}

function buildL3Rows(
  fc: FeatureCollection,
  l2ByCode: Map<string, StgL2>,
): StgL3[] {
  return fc.features.map((f) => {
    const code = normalizeCode(f.properties.AU3_CODE);
    const overrideParent = importConfig.l3ParentCodeExceptions[code];
    const parentCode = overrideParent ?? deriveL3ParentCode(code);
    const l2 = l2ByCode.get(parentCode);
    return {
      code,
      parentCode,
      nameMn: normalizeName(f.properties.NAME),
      nameEn: null,
      levelType: l2?.levelType === "district" ? "khoroo" : "bag",
      geomJson: JSON.stringify(f.geometry),
    };
  });
}

async function batchInsertL1(client: Client, rows: StgL1[], batchSize = 400) {
  for (let i = 0; i < rows.length; i += batchSize) {
    const chunk = rows.slice(i, i + batchSize);
    const values: unknown[] = [];
    const tuples = chunk
      .map((row, idx) => {
        const base = idx * 5;
        values.push(
          row.code,
          row.nameMn,
          row.nameEn,
          row.levelType,
          row.geomJson,
        );
        return `($${base + 1},$${base + 2},$${base + 3},$${base + 4},$${base + 5})`;
      })
      .join(",");

    await client.query(
      `
      INSERT INTO stg_admin_l1(code, name_mn, name_en, level_type, geom)
      SELECT
        v.code,
        v.name_mn,
        v.name_en,
        v.level_type::admin_l1_type,
        ST_Multi(
          ST_CollectionExtract(
            ST_MakeValid(
              ST_SetSRID(ST_Force2D(ST_GeomFromGeoJSON(v.geom_json)), 4326)
            ),
            3
          )
        )
      FROM (VALUES ${tuples}) AS v(code, name_mn, name_en, level_type, geom_json)
    `,
      values,
    );
  }
}

async function batchInsertL2(client: Client, rows: StgL2[], batchSize = 400) {
  for (let i = 0; i < rows.length; i += batchSize) {
    const chunk = rows.slice(i, i + batchSize);
    const values: unknown[] = [];
    const tuples = chunk
      .map((row, idx) => {
        const base = idx * 6;
        values.push(
          row.code,
          row.parentCode,
          row.nameMn,
          row.nameEn,
          row.levelType,
          row.geomJson,
        );
        return `($${base + 1},$${base + 2},$${base + 3},$${base + 4},$${base + 5},$${base + 6})`;
      })
      .join(",");

    await client.query(
      `
      INSERT INTO stg_admin_l2(code, parent_code, name_mn, name_en, level_type, geom)
      SELECT
        v.code,
        v.parent_code,
        v.name_mn,
        v.name_en,
        v.level_type::admin_l2_type,
        ST_Multi(
          ST_CollectionExtract(
            ST_MakeValid(
              ST_SetSRID(ST_Force2D(ST_GeomFromGeoJSON(v.geom_json)), 4326)
            ),
            3
          )
        )
      FROM (VALUES ${tuples}) AS v(code, parent_code, name_mn, name_en, level_type, geom_json)
    `,
      values,
    );
  }
}

async function batchInsertL3(client: Client, rows: StgL3[], batchSize = 400) {
  for (let i = 0; i < rows.length; i += batchSize) {
    const chunk = rows.slice(i, i + batchSize);
    const values: unknown[] = [];
    const tuples = chunk
      .map((row, idx) => {
        const base = idx * 6;
        values.push(
          row.code,
          row.parentCode,
          row.nameMn,
          row.nameEn,
          row.levelType,
          row.geomJson,
        );
        return `($${base + 1},$${base + 2},$${base + 3},$${base + 4},$${base + 5},$${base + 6})`;
      })
      .join(",");

    await client.query(
      `
      INSERT INTO stg_admin_l3(code, parent_code, name_mn, name_en, level_type, geom)
      SELECT
        v.code,
        v.parent_code,
        v.name_mn,
        v.name_en,
        v.level_type::admin_l3_type,
        ST_Multi(
          ST_CollectionExtract(
            ST_MakeValid(
              ST_SetSRID(ST_Force2D(ST_GeomFromGeoJSON(v.geom_json)), 4326)
            ),
            3
          )
        )
      FROM (VALUES ${tuples}) AS v(code, parent_code, name_mn, name_en, level_type, geom_json)
    `,
      values,
    );
  }
}

async function createStagingTables(client: Client) {
  await client.query(`
    CREATE TEMP TABLE stg_admin_l1 (
      code text NOT NULL,
      name_mn text NOT NULL,
      name_en text,
      level_type admin_l1_type NOT NULL,
      geom geometry(MultiPolygon, 4326) NOT NULL
    ) ON COMMIT DROP;
  `);
  await client.query(`
    CREATE TEMP TABLE stg_admin_l2 (
      code text NOT NULL,
      parent_code text NOT NULL,
      name_mn text NOT NULL,
      name_en text,
      level_type admin_l2_type NOT NULL,
      geom geometry(MultiPolygon, 4326) NOT NULL
    ) ON COMMIT DROP;
  `);
  await client.query(`
    CREATE TEMP TABLE stg_admin_l3 (
      code text NOT NULL,
      parent_code text NOT NULL,
      name_mn text NOT NULL,
      name_en text,
      level_type admin_l3_type NOT NULL,
      geom geometry(MultiPolygon, 4326) NOT NULL
    ) ON COMMIT DROP;
  `);
}

async function validateStaging(client: Client) {
  const dupL1 = await client.query(
    `SELECT code, COUNT(*) c FROM stg_admin_l1 GROUP BY code HAVING COUNT(*) > 1`,
  );
  const dupL2 = await client.query(
    `SELECT code, COUNT(*) c FROM stg_admin_l2 GROUP BY code HAVING COUNT(*) > 1`,
  );
  const dupL3 = await client.query(
    `SELECT code, COUNT(*) c FROM stg_admin_l3 GROUP BY code HAVING COUNT(*) > 1`,
  );
  if (dupL1.rowCount || dupL2.rowCount || dupL3.rowCount) {
    throw new Error("Duplicate admin codes detected in staging data");
  }

  const invalidGeom = await client.query(`
    SELECT
      (SELECT COUNT(*) FROM stg_admin_l1 WHERE ST_IsEmpty(geom) OR NOT ST_IsValid(geom)) AS l1_invalid,
      (SELECT COUNT(*) FROM stg_admin_l2 WHERE ST_IsEmpty(geom) OR NOT ST_IsValid(geom)) AS l2_invalid,
      (SELECT COUNT(*) FROM stg_admin_l3 WHERE ST_IsEmpty(geom) OR NOT ST_IsValid(geom)) AS l3_invalid
  `);
  const invalid = invalidGeom.rows[0];
  if (
    Number(invalid.l1_invalid) > 0 ||
    Number(invalid.l2_invalid) > 0 ||
    Number(invalid.l3_invalid) > 0
  ) {
    throw new Error(
      `Invalid geometries found: l1=${invalid.l1_invalid}, l2=${invalid.l2_invalid}, l3=${invalid.l3_invalid}`,
    );
  }

  const missingL2Parent = await client.query(`
    SELECT s.code, s.parent_code
    FROM stg_admin_l2 s
    LEFT JOIN stg_admin_l1 p ON p.code = s.parent_code
    WHERE p.code IS NULL
    LIMIT 25
  `);
  if (missingL2Parent.rowCount) {
    throw new Error(
      `L2 rows with missing L1 parent: ${JSON.stringify(missingL2Parent.rows)}`,
    );
  }

  const missingL3Parent = await client.query(`
    SELECT s.code, s.parent_code
    FROM stg_admin_l3 s
    LEFT JOIN stg_admin_l2 p ON p.code = s.parent_code
    WHERE p.code IS NULL
    LIMIT 25
  `);
  if (missingL3Parent.rowCount) {
    throw new Error(
      `L3 rows with missing L2 parent: ${JSON.stringify(missingL3Parent.rows)}`,
    );
  }
}

async function upsertCanonical(client: Client) {
  await client.query(
    `
    INSERT INTO admin_l1 (
      code, name_mn, name_en, level_type, geom, geom_simplified, bbox, created_at, updated_at, deleted_at
    )
    SELECT
      s.code,
      s.name_mn,
      s.name_en,
      s.level_type,
      s.geom,
      ST_SimplifyPreserveTopology(s.geom, $1),
      ST_Envelope(s.geom),
      NOW(),
      NOW(),
      NULL
    FROM stg_admin_l1 s
    ON CONFLICT (code) DO UPDATE SET
      name_mn = EXCLUDED.name_mn,
      name_en = EXCLUDED.name_en,
      level_type = EXCLUDED.level_type,
      geom = EXCLUDED.geom,
      geom_simplified = EXCLUDED.geom_simplified,
      bbox = EXCLUDED.bbox,
      updated_at = NOW(),
      deleted_at = NULL
  `,
    [importConfig.simplifyTolerance.l1],
  );

  await client.query(
    `
    INSERT INTO admin_l2 (
      l1_id, code, name_mn, name_en, level_type, geom, geom_simplified, bbox, created_at, updated_at, deleted_at
    )
    SELECT
      p.id,
      s.code,
      s.name_mn,
      s.name_en,
      s.level_type,
      s.geom,
      ST_SimplifyPreserveTopology(s.geom, $1),
      ST_Envelope(s.geom),
      NOW(),
      NOW(),
      NULL
    FROM stg_admin_l2 s
    JOIN admin_l1 p ON p.code = s.parent_code
    ON CONFLICT (l1_id, code) DO UPDATE SET
      name_mn = EXCLUDED.name_mn,
      name_en = EXCLUDED.name_en,
      level_type = EXCLUDED.level_type,
      geom = EXCLUDED.geom,
      geom_simplified = EXCLUDED.geom_simplified,
      bbox = EXCLUDED.bbox,
      updated_at = NOW(),
      deleted_at = NULL
  `,
    [importConfig.simplifyTolerance.l2],
  );

  await client.query(
    `
    INSERT INTO admin_l3 (
      l2_id, code, name_mn, name_en, level_type, geom, geom_simplified, bbox, created_at, updated_at, deleted_at
    )
    SELECT
      p.id,
      s.code,
      s.name_mn,
      s.name_en,
      s.level_type,
      s.geom,
      ST_SimplifyPreserveTopology(s.geom, $1),
      ST_Envelope(s.geom),
      NOW(),
      NOW(),
      NULL
    FROM stg_admin_l3 s
    JOIN admin_l2 p ON p.code = s.parent_code
    ON CONFLICT (l2_id, code) DO UPDATE SET
      name_mn = EXCLUDED.name_mn,
      name_en = EXCLUDED.name_en,
      level_type = EXCLUDED.level_type,
      geom = EXCLUDED.geom,
      geom_simplified = EXCLUDED.geom_simplified,
      bbox = EXCLUDED.bbox,
      updated_at = NOW(),
      deleted_at = NULL
  `,
    [importConfig.simplifyTolerance.l3],
  );
}

async function softDeleteMissing(client: Client) {
  await client.query(`
    UPDATE admin_l1 t
    SET deleted_at = NOW(), updated_at = NOW()
    WHERE t.deleted_at IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM stg_admin_l1 s WHERE s.code = t.code
      );
  `);

  await client.query(`
    UPDATE admin_l2 t
    SET deleted_at = NOW(), updated_at = NOW()
    WHERE t.deleted_at IS NULL
      AND NOT EXISTS (
        SELECT 1
        FROM stg_admin_l2 s
        JOIN admin_l1 p ON p.code = s.parent_code
        WHERE t.code = s.code
          AND t.l1_id = p.id
      );
  `);

  await client.query(`
    UPDATE admin_l3 t
    SET deleted_at = NOW(), updated_at = NOW()
    WHERE t.deleted_at IS NULL
      AND NOT EXISTS (
        SELECT 1
        FROM stg_admin_l3 s
        JOIN admin_l2 p ON p.code = s.parent_code
        WHERE t.code = s.code
          AND t.l2_id = p.id
      );
  `);
}

function computeChecksum(paths: string[]) {
  const hash = crypto.createHash("sha256");
  for (const p of paths) {
    hash.update(fs.readFileSync(p));
  }
  return hash.digest("hex");
}

async function activateVersion(
  client: Client,
  version: string,
  checksum: string,
  sourceMetaJson: string,
) {
  await client.query(`UPDATE boundary_dataset_version SET is_active = false`);
  await client.query(
    `
    INSERT INTO boundary_dataset_version (version, checksum, source_meta_json, imported_at, is_active)
    VALUES ($1, $2, $3, NOW(), true)
    ON CONFLICT (version) DO UPDATE SET
      checksum = EXCLUDED.checksum,
      source_meta_json = EXCLUDED.source_meta_json,
      imported_at = NOW(),
      is_active = true
  `,
    [version, checksum, sourceMetaJson],
  );
}

async function run() {
  const version =
    getArg("version") ?? `geo-${new Date().toISOString().replace(/[:.]/g, "-")}`;
  const dryRun = hasFlag("dry-run");

  const l1File = readFeatureCollection(importConfig.files.l1);
  const l2File = readFeatureCollection(importConfig.files.l2);
  const l3File = readFeatureCollection(importConfig.files.l3);

  const l1Rows = buildL1Rows(l1File);
  const l1ByCode = new Map(l1Rows.map((row) => [row.code, row]));

  const l2Rows = buildL2Rows(l2File, l1ByCode);
  const l2ByCode = new Map(l2Rows.map((row) => [row.code, row]));

  const l3Rows = buildL3Rows(l3File, l2ByCode);

  const sourceMetaJson = JSON.stringify(
    {
      files: importConfig.files,
      crs: {
        l1: l1File.crs?.properties?.name ?? null,
        l2: l2File.crs?.properties?.name ?? null,
        l3: l3File.crs?.properties?.name ?? null,
      },
      counts: { l1: l1Rows.length, l2: l2Rows.length, l3: l3Rows.length },
      simplifyTolerance: importConfig.simplifyTolerance,
      exceptionCount: Object.keys(importConfig.l3ParentCodeExceptions).length,
    },
    null,
    2,
  );
  const checksum = computeChecksum([
    importConfig.files.l1,
    importConfig.files.l2,
    importConfig.files.l3,
  ]);

  const client = new Client({ connectionString: resolveConnectionString() });
  await client.connect();

  try {
    await client.query("BEGIN");

    await createStagingTables(client);
    await batchInsertL1(client, l1Rows);
    await batchInsertL2(client, l2Rows);
    await batchInsertL3(client, l3Rows);
    await validateStaging(client);
    await upsertCanonical(client);
    await softDeleteMissing(client);
    await activateVersion(client, version, checksum, sourceMetaJson);

    if (dryRun) {
      await client.query("ROLLBACK");
      console.log("Dry-run completed. Transaction rolled back.");
    } else {
      await client.query("COMMIT");
      console.log(`Import completed and activated. version=${version}`);
    }
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Geospatial import failed:", error);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

void run();
