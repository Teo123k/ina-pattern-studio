import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import pg from "pg";

const defaultMigrationDir = resolve(dirname(fileURLToPath(import.meta.url)), "../migrations");

export async function runMigrations({ connectionString, migrationDir = defaultMigrationDir }) {
  const pool = new pg.Pool({ connectionString });
  try {
    const files = (await readdir(migrationDir)).filter((file) => file.endsWith(".sql")).sort();
    await pool.query("CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())");
    for (const file of files) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const applied = await client.query("SELECT 1 FROM schema_migrations WHERE version = $1", [file]);
        if (!applied.rowCount) {
          await client.query(await readFile(resolve(migrationDir, file), "utf8"));
          await client.query("INSERT INTO schema_migrations (version) VALUES ($1)", [file]);
          console.log(`Applied ${file}`);
        }
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    }
  } finally {
    await pool.end();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required to run migrations.");
  await runMigrations({ connectionString: process.env.DATABASE_URL });
}
