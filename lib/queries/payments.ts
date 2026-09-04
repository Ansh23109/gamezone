import { db, schema } from "@/db";
import { and, gte, lt, desc, eq } from "drizzle-orm";
import { round2 } from "@/lib/format";

export async function listTransactions(range?: { start: Date; end: Date }, limit = 200) {
  const conditions = [];
  if (range) {
    conditions.push(gte(schema.transactions.createdAt, range.start), lt(schema.transactions.createdAt, range.end));
  }
  return db.query.transactions.findMany({
    where: conditions.length ? and(...conditions) : undefined,
    orderBy: [desc(schema.transactions.createdAt)],
    limit,
    with: { customer: true, gameType: true, station: true, staff: true, session: true, booking: true },
  });
}

export async function getDailySalesSummary(range: { start: Date; end: Date }) {
  const transactions = await db
    .select()
    .from(schema.transactions)
    .where(and(gte(schema.transactions.createdAt, range.start), lt(schema.transactions.createdAt, range.end)));

  const total = round2(transactions.reduce((sum, t) => sum + Number(t.amount), 0));
  const byMethod = new Map<string, number>();
  for (const t of transactions) {
    byMethod.set(t.method, round2((byMethod.get(t.method) ?? 0) + Number(t.amount)));
  }

  const pendingPayments = await db
    .select()
    .from(schema.payments)
    .where(eq(schema.payments.status, "PENDING"));
  const partialPayments = await db
    .select()
    .from(schema.payments)
    .where(eq(schema.payments.status, "PARTIALLY_PAID"));

  const outstanding = round2(
    [...pendingPayments, ...partialPayments].reduce(
      (sum, p) => sum + (Number(p.totalAmount) - Number(p.amountPaid)),
      0,
    ),
  );

  return {
    total,
    count: transactions.length,
    byMethod: Array.from(byMethod.entries()).map(([method, amount]) => ({ method, amount })),
    outstanding,
    outstandingCount: pendingPayments.length + partialPayments.length,
  };
}
