import { db, schema } from "@/db";
import { and, asc, eq } from "drizzle-orm";
import { eqTenant } from "@/lib/tenant/scope";

export async function listActiveStaff(tenantId: string) {
  return db
    .select()
    .from(schema.users)
    .where(and(eqTenant(schema.users.tenantId, tenantId), eq(schema.users.isActive, true)))
    .orderBy(asc(schema.users.name));
}

export async function listAllStaff(tenantId: string) {
  return db.select().from(schema.users).where(eqTenant(schema.users.tenantId, tenantId)).orderBy(asc(schema.users.name));
}
