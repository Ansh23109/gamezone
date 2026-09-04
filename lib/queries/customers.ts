import { db, schema } from "@/db";
import { eq, desc } from "drizzle-orm";
import { round2 } from "@/lib/format";

export type CustomerWithStats = Awaited<ReturnType<typeof listCustomersWithStats>>[number];

/** Computes real, on-the-fly stats per customer from sessions/transactions —
 * nothing is cached on the Customer row, so it can never drift out of sync. */
export async function listCustomersWithStats() {
  const [customers, sessions, transactions, gameTypes] = await Promise.all([
    db.select().from(schema.customers).orderBy(desc(schema.customers.createdAt)),
    db.select().from(schema.gamingSessions),
    db.select().from(schema.transactions),
    db.select().from(schema.gameTypes),
  ]);

  const gameTypeById = new Map(gameTypes.map((g) => [g.id, g]));

  return customers.map((customer) => {
    const customerSessions = sessions.filter((s) => s.customerId === customer.id);
    const customerTransactions = transactions.filter((t) => t.customerId === customer.id);

    const completedSessions = customerSessions.filter((s) => s.status === "COMPLETED");
    const totalVisits = completedSessions.length;
    const totalSpent = round2(customerTransactions.reduce((sum, t) => sum + Number(t.amount), 0));
    const totalMinutes = completedSessions.reduce((sum, s) => sum + (s.actualDurationMinutes ?? 0), 0);
    const totalHours = round2(totalMinutes / 60);

    const gameCounts = new Map<string, number>();
    for (const s of customerSessions) {
      gameCounts.set(s.gameTypeId, (gameCounts.get(s.gameTypeId) ?? 0) + 1);
    }
    let favouriteGame: string | null = null;
    let maxCount = 0;
    for (const [gtId, count] of gameCounts) {
      if (count > maxCount) {
        maxCount = count;
        favouriteGame = gameTypeById.get(gtId)?.name ?? null;
      }
    }

    const lastVisit = customerSessions.reduce<Date | null>((latest, s) => {
      const t = s.actualStartTime;
      return !latest || t > latest ? t : latest;
    }, null);

    return {
      ...customer,
      totalVisits,
      totalSpent,
      totalHours,
      favouriteGame,
      lastVisit,
    };
  });
}

export async function getCustomerDetail(id: string) {
  const [customer] = await db.select().from(schema.customers).where(eq(schema.customers.id, id));
  if (!customer) return null;

  const bookings = await db.query.bookings.findMany({
    where: eq(schema.bookings.customerId, id),
    orderBy: [desc(schema.bookings.startTime)],
    with: { gameType: true, station: true, session: true, payment: true },
  });

  const transactions = await db.query.transactions.findMany({
    where: eq(schema.transactions.customerId, id),
    orderBy: [desc(schema.transactions.createdAt)],
    with: { gameType: true, station: true },
  });

  const completedSessions = bookings.filter((b) => b.session?.status === "COMPLETED");
  const totalVisits = completedSessions.length;
  const totalSpent = round2(transactions.reduce((sum, t) => sum + Number(t.amount), 0));
  const totalMinutes = completedSessions.reduce((sum, b) => sum + (b.session?.actualDurationMinutes ?? 0), 0);
  const totalHours = round2(totalMinutes / 60);

  const gameCounts = new Map<string, number>();
  for (const b of bookings) {
    gameCounts.set(b.gameType.name, (gameCounts.get(b.gameType.name) ?? 0) + 1);
  }
  let favouriteGame: string | null = null;
  let maxCount = 0;
  for (const [name, count] of gameCounts) {
    if (count > maxCount) {
      maxCount = count;
      favouriteGame = name;
    }
  }

  return {
    customer,
    bookings,
    transactions,
    stats: { totalVisits, totalSpent, totalHours, favouriteGame },
  };
}
