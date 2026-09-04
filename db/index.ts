import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

declare global {
  // eslint-disable-next-line no-var
  var __gzPool: Pool | undefined;
}

// If DATABASE_URL is not provided, avoid creating a real Pool at import time.
// This prevents deployment-time import failures in environments where the
// database is intentionally not configured (for example, preview deployments).
let db: any;

if (!process.env.DATABASE_URL) {
  // Create a proxy that throws a helpful error when any DB method is used.
  const message =
    "No DATABASE_URL configured. Set DATABASE_URL in your environment to enable database access (e.g., on Vercel under Project Settings -> Environment Variables).";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db = new Proxy(
    {},
    {
      get() {
        return () => {
          throw new Error(message);
        };
      },
    },
  );
} else {
  const pool = global.__gzPool ?? new Pool({ connectionString: process.env.DATABASE_URL });

  if (process.env.NODE_ENV !== "production") {
    global.__gzPool = pool;
  }

  db = drizzle(pool, { schema });
}

export { db };
export * as schema from "./schema";
