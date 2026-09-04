"use server";

import { db, schema } from "@/db";
import { eq } from "drizzle-orm";

/** Finds a customer by mobile number, or creates one. Used by both the
 * booking form and the walk-in flow so a phone number always maps to one
 * customer record (visit counts, spend, history). */
export async function findOrCreateCustomer(input: { name: string; mobile?: string }) {
  const name = input.name?.trim() || "Walk-in Guest";
  let mobile = input.mobile?.trim();

  if (mobile) {
    const [existing] = await db.select().from(schema.customers).where(eq(schema.customers.mobile, mobile));
    if (existing) {
      // Keep the name reasonably fresh if the customer gave a fuller name this time.
      if (name && name !== "Walk-in Guest" && name !== existing.name) {
        const [updated] = await db
          .update(schema.customers)
          .set({ name, updatedAt: new Date() })
          .where(eq(schema.customers.id, existing.id))
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
    .values({ name, mobile })
    .returning();
  return created;
}

export async function updateCustomer(
  id: string,
  input: { name?: string; mobile?: string; email?: string | null; notes?: string | null },
) {
  const [updated] = await db
    .update(schema.customers)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(schema.customers.id, id))
    .returning();
  return updated;
}
