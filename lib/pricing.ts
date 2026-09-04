import { db, schema } from "@/db";
import { and, eq, isNull, or } from "drizzle-orm";
import { findApplicablePricingRuleFromList, computeAmountForRule, type PricingRuleLike } from "./pricing-shared";

export type PricingRuleRow = typeof schema.pricingRules.$inferSelect;

export async function findApplicablePricingRule(
  gameTypeId: string,
  stationId: string | null,
  at: Date,
): Promise<PricingRuleRow | null> {
  const rules = await db
    .select()
    .from(schema.pricingRules)
    .where(
      and(
        eq(schema.pricingRules.gameTypeId, gameTypeId),
        eq(schema.pricingRules.isActive, true),
        stationId
          ? or(eq(schema.pricingRules.stationId, stationId), isNull(schema.pricingRules.stationId))
          : isNull(schema.pricingRules.stationId),
      ),
    );

  return findApplicablePricingRuleFromList(rules as PricingRuleLike[], gameTypeId, stationId, at) as PricingRuleRow | null;
}

export { computeAmountForRule };

/** Convenience: find the rule and compute price in one call. */
export async function calculatePrice(params: {
  gameTypeId: string;
  stationId: string;
  startTime: Date;
  durationMinutes: number;
}): Promise<{ amount: number; rule: PricingRuleRow | null; ratePerHour: number | null }> {
  const rule = await findApplicablePricingRule(params.gameTypeId, params.stationId, params.startTime);
  if (!rule) return { amount: 0, rule: null, ratePerHour: null };
  const amount = computeAmountForRule(rule, params.durationMinutes);
  const ratePerHour =
    rule.unit === "PER_HOUR"
      ? Number(rule.price)
      : rule.unit === "PER_30_MIN"
        ? Number(rule.price) * 2
        : rule.unit === "CUSTOM"
          ? Math.round(((Number(rule.price) / rule.durationMinutes) * 60) * 100) / 100
          : null;
  return { amount, rule, ratePerHour };
}
