import { db, schema } from "@/db";
import { and, asc, eq } from "drizzle-orm";
import { eqTenant } from "@/lib/tenant/scope";

export async function listGameTypesWithStations(tenantId: string) {
  return db.query.gameTypes.findMany({
    where: eqTenant(schema.gameTypes.tenantId, tenantId),
    orderBy: [asc(schema.gameTypes.sortOrder), asc(schema.gameTypes.name)],
    with: {
      stations: { orderBy: [asc(schema.stations.name)] },
    },
  });
}

export async function listStations(tenantId: string) {
  return db.query.stations.findMany({
    where: eqTenant(schema.stations.tenantId, tenantId),
    orderBy: [asc(schema.stations.name)],
    with: { gameType: true },
  });
}

export async function listActiveGameTypes(tenantId: string) {
  return db
    .select()
    .from(schema.gameTypes)
    .where(and(eqTenant(schema.gameTypes.tenantId, tenantId), eq(schema.gameTypes.isActive, true)))
    .orderBy(asc(schema.gameTypes.sortOrder), asc(schema.gameTypes.name));
}

export async function listAllGameTypes(tenantId: string) {
  return db
    .select()
    .from(schema.gameTypes)
    .where(eqTenant(schema.gameTypes.tenantId, tenantId))
    .orderBy(asc(schema.gameTypes.sortOrder), asc(schema.gameTypes.name));
}

export async function getStationById(tenantId: string, id: string) {
  return db.query.stations.findFirst({
    where: and(eqTenant(schema.stations.tenantId, tenantId), eq(schema.stations.id, id)),
    with: { gameType: true },
  });
}
