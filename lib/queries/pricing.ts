import { db, schema } from "@/db";
import { asc } from "drizzle-orm";

export async function listPricingRules() {
  return db.query.pricingRules.findMany({
    orderBy: [asc(schema.pricingRules.gameTypeId), asc(schema.pricingRules.priority)],
    with: { gameType: true, station: true },
  });
}
