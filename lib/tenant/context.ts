import "server-only";

import { cache } from "react";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { createClient } from "@/lib/supabase/server";
import { getTenantBySlug, type Tenant } from "./resolve";

export type { Tenant };

export type AppRole = "OWNER" | "ADMIN" | "MANAGER" | "STAFF";
export type StaffRow = typeof schema.users.$inferSelect;

export type TenantContext =
  | {
      authenticated: false;
      tenant: Tenant | null;
      user: null;
      role: null;
    }
  | {
      authenticated: true;
      tenant: Tenant | null; // null only for an OWNER on admin.edgeweb.co, who isn't scoped to one tenant
      user: StaffRow | null; // null for an OWNER, who has no tenant-scoped `users` row
      role: AppRole;
      authUserId: string;
    };

/**
 * The single place that resolves "who is making this request and for which
 * tenant" — reads the `x-tenant-slug` header proxy.ts set from the Host
 * header, re-verifies the Supabase session itself (never trusts proxy
 * gating alone, per Next's own docs warning that a proxy matcher exclusion
 * also skips Server Function calls on that path), and cross-checks the
 * session's app_metadata.tenantId against the host-resolved tenant so a
 * stale/shared-browser session for tenant A is never accepted on tenant B's
 * subdomain. Wrapped in React's cache() so every Server Component/Action/
 * Route Handler in one request shares a single computation of this.
 */
export const getTenantContext = cache(async (): Promise<TenantContext> => {
  const h = await headers();
  const hostSlug = h.get("x-tenant-slug");
  const isAdminHost = h.get("x-host-mode") === "admin";

  const tenant = hostSlug ? await getTenantBySlug(hostSlug) : null;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data) {
    return { authenticated: false, tenant, user: null, role: null };
  }

  const claims = data.claims;
  const appMetadata = (claims.app_metadata ?? {}) as { role?: AppRole; tenantId?: string };
  const role = appMetadata.role ?? "STAFF";
  const authUserId = claims.sub;

  if (role === "OWNER") {
    // OWNER is cross-tenant by definition — no `users` row, no tenant scoping.
    return { authenticated: true, tenant: isAdminHost ? null : tenant, user: null, role, authUserId };
  }

  // Non-OWNER session must match the host's resolved tenant, or it's treated
  // as unauthenticated for *this* host (stops a stale session for tenant A
  // being accepted on tenant B's subdomain).
  if (!tenant || appMetadata.tenantId !== tenant.id) {
    return { authenticated: false, tenant, user: null, role: null };
  }

  const [staffRow] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.authUserId, authUserId));

  if (!staffRow || !staffRow.isActive) {
    return { authenticated: false, tenant, user: null, role: null };
  }

  return { authenticated: true, tenant, user: staffRow, role, authUserId };
});
