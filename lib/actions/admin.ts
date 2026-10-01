"use server";

import { db, schema } from "@/db";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { invalidateTenantCache } from "@/lib/tenant/resolve";

export async function listTenants() {
  await requireOwner();
  return db.select().from(schema.tenants).orderBy(desc(schema.tenants.createdAt));
}

export type CreateTenantInput = {
  slug: string;
  displayName: string;
  primaryColor?: string;
  adminName: string;
  adminEmail: string;
};

/**
 * Onboards a new client: creates the tenants row, then invites their first
 * ADMIN via Supabase Auth (same inviteUserByEmail + app_metadata pattern as
 * lib/actions/users.ts's createStaff — this is the one place that can
 * bootstrap a tenant's very first login, since createStaff itself requires
 * an existing ADMIN of that tenant to call it).
 */
export async function createTenant(input: CreateTenantInput) {
  await requireOwner();

  const slug = input.slug
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/(^-|-$)/g, "");
  if (!slug) throw new Error("Invalid slug.");

  const [tenant] = await db
    .insert(schema.tenants)
    .values({
      slug,
      subdomain: slug,
      displayName: input.displayName,
      primaryColor: input.primaryColor || "#6366f1",
    })
    .returning();

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.inviteUserByEmail(input.adminEmail);
  if (error || !data.user) {
    throw new Error(`Tenant "${slug}" created, but could not invite ${input.adminEmail}: ${error?.message ?? "unknown error"}`);
  }

  const { error: metaError } = await admin.auth.admin.updateUserById(data.user.id, {
    app_metadata: { role: "ADMIN", tenantId: tenant.id },
  });
  if (metaError) {
    throw new Error(`Tenant "${slug}" created and ${input.adminEmail} invited, but failed to set their access level: ${metaError.message}`);
  }

  await db.insert(schema.users).values({
    tenantId: tenant.id,
    authUserId: data.user.id,
    name: input.adminName,
    email: input.adminEmail,
    role: "ADMIN",
  });

  revalidatePath("/admin");
  return tenant;
}

export async function setTenantStatus(id: string, status: "ACTIVE" | "SUSPENDED") {
  await requireOwner();
  const [tenant] = await db.update(schema.tenants).set({ status, updatedAt: new Date() }).where(eq(schema.tenants.id, id)).returning();
  if (tenant) invalidateTenantCache(tenant.slug);
  revalidatePath("/admin");
  return tenant;
}
