import "server-only";

import { cache } from "react";
import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { createClient } from "@/lib/supabase/server";
import { resolveHostMode, getTenantBySlug, type Tenant } from "./resolve";
import { TENANT_AUTH_DISABLED } from "./dev-flags";

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
  // Primary source: the x-tenant-slug/x-host-mode headers proxy.ts sets from
  // the resolved Host. Defense-in-depth fallback: resolve directly from the
  // raw `host` header via the same resolveHostMode() proxy.ts uses, in case
  // those proxy-set headers are ever missing for a given request shape (this
  // exact gap — headers set on the response object instead of forwarded via
  // the request — caused real intermittent "Not authenticated" failures in
  // production once; this fallback means a recurrence degrades gracefully
  // instead of reproducing that bug).
  let hostSlug = h.get("x-tenant-slug");
  let isAdminHost = h.get("x-host-mode") === "admin";
  if (!hostSlug && !isAdminHost) {
    const hostMode = resolveHostMode(h.get("host"));
    if (hostMode.kind === "tenant") hostSlug = hostMode.slug;
    else if (hostMode.kind === "admin") isAdminHost = true;
  }

  const tenant = hostSlug ? await getTenantBySlug(hostSlug) : null;

  // TEMPORARY, at the user's explicit request — see lib/tenant/dev-flags.ts.
  // Only ever applies on a tenant host with a resolved tenant; admin.edgeweb.co
  // is untouched. Every other code path below (and every call site of
  // requireTenantUser()/getTenantContext()) is unchanged — this is the one
  // place a fallback identity gets synthesized when there's no real session.
  async function fallbackOrUnauthenticated(): Promise<TenantContext> {
    if (TENANT_AUTH_DISABLED && !isAdminHost && tenant) {
      const fallback = await getFallbackStaffIdentity(tenant.id);
      if (fallback) {
        return { authenticated: true, tenant, user: fallback, role: fallback.role as AppRole, authUserId: "dev-no-auth" };
      }
    }
    return { authenticated: false, tenant, user: null, role: null };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data) {
    return fallbackOrUnauthenticated();
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
    return fallbackOrUnauthenticated();
  }

  const [staffRow] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.authUserId, authUserId));

  if (!staffRow || !staffRow.isActive) {
    return fallbackOrUnauthenticated();
  }

  return { authenticated: true, tenant, user: staffRow, role, authUserId };
});

async function getFallbackStaffIdentity(tenantId: string): Promise<StaffRow | null> {
  const [staffRow] = await db
    .select()
    .from(schema.users)
    .where(and(eq(schema.users.tenantId, tenantId), eq(schema.users.isActive, true)))
    .limit(1);
  return staffRow ?? null;
}
