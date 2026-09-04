"use server";

import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

function refreshPaths() {
  revalidatePath("/pricing");
  revalidatePath("/bookings");
  revalidatePath("/calendar");
}

export type PricingRuleInput = {
  gameTypeId: string;
  stationId?: string | null;
  name: string;
  unit: "PER_HOUR" | "PER_30_MIN" | "PER_GAME" | "CUSTOM";
  durationMinutes: number;
  price: number;
  tier: "STANDARD" | "PEAK" | "OFF_PEAK";
  daysOfWeek?: number[];
  startTime?: string | null;
  endTime?: string | null;
  priority?: number;
};

export async function createPricingRule(input: PricingRuleInput) {
  const [rule] = await db
    .insert(schema.pricingRules)
    .values({
      gameTypeId: input.gameTypeId,
      stationId: input.stationId || null,
      name: input.name,
      unit: input.unit,
      durationMinutes: input.durationMinutes,
      price: input.price.toString(),
      tier: input.tier,
      daysOfWeek: input.daysOfWeek ?? [],
      startTime: input.startTime || null,
      endTime: input.endTime || null,
      priority: input.priority ?? 0,
    })
    .returning();
  refreshPaths();
  return rule;
}

export async function updatePricingRule(id: string, input: Partial<PricingRuleInput> & { isActive?: boolean }) {
  const { price, ...rest } = input;
  const [updated] = await db
    .update(schema.pricingRules)
    .set({
      ...rest,
      ...(price !== undefined ? { price: price.toString() } : {}),
      updatedAt: new Date(),
    })
    .where(eq(schema.pricingRules.id, id))
    .returning();
  refreshPaths();
  return updated;
}

export async function deletePricingRule(id: string) {
  await db.delete(schema.pricingRules).where(eq(schema.pricingRules.id, id));
  refreshPaths();
}
