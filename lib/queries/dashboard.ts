import { db, schema } from "@/db";
import { and, gte, lt, eq, inArray, ne } from "drizzle-orm";
import { round2 } from "@/lib/format";

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;

export async function getDashboardData(range: { start: Date; end: Date }) {
  const { start, end } = range;

  const [
    transactionsInRange,
    bookingsInRange,
    sessionsInRange,
    allActiveSessions,
    totalCustomers,
    stations,
    gameTypes,
    upcomingBookings,
  ] = await Promise.all([
    db.select().from(schema.transactions).where(and(gte(schema.transactions.createdAt, start), lt(schema.transactions.createdAt, end))),
    db.select().from(schema.bookings).where(and(gte(schema.bookings.startTime, start), lt(schema.bookings.startTime, end))),
    db
      .select()
      .from(schema.gamingSessions)
      .where(and(gte(schema.gamingSessions.actualStartTime, start), lt(schema.gamingSessions.actualStartTime, end))),
    db.select().from(schema.gamingSessions).where(inArray(schema.gamingSessions.status, ["ACTIVE", "PAUSED"])),
    db.select().from(schema.customers),
    db.select().from(schema.stations).where(eq(schema.stations.isActive, true)),
    db.select().from(schema.gameTypes).where(eq(schema.gameTypes.isActive, true)),
    db
      .select()
      .from(schema.bookings)
      .where(and(eq(schema.bookings.status, "UPCOMING"), gte(schema.bookings.startTime, new Date())))
      .orderBy(schema.bookings.startTime)
      .limit(8),
  ]);

  const gameTypeById = new Map(gameTypes.map((g) => [g.id, g]));
  const stationById = new Map(stations.map((s) => [s.id, s]));

  // ---- Core KPIs ----
  const totalSales = round2(transactionsInRange.reduce((sum, t) => sum + Number(t.amount), 0));
  const totalBookingsCount = bookingsInRange.length;
  const activeSessionsCount = allActiveSessions.length;
  const completedSessionsInRange = sessionsInRange.filter((s) => s.status === "COMPLETED");
  const completedSessionsCount = completedSessionsInRange.length;

  const totalGamingMinutes = sessionsInRange
    .filter((s) => s.status === "COMPLETED" && s.actualDurationMinutes)
    .reduce((sum, s) => sum + (s.actualDurationMinutes ?? 0), 0);
  const totalGamingHours = round2(totalGamingMinutes / 60);

  const nonCancelledBookings = bookingsInRange.filter((b) => b.status !== "CANCELLED" && b.status !== "NO_SHOW");
  const avgBookingValue =
    nonCancelledBookings.length > 0
      ? round2(nonCancelledBookings.reduce((sum, b) => sum + Number(b.price), 0) / nonCancelledBookings.length)
      : 0;

  // Most popular game — by number of sessions started in range.
  const sessionCountByGameType = new Map<string, number>();
  for (const s of sessionsInRange) {
    sessionCountByGameType.set(s.gameTypeId, (sessionCountByGameType.get(s.gameTypeId) ?? 0) + 1);
  }
  let mostPopularGame: string | null = null;
  let mostPopularCount = 0;
  for (const [gtId, count] of sessionCountByGameType) {
    if (count > mostPopularCount) {
      mostPopularCount = count;
      mostPopularGame = gameTypeById.get(gtId)?.name ?? null;
    }
  }

  // ---- Revenue / hours by game type ----
  const revenueByGameTypeMap = new Map<string, number>();
  for (const t of transactionsInRange) {
    if (!t.gameTypeId) continue;
    revenueByGameTypeMap.set(t.gameTypeId, round2((revenueByGameTypeMap.get(t.gameTypeId) ?? 0) + Number(t.amount)));
  }
  const revenueByGameType = gameTypes
    .map((g) => ({ gameType: g.name, color: g.color ?? "#6366f1", revenue: revenueByGameTypeMap.get(g.id) ?? 0 }))
    .filter((r) => r.revenue > 0)
    .sort((a, b) => b.revenue - a.revenue);

  const hoursByGameTypeMap = new Map<string, number>();
  for (const s of completedSessionsInRange) {
    hoursByGameTypeMap.set(
      s.gameTypeId,
      round2((hoursByGameTypeMap.get(s.gameTypeId) ?? 0) + (s.actualDurationMinutes ?? 0) / 60),
    );
  }
  const gamingHoursByGameType = gameTypes
    .map((g) => ({ gameType: g.name, color: g.color ?? "#6366f1", hours: hoursByGameTypeMap.get(g.id) ?? 0 }))
    .filter((r) => r.hours > 0)
    .sort((a, b) => b.hours - a.hours);

  // ---- Station utilization: minutes played / minutes available in range ----
  const rangeMinutes = Math.max(1, (end.getTime() - start.getTime()) / 60000);
  const minutesByStation = new Map<string, number>();
  for (const s of sessionsInRange) {
    const minutes = s.actualDurationMinutes ?? Math.round((Date.now() - s.actualStartTime.getTime()) / 60000);
    minutesByStation.set(s.stationId, (minutesByStation.get(s.stationId) ?? 0) + minutes);
  }
  const stationUtilization = stations
    .map((st) => {
      const minutes = minutesByStation.get(st.id) ?? 0;
      return {
        station: st.name,
        gameType: gameTypeById.get(st.gameTypeId)?.name ?? "",
        utilizationPct: round2(Math.min(100, (minutes / rangeMinutes) * 100)),
      };
    })
    .sort((a, b) => b.utilizationPct - a.utilizationPct);

  const overallUtilization =
    stations.length > 0
      ? round2(stationUtilization.reduce((sum, s) => sum + s.utilizationPct, 0) / stations.length)
      : 0;

  // ---- Revenue / bookings over time (bucketed) ----
  const spanDays = (end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000);
  const bucketByHour = spanDays <= 1.5;

  const revenueOverTime = bucketByHour
    ? bucketByHourOfDay(transactionsInRange, (t) => t.createdAt, (t) => Number(t.amount))
    : bucketByDay(transactionsInRange, (t) => t.createdAt, (t) => Number(t.amount), start, end);

  const bookingsOverTime = bucketByHour
    ? bucketByHourOfDay(bookingsInRange, (b) => b.startTime, () => 1)
    : bucketByDay(bookingsInRange, (b) => b.startTime, () => 1, start, end);

  // ---- Peak booking hours (hour-of-day histogram, all bookings in range) ----
  const peakHours = Array.from({ length: 24 }, (_, hour) => ({ hour, bookings: 0 }));
  for (const b of bookingsInRange) {
    const istHour = new Date(b.startTime.getTime() + 5.5 * 60 * 60 * 1000).getUTCHours();
    peakHours[istHour].bookings += 1;
  }

  return {
    kpis: {
      totalSales,
      totalBookings: totalBookingsCount,
      activeSessions: activeSessionsCount,
      completedSessions: completedSessionsCount,
      upcomingBookingsCount: upcomingBookings.length,
      totalCustomers: totalCustomers.length,
      totalGamingHours,
      avgBookingValue,
      mostPopularGame,
      overallUtilization,
    },
    revenueByGameType,
    gamingHoursByGameType,
    stationUtilization,
    revenueOverTime,
    bookingsOverTime,
    peakHours,
    upcomingBookings,
    gameTypeById,
    stationById,
  };
}

