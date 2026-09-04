"use server";

import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

function refreshPaths() {
  revalidatePath("/games-stations");
  revalidatePath("/bookings");
  revalidatePath("/calendar");
  revalidatePath("/active-sessions");
  revalidatePath("/");
}

export async function createStation(input: {
  name: string;
  gameTypeId: string;
  location?: string;
  capacity?: number;
  notes?: string;
}) {
  const [station] = await db
    .insert(schema.stations)
    .values({
      name: input.name,
      gameTypeId: input.gameTypeId,
      location: input.location,
      capacity: input.capacity ?? 1,
      notes: input.notes,
    })
    .returning();
  refreshPaths();
  return station;
}

export async function updateStation(
  id: string,
  input: Partial<{
    name: string;
    location: string | null;
    capacity: number;
    notes: string | null;
    isActive: boolean;
  }>,
) {
  const [updated] = await db
    .update(schema.stations)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(schema.stations.id, id))
    .returning();
  refreshPaths();
  return updated;
}

export async function setStationStatus(
  id: string,
  status: "AVAILABLE" | "BOOKED" | "ACTIVE" | "MAINTENANCE" | "OFFLINE",
) {
  const [updated] = await db
    .update(schema.stations)
    .set({ status, updatedAt: new Date() })
    .where(eq(schema.stations.id, id))
    .returning();
  refreshPaths();
  return updated;
}

export async function deleteStation(id: string) {
  await db.delete(schema.stations).where(eq(schema.stations.id, id));
  refreshPaths();
}
