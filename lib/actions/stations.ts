"use server";

import { db, schema } from "@/db";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { eqTenant } from "@/lib/tenant/scope";
import { requireTenantUser, requireTenantRole } from "@/lib/auth/session";

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
  const { tenantId } = await requireTenantRole(["ADMIN", "MANAGER"]);
  const [station] = await db
    .insert(schema.stations)
    .values({
      tenantId,
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
  const { tenantId } = await requireTenantRole(["ADMIN", "MANAGER"]);
  const [updated] = await db
    .update(schema.stations)
    .set({ ...input, updatedAt: new Date() })
    .where(and(eqTenant(schema.stations.tenantId, tenantId), eq(schema.stations.id, id)))
    .returning();
  refreshPaths();
  return updated;
}

/** Operational status flip (e.g. "put this under maintenance") — any active
 * staff member, not just ADMIN/MANAGER, since it's a day-to-day action. */
export async function setStationStatus(
  id: string,
  status: "AVAILABLE" | "BOOKED" | "ACTIVE" | "MAINTENANCE" | "OFFLINE",
) {
  const { tenantId } = await requireTenantUser();
  const [updated] = await db
    .update(schema.stations)
    .set({ status, updatedAt: new Date() })
    .where(and(eqTenant(schema.stations.tenantId, tenantId), eq(schema.stations.id, id)))
    .returning();
  refreshPaths();
  return updated;
}

export async function deleteStation(id: string) {
  const { tenantId } = await requireTenantRole(["ADMIN", "MANAGER"]);
  await db.delete(schema.stations).where(and(eqTenant(schema.stations.tenantId, tenantId), eq(schema.stations.id, id)));
  refreshPaths();
}
