import { db, schema } from "@/db";
import { asc, eq } from "drizzle-orm";

export async function listGameTypesWithStations() {
  return db.query.gameTypes.findMany({
    orderBy: [asc(schema.gameTypes.sortOrder), asc(schema.gameTypes.name)],
    with: {
      stations: { orderBy: [asc(schema.stations.name)] },
    },
  });
}

export async function listStations() {
  return db.query.stations.findMany({
    orderBy: [asc(schema.stations.name)],
    with: { gameType: true },
  });
}

export async function listActiveGameTypes() {
  return db
    .select()
    .from(schema.gameTypes)
    .where(eq(schema.gameTypes.isActive, true))
    .orderBy(asc(schema.gameTypes.sortOrder), asc(schema.gameTypes.name));
}

export async function listAllGameTypes() {
  return db.select().from(schema.gameTypes).orderBy(asc(schema.gameTypes.sortOrder), asc(schema.gameTypes.name));
}

export async function getStationById(id: string) {
  return db.query.stations.findFirst({ where: eq(schema.stations.id, id), with: { gameType: true } });
}
