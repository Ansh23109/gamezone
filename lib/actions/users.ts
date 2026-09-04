"use server";

import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function createStaff(input: { name: string; email?: string; role?: "ADMIN" | "MANAGER" | "STAFF" }) {
  const [user] = await db
    .insert(schema.users)
    .values({ name: input.name, email: input.email || null, role: input.role ?? "STAFF" })
    .returning();
  revalidatePath("/settings");
  return user;
}

export async function updateStaff(
  id: string,
  input: Partial<{ name: string; email: string | null; role: "ADMIN" | "MANAGER" | "STAFF"; isActive: boolean }>,
) {
  const [updated] = await db
    .update(schema.users)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(schema.users.id, id))
    .returning();
  revalidatePath("/settings");
  return updated;
}
