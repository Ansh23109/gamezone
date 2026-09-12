import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

declare global {
  // eslint-disable-next-line no-var
  var __gzPool: Pool | undefined;
}

// If DATABASE_URL is not provided, avoid creating a real Pool at import time.
// This prevents deployment-time import failures in environments where the
// database is intentionally not configured (for example, preview deployments).
// The proxy is cast to the real db type below so callers keep full type
// safety (array element types, query builder overloads, etc.) instead of
// silently degrading to `any` across every file that imports `db`.
let db: NodePgDatabase<typeof schema>;

if (!process.env.DATABASE_URL) {
  // Create a proxy that throws a helpful error when any DB method is used.
  const message =
    "No DATABASE_URL configured. Set DATABASE_URL in your environment to enable database access (e.g., on Vercel under Project Settings -> Environment Variables).";
  db = new Proxy(
    {},
    {
      get() {
        return () => {
          throw new Error(message);
        };
      },
    },
  ) as NodePgDatabase<typeof schema>;
} else {
  const pool = global.__gzPool ?? new Pool({ connectionString: process.env.DATABASE_URL });

  if (process.env.NODE_ENV !== "production") {
    global.__gzPool = pool;
  }

  db = drizzle(pool, { schema });
}

export { db };
export * as schema from "./schema";
