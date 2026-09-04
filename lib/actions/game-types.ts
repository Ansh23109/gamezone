"use server";

import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

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
  const [gameType] = await db
    .insert(schema.gameTypes)
    .values({
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
  const [updated] = await db
    .update(schema.gameTypes)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(schema.gameTypes.id, id))
    .returning();
  refreshPaths();
  return updated;
}

export async function deleteGameType(id: string) {
  await db.delete(schema.gameTypes).where(eq(schema.gameTypes.id, id));
  refreshPaths();
}
