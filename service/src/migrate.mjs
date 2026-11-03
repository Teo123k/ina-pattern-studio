import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required to run migrations.");
const { default: pg } = await import("pg");
const pool = new pg.Pool({ connectionString });
const migrationDir = resolve("service/migrations");
try {
  const files = (await readdir(migrationDir)).filter((file) => file.endsWith(".sql")).sort();
  await pool.query("CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())");
  for (const file of files) {
    const applied = await pool.query("SELECT 1 FROM schema_migrations WHERE version = $1", [file]);
    if (applied.rowCount) continue;
    await pool.query("BEGIN");
    try {
      await pool.query(await readFile(resolve(migrationDir, file), "utf8"));
      await pool.query("INSERT INTO schema_migrations (version) VALUES ($1)", [file]);
      await pool.query("COMMIT");
      console.log(`Applied ${file}`);
    } catch (error) {
      await pool.query("ROLLBACK");
      throw error;
    }
  }
} finally {
  await pool.end();
}
