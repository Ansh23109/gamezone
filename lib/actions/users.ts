"use server";

import { db, schema } from "@/db";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { eqTenant } from "@/lib/tenant/scope";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireTenantRole } from "@/lib/auth/session";
import type { AppRole } from "@/lib/tenant/context";

/**
 * Creates a staff member with a real login: invites them via Supabase Auth
 * (sends an email with a link to set their password — requires SMTP to be
 * configured on the Supabase project, otherwise this call succeeds but no
 * email actually arrives) with role/tenantId written into app_metadata
 * (never user_metadata, which is user-editable and unsafe for
 * authorization), then creates the tenant-scoped `users` row linked to that
 * auth user via authUserId. The Supabase invite happens first so a failure
 * there never leaves an orphaned DB row with no way to log in. Only an
 * existing ADMIN of the tenant may invite more staff.
 */
export async function createStaff(input: { name: string; email: string; role?: Exclude<AppRole, "OWNER"> }) {
  const { tenantId } = await requireTenantRole(["ADMIN"]);
  const role = input.role ?? "STAFF";
  const admin = createAdminClient();

  const { data, error } = await admin.auth.admin.inviteUserByEmail(input.email);
  if (error || !data.user) {
    throw new Error(`Could not invite ${input.email}: ${error?.message ?? "unknown error"}`);
  }

  const { error: metaError } = await admin.auth.admin.updateUserById(data.user.id, {
    app_metadata: { role, tenantId },
  });
  if (metaError) {
    throw new Error(`Invited ${input.email} but failed to set their access level: ${metaError.message}`);
  }

  const [user] = await db
    .insert(schema.users)
    .values({ tenantId, authUserId: data.user.id, name: input.name, email: input.email, role })
    .returning();
  revalidatePath("/settings");
  return user;
}

export async function updateStaff(
  id: string,
  input: Partial<{ name: string; email: string | null; role: Exclude<AppRole, "OWNER">; isActive: boolean }>,
) {
  const { tenantId } = await requireTenantRole(["ADMIN"]);
  const [existing] = await db
    .select()
    .from(schema.users)
    .where(and(eqTenant(schema.users.tenantId, tenantId), eq(schema.users.id, id)));
  if (!existing) throw new Error("Staff member not found");

  // Keep the Supabase Auth session's role claim in sync so a role change
  // takes effect immediately (next request re-reads app_metadata via
  // getClaims()) rather than only updating our own `users` row. Read-merge-
  // write rather than assuming updateUserById merges app_metadata itself.
  if (input.role && input.role !== existing.role && existing.authUserId) {
    const admin = createAdminClient();
    const { data: current } = await admin.auth.admin.getUserById(existing.authUserId);
    const { error: metaError } = await admin.auth.admin.updateUserById(existing.authUserId, {
      app_metadata: { ...(current?.user?.app_metadata ?? {}), role: input.role },
    });
    if (metaError) throw new Error(`Could not update access level: ${metaError.message}`);
  }

  const [updated] = await db
    .update(schema.users)
    .set({ ...input, updatedAt: new Date() })
    .where(and(eqTenant(schema.users.tenantId, tenantId), eq(schema.users.id, id)))
    .returning();
  revalidatePath("/settings");
  return updated;
}
