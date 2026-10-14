import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { neon } from "@neondatabase/serverless";

function loadEnvFile(path: string) {
  if (!existsSync(path)) return;
  const text = readFileSync(path, "utf8");
  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

function splitSqlStatements(sql: string): string[] {
  return sql
    .split(/;\s*(?:\n|$)/)
    .map((part) =>
      part
        .split("\n")
        .filter((line) => !line.trim().startsWith("--"))
        .join("\n")
        .trim(),
    )
    .filter(Boolean);
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is required to run migrations");
  }

  const sql = neon(url);
  await sql.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  const dir = join(process.cwd(), "drizzle");
  const files = readdirSync(dir)
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const applied = await sql.query("SELECT id FROM schema_migrations WHERE id = $1", [
      file,
    ]);
    if (applied.length > 0) {
      console.log(`skip ${file} (already applied)`);
      continue;
    }

    const statements = splitSqlStatements(readFileSync(join(dir, file), "utf8"));
    for (const statement of statements) {
      await sql.query(statement);
    }
    await sql.query("INSERT INTO schema_migrations (id) VALUES ($1)", [file]);
    console.log(`applied ${file}`);
  }

  console.log("migrations complete");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
