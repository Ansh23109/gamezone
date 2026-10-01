"use server";

import { db, schema } from "@/db";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { eqTenant } from "@/lib/tenant/scope";
import { requireTenantRole } from "@/lib/auth/session";

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
  const { tenantId } = await requireTenantRole(["ADMIN", "MANAGER"]);
  const [rule] = await db
    .insert(schema.pricingRules)
    .values({
      tenantId,
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
  const { tenantId } = await requireTenantRole(["ADMIN", "MANAGER"]);
  const { price, ...rest } = input;
  const [updated] = await db
    .update(schema.pricingRules)
    .set({
      ...rest,
      ...(price !== undefined ? { price: price.toString() } : {}),
      updatedAt: new Date(),
    })
    .where(and(eqTenant(schema.pricingRules.tenantId, tenantId), eq(schema.pricingRules.id, id)))
    .returning();
  refreshPaths();
  return updated;
}

export async function deletePricingRule(id: string) {
  const { tenantId } = await requireTenantRole(["ADMIN", "MANAGER"]);
  await db.delete(schema.pricingRules).where(and(eqTenant(schema.pricingRules.tenantId, tenantId), eq(schema.pricingRules.id, id)));
  refreshPaths();
}