function bucketByHourOfDay<T>(
  rows: T[],
  getDate: (r: T) => Date,
  getValue: (r: T) => number,
): { label: string; value: number }[] {
  const buckets = Array.from({ length: 24 }, (_, h) => ({ label: formatHourLabel(h), value: 0 }));
  for (const row of rows) {
    const istHour = new Date(getDate(row).getTime() + 5.5 * 60 * 60 * 1000).getUTCHours();
    buckets[istHour].value = round2(buckets[istHour].value + getValue(row));
  }
  return buckets;
}

function bucketByDay<T>(
  rows: T[],
  getDate: (r: T) => Date,
  getValue: (r: T) => number,
  start: Date,
  end: Date,
): { label: string; value: number }[] {
  const days: { key: string; label: string; value: number }[] = [];
  const cursor = new Date(start);
  while (cursor < end) {
    const ist = new Date(cursor.getTime() + 5.5 * 60 * 60 * 1000);
    const key = `${ist.getUTCFullYear()}-${ist.getUTCMonth()}-${ist.getUTCDate()}`;
    days.push({ key, label: `${ist.getUTCDate()}/${ist.getUTCMonth() + 1}`, value: 0 });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  const byKey = new Map(days.map((d) => [d.key, d]));
  for (const row of rows) {
    const ist = new Date(getDate(row).getTime() + 5.5 * 60 * 60 * 1000);
    const key = `${ist.getUTCFullYear()}-${ist.getUTCMonth()}-${ist.getUTCDate()}`;
    const bucket = byKey.get(key);
    if (bucket) bucket.value = round2(bucket.value + getValue(row));
  }
  return days.map((d) => ({ label: d.label, value: d.value }));
}

function formatHourLabel(h: number): string {
  const period = h < 12 ? "AM" : "PM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}${period}`;
}
