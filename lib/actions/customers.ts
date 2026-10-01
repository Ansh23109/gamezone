"use server";

import { db, schema } from "@/db";
import { and, eq } from "drizzle-orm";
import { eqTenant } from "@/lib/tenant/scope";
import { requireTenantUser } from "@/lib/auth/session";

/** Finds a customer by mobile number, or creates one. Used by both the
 * booking form and the walk-in flow so a phone number always maps to one
 * customer record (visit counts, spend, history).
 *
 * This is a `"use server"` export — directly callable over the network, not
 * just from our own UI — so tenantId is deliberately NOT a parameter here:
 * a caller could pass any value. It's derived server-side from the
 * authenticated session instead. */
export async function findOrCreateCustomer(input: { name: string; mobile?: string }) {
  const { tenantId } = await requireTenantUser();
  const name = input.name?.trim() || "Walk-in Guest";
  let mobile = input.mobile?.trim();

  if (mobile) {
    const [existing] = await db
      .select()
      .from(schema.customers)
      .where(and(eqTenant(schema.customers.tenantId, tenantId), eq(schema.customers.mobile, mobile)));
    if (existing) {
      // Keep the name reasonably fresh if the customer gave a fuller name this time.
      if (name && name !== "Walk-in Guest" && name !== existing.name) {
        const [updated] = await db
          .update(schema.customers)
          .set({ name, updatedAt: new Date() })
          .where(and(eqTenant(schema.customers.tenantId, tenantId), eq(schema.customers.id, existing.id)))
          .returning();
        return updated;
      }
      return existing;
    }
  } else {
    // No mobile given (fully anonymous walk-in) — generate a unique placeholder
    // so the schema's uniqueness constraint holds while still tracking a visit.
    mobile = `GUEST-${Date.now().toString(36).toUpperCase()}`;
  }

  const [created] = await db
    .insert(schema.customers)
    .values({ tenantId, name, mobile })
    .returning();
  return created;
}

export async function updateCustomer(
  id: string,
  input: { name?: string; mobile?: string; email?: string | null; notes?: string | null },
) {
  const { tenantId } = await requireTenantUser();
  const [updated] = await db
    .update(schema.customers)
    .set({ ...input, updatedAt: new Date() })
    .where(and(eqTenant(schema.customers.tenantId, tenantId), eq(schema.customers.id, id)))
    .returning();
  return updated;
}
