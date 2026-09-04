import { db, schema } from "@/db";
import { and, gte, lt } from "drizzle-orm";
import { round2 } from "@/lib/format";

export async function getReportsData(range: { start: Date; end: Date }) {
  const { start, end } = range;

  const [transactions, sessions, bookings, stations, gameTypes] = await Promise.all([
    db.select().from(schema.transactions).where(and(gte(schema.transactions.createdAt, start), lt(schema.transactions.createdAt, end))),
    db
      .select()
      .from(schema.gamingSessions)
      .where(and(gte(schema.gamingSessions.actualStartTime, start), lt(schema.gamingSessions.actualStartTime, end))),
    db.select().from(schema.bookings).where(and(gte(schema.bookings.startTime, start), lt(schema.bookings.startTime, end))),
    db.select().from(schema.stations),
    db.select().from(schema.gameTypes),
  ]);

  const gameTypeById = new Map(gameTypes.map((g) => [g.id, g]));
  const stationById = new Map(stations.map((s) => [s.id, s]));

  const completedSessions = sessions.filter((s) => s.status === "COMPLETED");
  const totalRevenue = round2(transactions.reduce((sum, t) => sum + Number(t.amount), 0));
  const totalSessions = sessions.length;
  const totalMinutes = completedSessions.reduce((sum, s) => sum + (s.actualDurationMinutes ?? 0), 0);
  const totalHours = round2(totalMinutes / 60);
  const avgSessionDurationMinutes =
    completedSessions.length > 0 ? Math.round(totalMinutes / completedSessions.length) : 0;
  const avgRevenuePerSession =
    completedSessions.length > 0
      ? round2(completedSessions.reduce((sum, s) => sum + Number(s.totalAmount), 0) / completedSessions.length)
      : 0;

  // Revenue / sessions / hours per game
  const perGame = new Map<string, { revenue: number; sessions: number; hours: number }>();
  for (const g of gameTypes) perGame.set(g.id, { revenue: 0, sessions: 0, hours: 0 });
  for (const t of transactions) {
    if (!t.gameTypeId) continue;
    const entry = perGame.get(t.gameTypeId);
    if (entry) entry.revenue = round2(entry.revenue + Number(t.amount));
  }
  for (const s of sessions) {
    const entry = perGame.get(s.gameTypeId);
    if (entry) entry.sessions += 1;
  }
  for (const s of completedSessions) {
    const entry = perGame.get(s.gameTypeId);
    if (entry) entry.hours = round2(entry.hours + (s.actualDurationMinutes ?? 0) / 60);
  }
  const revenueByGame = gameTypes
    .map((g) => ({ name: g.name, color: g.color ?? "#6366f1", value: perGame.get(g.id)?.revenue ?? 0 }))
    .sort((a, b) => b.value - a.value);
  const sessionsByGame = gameTypes
    .map((g) => ({ name: g.name, color: g.color ?? "#6366f1", value: perGame.get(g.id)?.sessions ?? 0 }))
    .sort((a, b) => b.value - a.value);
  const hoursByGame = gameTypes
    .map((g) => ({ name: g.name, color: g.color ?? "#6366f1", value: perGame.get(g.id)?.hours ?? 0 }))
    .sort((a, b) => b.value - a.value);

  // Revenue per station + top-performing stations
  const revenueByStation = new Map<string, number>();
  const minutesByStation = new Map<string, number>();
  for (const t of transactions) {
    if (!t.stationId) continue;
    revenueByStation.set(t.stationId, round2((revenueByStation.get(t.stationId) ?? 0) + Number(t.amount)));
  }
  for (const s of sessions) {
    const minutes = s.actualDurationMinutes ?? Math.round((Date.now() - s.actualStartTime.getTime()) / 60000);
    minutesByStation.set(s.stationId, (minutesByStation.get(s.stationId) ?? 0) + minutes);
  }
  const rangeMinutes = Math.max(1, (end.getTime() - start.getTime()) / 60000);
  const stationPerformance = stations
    .map((st) => ({
      station: st.name,
      gameType: gameTypeById.get(st.gameTypeId)?.name ?? "",
      revenue: revenueByStation.get(st.id) ?? 0,
      utilizationPct: round2(Math.min(100, ((minutesByStation.get(st.id) ?? 0) / rangeMinutes) * 100)),
    }))
    .sort((a, b) => b.revenue - a.revenue);

  // Revenue by payment method
  const byMethod = new Map<string, number>();
  for (const t of transactions) {
    byMethod.set(t.method, round2((byMethod.get(t.method) ?? 0) + Number(t.amount)));
  }
  const revenueByPaymentMethod = Array.from(byMethod.entries()).map(([method, value]) => ({ method, value }));

  // Hourly occupancy (0-23, IST) — % of active stations at each hour based on sessions
  const hourlyOccupancy = Array.from({ length: 24 }, (_, hour) => ({ hour, sessions: 0 }));
  for (const s of sessions) {
    const istHour = new Date(s.actualStartTime.getTime() + 5.5 * 60 * 60 * 1000).getUTCHours();
    hourlyOccupancy[istHour].sessions += 1;
  }

  // Revenue by day (for the range, always daily buckets in reports)
  const days: { key: string; label: string; revenue: number; bookings: number }[] = [];
  const cursor = new Date(start);
  while (cursor < end) {
    const ist = new Date(cursor.getTime() + 5.5 * 60 * 60 * 1000);
    const key = `${ist.getUTCFullYear()}-${ist.getUTCMonth()}-${ist.getUTCDate()}`;
    days.push({ key, label: `${ist.getUTCDate()}/${ist.getUTCMonth() + 1}`, revenue: 0, bookings: 0 });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  const dayByKey = new Map(days.map((d) => [d.key, d]));
  for (const t of transactions) {
    const ist = new Date(t.createdAt.getTime() + 5.5 * 60 * 60 * 1000);
    const key = `${ist.getUTCFullYear()}-${ist.getUTCMonth()}-${ist.getUTCDate()}`;
    const bucket = dayByKey.get(key);
    if (bucket) bucket.revenue = round2(bucket.revenue + Number(t.amount));
  }
  for (const b of bookings) {
    const ist = new Date(b.startTime.getTime() + 5.5 * 60 * 60 * 1000);
    const key = `${ist.getUTCFullYear()}-${ist.getUTCMonth()}-${ist.getUTCDate()}`;
    const bucket = dayByKey.get(key);
    if (bucket) bucket.bookings += 1;
  }

  // Repeat customers: customers with >1 completed session ever (not just in range)
  const allSessions = await db.select().from(schema.gamingSessions);
  const sessionCountByCustomer = new Map<string, number>();
  for (const s of allSessions.filter((s) => s.status === "COMPLETED")) {
    sessionCountByCustomer.set(s.customerId, (sessionCountByCustomer.get(s.customerId) ?? 0) + 1);
  }
  const repeatCustomers = Array.from(sessionCountByCustomer.values()).filter((c) => c > 1).length;
  const totalCustomersWithSessions = sessionCountByCustomer.size;

  return {
    totalRevenue,
    totalSessions,
    totalHours,
    avgSessionDurationMinutes,
    avgRevenuePerSession,
    revenueByGame,
    sessionsByGame,
    hoursByGame,
    stationPerformance,
    revenueByPaymentMethod,
    hourlyOccupancy,
    revenueByDay: days.map((d) => ({ label: d.label, revenue: d.revenue, bookings: d.bookings })),
    repeatCustomers,
    totalCustomersWithSessions,
  };
}
