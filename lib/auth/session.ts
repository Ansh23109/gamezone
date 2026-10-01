import "server-only";

import { getTenantContext, type AppRole, type StaffRow, type Tenant } from "@/lib/tenant/context";

export class AuthError extends Error {
  constructor(message = "Not authenticated or not authorized") {
    super(message);
    this.name = "AuthError";
  }
}

/**
 * Guard for every tenant-scoped Server Action and query: re-verifies the
 * session itself (never relies on proxy.ts gating alone — see the warning
 * in lib/tenant/context.ts) and returns a `tenantId` that's safe to pass as
 * the required first parameter into lib/queries/* and lib/actions/*.
 * Throws AuthError if there's no valid session or no resolved tenant.
 */
export async function requireTenantUser(): Promise<{
  tenant: Tenant;
  tenantId: string;
  user: StaffRow;
  role: AppRole;
}> {
  const ctx = await getTenantContext();
  if (!ctx.authenticated || !ctx.tenant || !ctx.user) {
    throw new AuthError();
  }
  return { tenant: ctx.tenant, tenantId: ctx.tenant.id, user: ctx.user, role: ctx.role };
}

/** Same as requireTenantUser, but also checks the staff member's role is one of `roles`. */
export async function requireTenantRole(roles: AppRole[]): Promise<{
  tenant: Tenant;
  tenantId: string;
  user: StaffRow;
  role: AppRole;
}> {
  const ctx = await requireTenantUser();
  if (!roles.includes(ctx.role)) {
    throw new AuthError(`Requires role: ${roles.join(" or ")}`);
  }
  return ctx;
}

/** Guard for the cross-tenant /admin console — only the platform OWNER may proceed. */
export async function requireOwner(): Promise<{ authUserId: string }> {
  const ctx = await getTenantContext();
  if (!ctx.authenticated || ctx.role !== "OWNER") {
    throw new AuthError("Owner access required");
  }
  return { authUserId: ctx.authUserId };
}
