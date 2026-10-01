import { db, schema } from "@/db";
import { and, eq, lt, gt, ne, notInArray } from "drizzle-orm";
import { eqTenant } from "@/lib/tenant/scope";

const NON_BLOCKING_STATUSES = ["CANCELLED", "NO_SHOW"] as const;

/**
 * Returns bookings on `stationId` that overlap [startTime, endTime), excluding
 * cancelled/no-show bookings (and optionally one booking, e.g. when editing).
 */
export async function findConflictingBookings(
  tenantId: string,
  params: {
    stationId: string;
    startTime: Date;
    endTime: Date;
    excludeBookingId?: string;
  },
) {
  const { stationId, startTime, endTime, excludeBookingId } = params;

  const conflicts = await db
    .select()
    .from(schema.bookings)
    .where(
      and(
        eqTenant(schema.bookings.tenantId, tenantId),
        eq(schema.bookings.stationId, stationId),
        notInArray(schema.bookings.status, [...NON_BLOCKING_STATUSES]),
        lt(schema.bookings.startTime, endTime),
        gt(schema.bookings.endTime, startTime),
        excludeBookingId ? ne(schema.bookings.id, excludeBookingId) : undefined,
      ),
    );

  return conflicts;
}

export async function isStationAvailable(
  tenantId: string,
  params: {
    stationId: string;
    startTime: Date;
    endTime: Date;
    excludeBookingId?: string;
  },
): Promise<boolean> {
  const conflicts = await findConflictingBookings(tenantId, params);
  return conflicts.length === 0;
}

/** Finds every station of a given game type that is free for the requested window. */
export async function findAvailableStations(
  tenantId: string,
  params: {
    gameTypeId: string;
    startTime: Date;
    endTime: Date;
  },
) {
  const stations = await db
    .select()
    .from(schema.stations)
    .where(and(eqTenant(schema.stations.tenantId, tenantId), eq(schema.stations.gameTypeId, params.gameTypeId), eq(schema.stations.isActive, true)));

  const available = [];
  for (const station of stations) {
    if (station.status === "MAINTENANCE" || station.status === "OFFLINE") continue;
    const free = await isStationAvailable(tenantId, {
      stationId: station.id,
      startTime: params.startTime,
      endTime: params.endTime,
    });
    if (free) available.push(station);
  }
  return available;
}
