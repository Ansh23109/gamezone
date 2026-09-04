import { db, schema } from "@/db";
import { asc, eq } from "drizzle-orm";

export async function listActiveStaff() {
  return db.select().from(schema.users).where(eq(schema.users.isActive, true)).orderBy(asc(schema.users.name));
}

export async function listAllStaff() {
  return db.select().from(schema.users).orderBy(asc(schema.users.name));
}
