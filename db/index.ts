import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

declare global {
  // eslint-disable-next-line no-var
  var __gzPool: Pool | undefined;
}

const pool =
  global.__gzPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
  });

if (process.env.NODE_ENV !== "production") {
  global.__gzPool = pool;
}

export const db = drizzle(pool, { schema });
export * as schema from "./schema";
