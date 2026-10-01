import { db, schema } from "@/db";
import { asc } from "drizzle-orm";
import { eqTenant } from "@/lib/tenant/scope";

export async function listPricingRules(tenantId: string) {
  return db.query.pricingRules.findMany({
    where: eqTenant(schema.pricingRules.tenantId, tenantId),
    orderBy: [asc(schema.pricingRules.gameTypeId), asc(schema.pricingRules.priority)],
    with: { gameType: true, station: true },
  });
}
