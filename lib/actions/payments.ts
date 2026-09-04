"use server";

import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { round2 } from "@/lib/format";

function refreshPaths() {
  revalidatePath("/payments");
  revalidatePath("/active-sessions");
  revalidatePath("/bookings");
  revalidatePath("/customers");
  revalidatePath("/");
}

export type RecordPaymentInput = {
  paymentId: string;
  amount: number;
  method: "CASH" | "UPI" | "CARD" | "OTHER";
  staffId?: string;
  note?: string;
};

/** Records one money movement against an invoice (Payment row), updates the
 * running amountPaid/status, and mirrors the status onto the linked booking. */
export async function recordPayment(input: RecordPaymentInput) {
  const [payment] = await db.select().from(schema.payments).where(eq(schema.payments.id, input.paymentId));
  if (!payment) throw new Error("Payment record not found");

  const newAmountPaid = round2(Number(payment.amountPaid) + input.amount);
  const total = Number(payment.totalAmount);
  const status = newAmountPaid >= total ? "PAID" : newAmountPaid > 0 ? "PARTIALLY_PAID" : "PENDING";

  const [updatedPayment] = await db
    .update(schema.payments)
    .set({ amountPaid: newAmountPaid.toString(), status, updatedAt: new Date() })
    .where(eq(schema.payments.id, input.paymentId))
    .returning();

  await db.insert(schema.transactions).values({
    paymentId: payment.id,
    bookingId: payment.bookingId,
    sessionId: payment.sessionId,
    customerId: payment.customerId,
    amount: input.amount.toString(),
    method: input.method,
    note: input.note,
    staffId: input.staffId || null,
  });

  if (payment.bookingId) {
    await db
      .update(schema.bookings)
      .set({ paymentStatus: status, updatedAt: new Date() })
      .where(eq(schema.bookings.id, payment.bookingId));
  }

  refreshPaths();
  return updatedPayment;
}

/** Marks an invoice fully paid/unpaid in one click (used from Active Sessions). */
export async function setPaymentStatus(paymentId: string, status: "PAID" | "PENDING", method: "CASH" | "UPI" | "CARD" | "OTHER" = "CASH", staffId?: string) {
  const [payment] = await db.select().from(schema.payments).where(eq(schema.payments.id, paymentId));
  if (!payment) throw new Error("Payment record not found");

  if (status === "PAID") {
    const remaining = round2(Number(payment.totalAmount) - Number(payment.amountPaid));
    if (remaining > 0) {
      return recordPayment({ paymentId, amount: remaining, method, staffId, note: "Marked as paid" });
    }
    return payment;
  }

  const [updated] = await db
    .update(schema.payments)
    .set({ amountPaid: "0", status: "PENDING", updatedAt: new Date() })
    .where(eq(schema.payments.id, paymentId))
    .returning();

  if (payment.bookingId) {
    await db
      .update(schema.bookings)
      .set({ paymentStatus: "PENDING", updatedAt: new Date() })
      .where(eq(schema.bookings.id, payment.bookingId));
  }

  refreshPaths();
  return updated;
}
