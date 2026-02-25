import { sql } from "drizzle-orm";
import { db } from "@/infrastructure/db/client";

export type ResolvedAdminUnits = {
  l1Id: string;
  l1Type: "province" | "capital_city";
  l2Id: string | null;
  l2Type: "district" | "soum" | null;
  l3Id: string | null;
  l3Type: "khoroo" | "bag" | null;
};

export async function resolveAdminUnitsByPoint(
  lat: number,
  lng: number,
): Promise<ResolvedAdminUnits | null> {
  const point = sql`ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)`;

  const result = await db.execute<ResolvedAdminUnits>(sql`
    SELECT
      l1.id AS "l1Id",
      l1.level_type AS "l1Type",
      l2.id AS "l2Id",
      l2.level_type AS "l2Type",
      l3.id AS "l3Id",
      l3.level_type AS "l3Type"
    FROM admin_l1 l1
    LEFT JOIN LATERAL (
      SELECT id, level_type
      FROM admin_l2
      WHERE l1_id = l1.id
        AND deleted_at IS NULL
        AND ST_Contains(geom, ${point})
      LIMIT 1
    ) l2 ON true
    LEFT JOIN LATERAL (
      SELECT id, level_type
      FROM admin_l3
      WHERE l2_id = l2.id
        AND deleted_at IS NULL
        AND ST_Contains(geom, ${point})
      LIMIT 1
    ) l3 ON true
    WHERE l1.deleted_at IS NULL
      AND ST_Contains(l1.geom, ${point})
    LIMIT 1
  `);

  return result.rows.at(0) ?? null;
}