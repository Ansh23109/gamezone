import { db, schema } from "@/db";
import { and, eq, lt, gt, ne, notInArray } from "drizzle-orm";

const NON_BLOCKING_STATUSES = ["CANCELLED", "NO_SHOW"] as const;

/**
 * Returns bookings on `stationId` that overlap [startTime, endTime), excluding
 * cancelled/no-show bookings (and optionally one booking, e.g. when editing).
 */
export async function findConflictingBookings(params: {
  stationId: string;
  startTime: Date;
  endTime: Date;
  excludeBookingId?: string;
}) {
  const { stationId, startTime, endTime, excludeBookingId } = params;

  const conflicts = await db
    .select()
    .from(schema.bookings)
    .where(
      and(
        eq(schema.bookings.stationId, stationId),
        notInArray(schema.bookings.status, [...NON_BLOCKING_STATUSES]),
        lt(schema.bookings.startTime, endTime),
        gt(schema.bookings.endTime, startTime),
        excludeBookingId ? ne(schema.bookings.id, excludeBookingId) : undefined,
      ),
    );

  return conflicts;
}

export async function isStationAvailable(params: {
  stationId: string;
  startTime: Date;
  endTime: Date;
  excludeBookingId?: string;
}): Promise<boolean> {
  const conflicts = await findConflictingBookings(params);
  return conflicts.length === 0;
}

/** Finds every station of a given game type that is free for the requested window. */
export async function findAvailableStations(params: {
  gameTypeId: string;
  startTime: Date;
  endTime: Date;
}) {
  const stations = await db
    .select()
    .from(schema.stations)
    .where(and(eq(schema.stations.gameTypeId, params.gameTypeId), eq(schema.stations.isActive, true)));

  const available = [];
  for (const station of stations) {
    if (station.status === "MAINTENANCE" || station.status === "OFFLINE") continue;
    const free = await isStationAvailable({
      stationId: station.id,
      startTime: params.startTime,
      endTime: params.endTime,
    });
    if (free) available.push(station);
  }
  return available;
}
