import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "@/lib/db/schema";
import { optionalEnv } from "@/lib/env";

type Database = ReturnType<typeof drizzle<typeof schema>>;

let cached: Database | null = null;

export function getDb(): Database {
  if (cached) return cached;
  const url = optionalEnv("DATABASE_URL");
  if (!url) {
    throw new Error("DATABASE_URL is required");
  }
  cached = drizzle(neon(url), { schema });
  return cached;
}

export { schema };
