import { db, schema } from "@/db";
import { and, gte, lt, eq, desc, asc } from "drizzle-orm";
import { dayBoundsForDateString, toIstDateInputValue } from "@/lib/date-range";

export async function listBookings(filters?: {
  /** "yyyy-mm-dd" — filters to that IST calendar day. */
  date?: string;
  rangeStart?: Date;
  rangeEnd?: Date;
  status?: string;
  gameTypeId?: string;
  stationId?: string;
}) {
  const conditions = [];
  if (filters?.date) {
    const { start, end } = dayBoundsForDateString(filters.date);
    conditions.push(gte(schema.bookings.startTime, start), lt(schema.bookings.startTime, end));
  }
  if (filters?.rangeStart) conditions.push(gte(schema.bookings.startTime, filters.rangeStart));
  if (filters?.rangeEnd) conditions.push(lt(schema.bookings.startTime, filters.rangeEnd));
  if (filters?.status) conditions.push(eq(schema.bookings.status, filters.status as any));
  if (filters?.gameTypeId) conditions.push(eq(schema.bookings.gameTypeId, filters.gameTypeId));
  if (filters?.stationId) conditions.push(eq(schema.bookings.stationId, filters.stationId));

  const rows = await db.query.bookings.findMany({
    where: conditions.length ? and(...conditions) : undefined,
    orderBy: [asc(schema.bookings.startTime)],
    with: {
      customer: true,
      gameType: true,
      station: true,
      session: true,
      payment: true,
    },
  });
  return rows;
}

export async function getBookingById(id: string) {
  return db.query.bookings.findFirst({
    where: eq(schema.bookings.id, id),
    with: {
      customer: true,
      gameType: true,
      station: true,
      session: true,
      payment: true,
      createdBy: true,
    },
  });
}

export async function listTodaysBookings() {
  return listBookings({ date: toIstDateInputValue(new Date()) });
}

export async function listRecentBookings(limit = 10) {
  return db.query.bookings.findMany({
    orderBy: [desc(schema.bookings.createdAt)],
    limit,
    with: { customer: true, gameType: true, station: true },
  });
}
