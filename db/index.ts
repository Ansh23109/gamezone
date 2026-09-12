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
  const pool =
    global.__gzPool ??
    new Pool({
      // pg's own connection-string parser always derives `ssl` from a
      // `sslmode=...` query param and that derived value unconditionally
      // overrides any explicit `ssl` option passed alongside it (see
      // node_modules/pg/lib/connection-parameters.js: the parsed
      // connectionString is Object.assign'd on top of the rest of the
      // config). `sslmode=require`/`verify-full` triggers full CA-chain
      // verification, which fails against Supabase's pooler certificate
      // chain (SELF_SIGNED_CERT_IN_CHAIN) even from Vercel's own network.
      // Stripping sslmode here lets our explicit ssl option below actually
      // take effect — the connection still runs over TLS, it just skips CA
      // verification, matching Supabase's documented guidance for pg/Prisma
      // clients connecting to their pooler.
      connectionString: process.env.DATABASE_URL.replace(/([?&])sslmode=[^&]*&?/, "$1").replace(/[?&]$/, ""),
      ssl: { rejectUnauthorized: false },
    });

  if (process.env.NODE_ENV !== "production") {
    global.__gzPool = pool;
  }

  db = drizzle(pool, { schema });
}

export { db };
export * as schema from "./schema";
