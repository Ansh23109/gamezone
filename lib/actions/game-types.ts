"use server";

import { db, schema } from "@/db";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { eqTenant } from "@/lib/tenant/scope";
import { requireTenantRole } from "@/lib/auth/session";

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function refreshPaths() {
  revalidatePath("/games-stations");
  revalidatePath("/pricing");
  revalidatePath("/bookings");
  revalidatePath("/calendar");
  revalidatePath("/");
}

export async function createGameType(input: {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
}) {
  const { tenantId } = await requireTenantRole(["ADMIN", "MANAGER"]);
  const [gameType] = await db
    .insert(schema.gameTypes)
    .values({
      tenantId,
      name: input.name,
      slug: slugify(input.name),
      description: input.description,
      icon: input.icon,
      color: input.color,
    })
    .returning();
  refreshPaths();
  return gameType;
}

export async function updateGameType(
  id: string,
  input: Partial<{ name: string; description: string | null; icon: string; color: string; isActive: boolean }>,
) {
  const { tenantId } = await requireTenantRole(["ADMIN", "MANAGER"]);
  const [updated] = await db
    .update(schema.gameTypes)
    .set({ ...input, updatedAt: new Date() })
    .where(and(eqTenant(schema.gameTypes.tenantId, tenantId), eq(schema.gameTypes.id, id)))
    .returning();
  refreshPaths();
  return updated;
}

export async function deleteGameType(id: string) {
  const { tenantId } = await requireTenantRole(["ADMIN", "MANAGER"]);
  await db.delete(schema.gameTypes).where(and(eqTenant(schema.gameTypes.tenantId, tenantId), eq(schema.gameTypes.id, id)));
  refreshPaths();
}
