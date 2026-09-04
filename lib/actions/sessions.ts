"use server";

import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { calculatePrice } from "@/lib/pricing";
import { findConflictingBookings } from "@/lib/availability";
import { findOrCreateCustomer } from "./customers";
import { round2 } from "@/lib/format";

function refreshPaths() {
  revalidatePath("/active-sessions");
  revalidatePath("/bookings");
  revalidatePath("/calendar");
  revalidatePath("/games-stations");
  revalidatePath("/payments");
  revalidatePath("/");
}

export type WalkInInput = {
  customerName?: string;
  customerMobile?: string;
  gameTypeId: string;
  stationId: string;
  durationMinutes: number;
  staffId?: string;
  paymentMethod?: "CASH" | "UPI" | "CARD" | "OTHER";
  markPaid?: boolean;
};

/** The fast walk-in path: pick game → pick station → (optional) customer →
 * duration → price is computed automatically → session starts immediately. */
export async function startWalkInSession(input: WalkInInput) {
  const now = new Date();
  const endTime = new Date(now.getTime() + input.durationMinutes * 60000);

  const conflicts = await findConflictingBookings({
    stationId: input.stationId,
    startTime: now,
    endTime,
  });
  if (conflicts.length > 0) {
    throw new Error("That station is currently occupied.");
  }

  const customer = await findOrCreateCustomer({
    name: input.customerName ?? "",
    mobile: input.customerMobile,
  });

  const { amount } = await calculatePrice({
    gameTypeId: input.gameTypeId,
    stationId: input.stationId,
    startTime: now,
    durationMinutes: input.durationMinutes,
  });

  const [booking] = await db
    .insert(schema.bookings)
    .values({
      customerId: customer.id,
      gameTypeId: input.gameTypeId,
      stationId: input.stationId,
      startTime: now,
      endTime,
      durationMinutes: input.durationMinutes,
      price: amount.toString(),
      status: "ACTIVE",
      paymentStatus: input.markPaid ? "PAID" : "PENDING",
      isWalkIn: true,
      checkedInAt: now,
      createdById: input.staffId || null,
    })
    .returning();

  const [session] = await db
    .insert(schema.gamingSessions)
    .values({
      bookingId: booking.id,
      customerId: customer.id,
      gameTypeId: input.gameTypeId,
      stationId: input.stationId,
      status: "ACTIVE",
      actualStartTime: now,
      plannedDurationMinutes: input.durationMinutes,
      baseAmount: amount.toString(),
      totalAmount: amount.toString(),
      createdById: input.staffId || null,
    })
    .returning();

  const [payment] = await db
    .insert(schema.payments)
    .values({
      bookingId: booking.id,
      sessionId: session.id,
      customerId: customer.id,
      totalAmount: amount.toString(),
      amountPaid: input.markPaid ? amount.toString() : "0",
      status: input.markPaid ? "PAID" : "PENDING",
    })
    .returning();

  if (input.markPaid) {
    await db.insert(schema.transactions).values({
      paymentId: payment.id,
      bookingId: booking.id,
      sessionId: session.id,
      customerId: customer.id,
      gameTypeId: input.gameTypeId,
      stationId: input.stationId,
      amount: amount.toString(),
      method: input.paymentMethod ?? "CASH",
      staffId: input.staffId || null,
    });
  }

  await db
    .update(schema.stations)
    .set({ status: "ACTIVE", updatedAt: new Date() })
    .where(eq(schema.stations.id, input.stationId));

  refreshPaths();
  return { booking, session, customer };
}

/** For a pre-existing booking: the customer has arrived, start play now. */
export async function startSessionFromBooking(bookingId: string, staffId?: string) {
  const [booking] = await db.select().from(schema.bookings).where(eq(schema.bookings.id, bookingId));
  if (!booking) throw new Error("Booking not found");

  const now = new Date();

  const [session] = await db
    .insert(schema.gamingSessions)
    .values({
      bookingId: booking.id,
      customerId: booking.customerId,
      gameTypeId: booking.gameTypeId,
      stationId: booking.stationId,
      status: "ACTIVE",
      actualStartTime: now,
      plannedDurationMinutes: booking.durationMinutes,
      baseAmount: booking.price,
      totalAmount: booking.price,
      createdById: staffId || null,
    })
    .returning();

  await db
    .update(schema.bookings)
    .set({ status: "ACTIVE", updatedAt: new Date() })
    .where(eq(schema.bookings.id, bookingId));

  const [existingPayment] = await db
    .select()
    .from(schema.payments)
    .where(eq(schema.payments.bookingId, bookingId));
  if (existingPayment) {
    await db
      .update(schema.payments)
      .set({ sessionId: session.id, updatedAt: new Date() })
      .where(eq(schema.payments.id, existingPayment.id));
  } else {
    await db.insert(schema.payments).values({
      bookingId: booking.id,
      sessionId: session.id,
      customerId: booking.customerId,
      totalAmount: booking.price,
      amountPaid: "0",
      status: "PENDING",
    });
  }

  await db
    .update(schema.stations)
    .set({ status: "ACTIVE", updatedAt: new Date() })
    .where(eq(schema.stations.id, booking.stationId));

  refreshPaths();
  return session;
}

