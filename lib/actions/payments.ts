"use server";

import { db, schema } from "@/db";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { round2 } from "@/lib/format";
import { eqTenant } from "@/lib/tenant/scope";
import { requireTenantUser } from "@/lib/auth/session";

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
  note?: string;
  // Set when this payment came from a gateway (Razorpay QR/payment-link
  // webhook) rather than a staff click — gatewayPaymentId is the webhook
  // idempotency key (unique in the schema), so a duplicate delivery hits
  // the unique constraint instead of double-crediting the payment.
  gatewayProvider?: string;
  gatewayPaymentId?: string;
};

/** Records one money movement against an invoice (Payment row), updates the
 * running amountPaid/status, and mirrors the status onto the linked booking.
 * Wrapped in a transaction since it writes 2-3 tables together and, once the
 * Razorpay webhook is a second independent writer alongside staff clicks,
 * a partial failure here must not leave payments/transactions/bookings out
 * of sync with each other. */
export async function recordPayment(input: RecordPaymentInput) {
  const { tenantId, user } = await requireTenantUser();

  const result = await db.transaction(async (tx) => {
    const [payment] = await tx
      .select()
      .from(schema.payments)
      .where(and(eqTenant(schema.payments.tenantId, tenantId), eq(schema.payments.id, input.paymentId)));
    if (!payment) throw new Error("Payment record not found");

    const newAmountPaid = round2(Number(payment.amountPaid) + input.amount);
    const total = Number(payment.totalAmount);
    const status = newAmountPaid >= total ? "PAID" : newAmountPaid > 0 ? "PARTIALLY_PAID" : "PENDING";

    const [updatedPayment] = await tx
      .update(schema.payments)
      .set({ amountPaid: newAmountPaid.toString(), status, updatedAt: new Date() })
      .where(and(eqTenant(schema.payments.tenantId, tenantId), eq(schema.payments.id, input.paymentId)))
      .returning();

    await tx.insert(schema.transactions).values({
      tenantId,
      paymentId: payment.id,
      bookingId: payment.bookingId,
      sessionId: payment.sessionId,
      customerId: payment.customerId,
      amount: input.amount.toString(),
      method: input.method,
      note: input.note,
      staffId: user.id,
      gatewayProvider: input.gatewayProvider,
      gatewayPaymentId: input.gatewayPaymentId,
    });

    if (payment.bookingId) {
      await tx
        .update(schema.bookings)
        .set({ paymentStatus: status, updatedAt: new Date() })
        .where(and(eqTenant(schema.bookings.tenantId, tenantId), eq(schema.bookings.id, payment.bookingId)));
    }

    return updatedPayment;
  });

  refreshPaths();
  return result;
}

/** Marks an invoice fully paid/unpaid in one click (used from Active Sessions). */
export async function setPaymentStatus(
  paymentId: string,
  status: "PAID" | "PENDING",
  method: "CASH" | "UPI" | "CARD" | "OTHER" = "CASH",
) {
  const { tenantId } = await requireTenantUser();
  const [payment] = await db
    .select()
    .from(schema.payments)
    .where(and(eqTenant(schema.payments.tenantId, tenantId), eq(schema.payments.id, paymentId)));
  if (!payment) throw new Error("Payment record not found");

  if (status === "PAID") {
    const remaining = round2(Number(payment.totalAmount) - Number(payment.amountPaid));
    if (remaining > 0) {
      return recordPayment({ paymentId, amount: remaining, method, note: "Marked as paid" });
    }
    return payment;
  }

  const [updated] = await db
    .update(schema.payments)
    .set({ amountPaid: "0", status: "PENDING", updatedAt: new Date() })
    .where(and(eqTenant(schema.payments.tenantId, tenantId), eq(schema.payments.id, paymentId)))
    .returning();

  if (payment.bookingId) {
    await db
      .update(schema.bookings)
      .set({ paymentStatus: "PENDING", updatedAt: new Date() })
      .where(and(eqTenant(schema.bookings.tenantId, tenantId), eq(schema.bookings.id, payment.bookingId)));
  }

  refreshPaths();
  return updated;
}
