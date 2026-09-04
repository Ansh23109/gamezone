import { db, schema } from "@/db";
import { inArray, desc, eq } from "drizzle-orm";

export async function listActiveSessions() {
  return db.query.gamingSessions.findMany({
    where: inArray(schema.gamingSessions.status, ["ACTIVE", "PAUSED"]),
    orderBy: [desc(schema.gamingSessions.actualStartTime)],
    with: {
      customer: true,
      gameType: true,
      station: true,
      payment: true,
    },
  });
}

export async function getSessionById(id: string) {
  return db.query.gamingSessions.findFirst({
    where: eq(schema.gamingSessions.id, id),
    with: { customer: true, gameType: true, station: true, payment: true, booking: true },
  });
}

export async function listRecentSessions(limit = 20) {
  return db.query.gamingSessions.findMany({
    orderBy: [desc(schema.gamingSessions.createdAt)],
    limit,
    with: { customer: true, gameType: true, station: true },
  });
}
