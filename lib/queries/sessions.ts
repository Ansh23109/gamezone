import { db, schema } from "@/db";
import { and, inArray, desc, eq } from "drizzle-orm";
import { eqTenant } from "@/lib/tenant/scope";

export async function listActiveSessions(tenantId: string) {
  return db.query.gamingSessions.findMany({
    where: and(eqTenant(schema.gamingSessions.tenantId, tenantId), inArray(schema.gamingSessions.status, ["ACTIVE", "PAUSED"])),
    orderBy: [desc(schema.gamingSessions.actualStartTime)],
    with: {
      customer: true,
      gameType: true,
      station: true,
      payment: true,
    },
  });
}

export async function getSessionById(tenantId: string, id: string) {
  return db.query.gamingSessions.findFirst({
    where: and(eqTenant(schema.gamingSessions.tenantId, tenantId), eq(schema.gamingSessions.id, id)),
    with: { customer: true, gameType: true, station: true, payment: true, booking: true },
  });
}

export async function listRecentSessions(tenantId: string, limit = 20) {
  return db.query.gamingSessions.findMany({
    where: eqTenant(schema.gamingSessions.tenantId, tenantId),
    orderBy: [desc(schema.gamingSessions.createdAt)],
    limit,
    with: { customer: true, gameType: true, station: true },
  });
}
