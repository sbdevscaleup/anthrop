import { sql } from "drizzle-orm";
import { db } from "@/infrastructure/db/client";
import { boundaryDatasetVersion } from "@/infrastructure/db/schema";

type BoundaryImportInput = {
  version: string;
  checksum: string;
  sourceMetaJson?: string;
};

// ETL-heavy geometry import is intentionally handled by offline scripts.
// This function records and activates an imported dataset version atomically.
export async function activateBoundaryDatasetVersion(input: BoundaryImportInput) {
  return db.transaction(async (tx) => {
    await tx.execute(sql`UPDATE boundary_dataset_version SET is_active = false`);

    const [row] = await tx
      .insert(boundaryDatasetVersion)
      .values({
        version: input.version,
        checksum: input.checksum,
        sourceMetaJson: input.sourceMetaJson ?? null,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: boundaryDatasetVersion.version,
        set: {
          checksum: input.checksum,
          sourceMetaJson: input.sourceMetaJson ?? null,
          importedAt: new Date(),
          isActive: true,
        },
      })
      .returning();

    return row;
  });
}