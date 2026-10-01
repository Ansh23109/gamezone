import { eq, type AnyColumn } from "drizzle-orm";

/** Tiny helper so every tenant-scoping `where` clause reads identically across lib/queries and lib/actions — makes the pattern mechanical and easy to spot-check in review. */
export function eqTenant(column: AnyColumn, tenantId: string) {
  return eq(column, tenantId);
}