export async function extendSession(sessionId: string, extraMinutes: number) {
  const [session] = await db.select().from(schema.gamingSessions).where(eq(schema.gamingSessions.id, sessionId));
  if (!session) throw new Error("Session not found");

  const { amount: extraAmount } = await calculatePrice({
    gameTypeId: session.gameTypeId,
    stationId: session.stationId,
    startTime: new Date(),
    durationMinutes: extraMinutes,
  });

  const newBaseAmount = round2(Number(session.baseAmount) + extraAmount);
  const newTotal = round2(newBaseAmount + Number(session.extraCharges));
  const newPlanned = session.plannedDurationMinutes + extraMinutes;

  const [updated] = await db
    .update(schema.gamingSessions)
    .set({
      plannedDurationMinutes: newPlanned,
      baseAmount: newBaseAmount.toString(),
      totalAmount: newTotal.toString(),
      updatedAt: new Date(),
    })
    .where(eq(schema.gamingSessions.id, sessionId))
    .returning();

  const [booking] = await db.select().from(schema.bookings).where(eq(schema.bookings.id, session.bookingId));
  if (booking) {
    const newEndTime = new Date(booking.startTime.getTime() + newPlanned * 60000);
    await db
      .update(schema.bookings)
      .set({ endTime: newEndTime, durationMinutes: newPlanned, price: newBaseAmount.toString(), updatedAt: new Date() })
      .where(eq(schema.bookings.id, booking.id));
  }

  const [payment] = await db.select().from(schema.payments).where(eq(schema.payments.sessionId, sessionId));
  if (payment) {
    const status = Number(payment.amountPaid) >= newTotal ? "PAID" : Number(payment.amountPaid) > 0 ? "PARTIALLY_PAID" : "PENDING";
    await db
      .update(schema.payments)
      .set({ totalAmount: newTotal.toString(), status, updatedAt: new Date() })
      .where(eq(schema.payments.id, payment.id));
  }

  refreshPaths();
  return updated;
}

export async function pauseSession(sessionId: string) {
  const [updated] = await db
    .update(schema.gamingSessions)
    .set({ status: "PAUSED", pausedAt: new Date(), updatedAt: new Date() })
    .where(eq(schema.gamingSessions.id, sessionId))
    .returning();
  refreshPaths();
  return updated;
}

export async function resumeSession(sessionId: string) {
  const [session] = await db.select().from(schema.gamingSessions).where(eq(schema.gamingSessions.id, sessionId));
  if (!session) throw new Error("Session not found");

  const pausedMinutes = session.pausedAt
    ? Math.round((Date.now() - session.pausedAt.getTime()) / 60000)
    : 0;

  const [updated] = await db
    .update(schema.gamingSessions)
    .set({
      status: "ACTIVE",
      pausedAt: null,
      totalPausedMinutes: session.totalPausedMinutes + pausedMinutes,
      updatedAt: new Date(),
    })
    .where(eq(schema.gamingSessions.id, sessionId))
    .returning();
  refreshPaths();
  return updated;
}

export async function endSession(sessionId: string) {
  const [session] = await db.select().from(schema.gamingSessions).where(eq(schema.gamingSessions.id, sessionId));
  if (!session) throw new Error("Session not found");

  const now = new Date();
  const rawMinutes = Math.max(1, Math.round((now.getTime() - session.actualStartTime.getTime()) / 60000));
  const actualDurationMinutes = Math.max(1, rawMinutes - session.totalPausedMinutes);

  const [updated] = await db
    .update(schema.gamingSessions)
    .set({
      status: "COMPLETED",
      actualEndTime: now,
      actualDurationMinutes,
      updatedAt: new Date(),
    })
    .where(eq(schema.gamingSessions.id, sessionId))
    .returning();

  await db
    .update(schema.bookings)
    .set({ status: "COMPLETED", endTime: now, updatedAt: new Date() })
    .where(eq(schema.bookings.id, session.bookingId));

  await db
    .update(schema.stations)
    .set({ status: "AVAILABLE", updatedAt: new Date() })
    .where(eq(schema.stations.id, session.stationId));

  refreshPaths();
  return updated;
}

export async function addExtraCharge(sessionId: string, amount: number, note?: string) {
  const [session] = await db.select().from(schema.gamingSessions).where(eq(schema.gamingSessions.id, sessionId));
  if (!session) throw new Error("Session not found");

  const newExtra = round2(Number(session.extraCharges) + amount);
  const newTotal = round2(Number(session.baseAmount) + newExtra);
  const combinedNote = [session.extraChargesNotes, note].filter(Boolean).join("; ");

  const [updated] = await db
    .update(schema.gamingSessions)
    .set({
      extraCharges: newExtra.toString(),
      totalAmount: newTotal.toString(),
      extraChargesNotes: combinedNote || null,
      updatedAt: new Date(),
    })
    .where(eq(schema.gamingSessions.id, sessionId))
    .returning();

  const [payment] = await db.select().from(schema.payments).where(eq(schema.payments.sessionId, sessionId));
  if (payment) {
    const status = Number(payment.amountPaid) >= newTotal ? "PAID" : Number(payment.amountPaid) > 0 ? "PARTIALLY_PAID" : "PENDING";
    await db
      .update(schema.payments)
      .set({ totalAmount: newTotal.toString(), status, updatedAt: new Date() })
      .where(eq(schema.payments.id, payment.id));
  }

  refreshPaths();
  return updated;
}

export async function cancelSession(sessionId: string) {
  const [session] = await db.select().from(schema.gamingSessions).where(eq(schema.gamingSessions.id, sessionId));
  if (!session) throw new Error("Session not found");

  await db
    .update(schema.gamingSessions)
    .set({ status: "CANCELLED", actualEndTime: new Date(), updatedAt: new Date() })
    .where(eq(schema.gamingSessions.id, sessionId));

  await db
    .update(schema.bookings)
    .set({ status: "CANCELLED", cancelledAt: new Date(), updatedAt: new Date() })
    .where(eq(schema.bookings.id, session.bookingId));

  await db
    .update(schema.stations)
    .set({ status: "AVAILABLE", updatedAt: new Date() })
    .where(eq(schema.stations.id, session.stationId));

  refreshPaths();
}
