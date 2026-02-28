import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Client } from "pg";

type MigrationRow = {
  id: number;
  hash: string;
  created_at: string;
};

type EnumRow = {
  enumlabel: string;
};

function loadDotEnv() {
  const envPath = resolve(process.cwd(), ".env");
  if (!existsSync(envPath)) {
    return;
  }

  const envFile = readFileSync(envPath, "utf8");
  for (const line of envFile.split(/\r?\n/)) {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith("#")) continue;

    const separatorIndex = trimmedLine.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = trimmedLine.slice(0, separatorIndex).trim();
    const rawValue = trimmedLine.slice(separatorIndex + 1).trim();
    const value = rawValue.replace(/^['"]|['"]$/g, "");

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

async function main() {
  loadDotEnv();

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const client = new Client({
    connectionString,
    connectionTimeoutMillis: 5000,
  });

  await client.connect();

  try {
    const [migrationResult, enumResult] = await Promise.all([
      client.query<MigrationRow>(`
        select id, hash, created_at
        from drizzle.__drizzle_migrations
        order by created_at desc, id desc
        limit 10
      `),
      client.query<EnumRow>(`
        select enumlabel
        from pg_enum e
        join pg_type t on t.oid = e.enumtypid
        where t.typname = 'UserRole'
        order by e.enumsortorder
      `),
    ]);

    const latestMigration = migrationResult.rows[0] ?? null;
    const roleLabels = enumResult.rows.map((row) => row.enumlabel);
    const hasRenter = roleLabels.includes("renter");

    console.log("Drizzle migration state");
    console.log(
      JSON.stringify(
        {
          latestMigration,
          appliedMigrationCount: migrationResult.rows.length,
          userRoleValues: roleLabels,
          renterPresent: hasRenter,
        },
        null,
        2,
      ),
    );
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`db:verify failed: ${message}`);
  process.exitCode = 1;
});
