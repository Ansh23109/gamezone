"use server";

import { db, schema } from "@/db";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { findConflictingBookings } from "@/lib/availability";
import { calculatePrice } from "@/lib/pricing";
import { findOrCreateCustomer } from "./customers";
import { istWallClockToUtc } from "@/lib/date-range";
import { eqTenant } from "@/lib/tenant/scope";
import { requireTenantUser } from "@/lib/auth/session";

export type CreateBookingInput = {
  customerName: string;
  customerMobile: string;
  gameTypeId: string;
  stationId: string;
  date: string; // yyyy-mm-dd
  startTime: string; // HH:mm
  durationMinutes: number;
  price?: number; // override auto-calculated price if provided
  paymentStatus?: "PAID" | "PARTIALLY_PAID" | "PENDING";
  notes?: string;
};

export async function createBooking(input: CreateBookingInput) {
  const { tenantId, user } = await requireTenantUser();
  const startTime = istWallClockToUtc(input.date, input.startTime);
  const endTime = new Date(startTime.getTime() + input.durationMinutes * 60000);

  const conflicts = await findConflictingBookings(tenantId, {
    stationId: input.stationId,
    startTime,
    endTime,
  });
  if (conflicts.length > 0) {
    throw new Error("This station is already booked for part of that time window.");
  }

  const customer = await findOrCreateCustomer({ name: input.customerName, mobile: input.customerMobile });

  let price = input.price;
  if (price === undefined) {
    const calc = await calculatePrice(tenantId, {
      gameTypeId: input.gameTypeId,
      stationId: input.stationId,
      startTime,
      durationMinutes: input.durationMinutes,
    });
    price = calc.amount;
  }

  const [booking] = await db
    .insert(schema.bookings)
    .values({
      tenantId,
      customerId: customer.id,
      gameTypeId: input.gameTypeId,
      stationId: input.stationId,
      startTime,
      endTime,
      durationMinutes: input.durationMinutes,
      price: price.toString(),
      paymentStatus: input.paymentStatus ?? "PENDING",
      notes: input.notes,
      createdById: user.id,
    })
    .returning();

  await db.insert(schema.payments).values({
    tenantId,
    bookingId: booking.id,
    customerId: customer.id,
    totalAmount: price.toString(),
    amountPaid: input.paymentStatus === "PAID" ? price.toString() : "0",
    status: input.paymentStatus ?? "PENDING",
  });

  await db
    .update(schema.stations)
    .set({ status: "BOOKED", updatedAt: new Date() })
    .where(and(eqTenant(schema.stations.tenantId, tenantId), eq(schema.stations.id, input.stationId), eq(schema.stations.status, "AVAILABLE")));

  revalidatePath("/bookings");
  revalidatePath("/calendar");
  revalidatePath("/");
  revalidatePath("/games-stations");
  return booking;
}

export async function checkInBooking(bookingId: string) {
  const { tenantId } = await requireTenantUser();
  const [updated] = await db
    .update(schema.bookings)
    .set({ status: "CHECKED_IN", checkedInAt: new Date(), updatedAt: new Date() })
    .where(and(eqTenant(schema.bookings.tenantId, tenantId), eq(schema.bookings.id, bookingId)))
    .returning();
  revalidatePath("/bookings");
  revalidatePath("/calendar");
  return updated;
}

export async function cancelBooking(bookingId: string, reason?: string) {
  const { tenantId } = await requireTenantUser();
  const [booking] = await db
    .select()
    .from(schema.bookings)
    .where(and(eqTenant(schema.bookings.tenantId, tenantId), eq(schema.bookings.id, bookingId)));
  if (!booking) throw new Error("Booking not found");

  const [updated] = await db
    .update(schema.bookings)
    .set({ status: "CANCELLED", cancelledAt: new Date(), cancelReason: reason, updatedAt: new Date() })
    .where(and(eqTenant(schema.bookings.tenantId, tenantId), eq(schema.bookings.id, bookingId)))
    .returning();

  // Free up the station if nothing else is currently using it.
  const [station] = await db
    .select()
    .from(schema.stations)
    .where(and(eqTenant(schema.stations.tenantId, tenantId), eq(schema.stations.id, booking.stationId)));
  if (station && station.status === "BOOKED") {
    await db
      .update(schema.stations)
      .set({ status: "AVAILABLE", updatedAt: new Date() })
      .where(and(eqTenant(schema.stations.tenantId, tenantId), eq(schema.stations.id, booking.stationId)));
  }

  revalidatePath("/bookings");
  revalidatePath("/calendar");
  revalidatePath("/games-stations");
  revalidatePath("/");
  return updated;
}

export async function markNoShow(bookingId: string) {
  const { tenantId } = await requireTenantUser();
  const [booking] = await db
    .select()
    .from(schema.bookings)
    .where(and(eqTenant(schema.bookings.tenantId, tenantId), eq(schema.bookings.id, bookingId)));
  if (!booking) throw new Error("Booking not found");

  const [updated] = await db
    .update(schema.bookings)
    .set({ status: "NO_SHOW", updatedAt: new Date() })
    .where(and(eqTenant(schema.bookings.tenantId, tenantId), eq(schema.bookings.id, bookingId)))
    .returning();

  const [station] = await db
    .select()
    .from(schema.stations)
    .where(and(eqTenant(schema.stations.tenantId, tenantId), eq(schema.stations.id, booking.stationId)));
  if (station && station.status === "BOOKED") {
    await db
      .update(schema.stations)
      .set({ status: "AVAILABLE", updatedAt: new Date() })
      .where(and(eqTenant(schema.stations.tenantId, tenantId), eq(schema.stations.id, booking.stationId)));
  }

  revalidatePath("/bookings");
  revalidatePath("/calendar");
  revalidatePath("/");
  return updated;
}

export async function rescheduleBooking(bookingId: string, date: string, startTime: string) {
  const { tenantId } = await requireTenantUser();
  const [booking] = await db
    .select()
    .from(schema.bookings)
    .where(and(eqTenant(schema.bookings.tenantId, tenantId), eq(schema.bookings.id, bookingId)));
  if (!booking) throw new Error("Booking not found");

  const newStart = istWallClockToUtc(date, startTime);
  const newEnd = new Date(newStart.getTime() + booking.durationMinutes * 60000);

  const conflicts = await findConflictingBookings(tenantId, {
    stationId: booking.stationId,
    startTime: newStart,
    endTime: newEnd,
    excludeBookingId: bookingId,
  });
  if (conflicts.length > 0) {
    throw new Error("This station is already booked for part of that time window.");
  }

  const [updated] = await db
    .update(schema.bookings)
    .set({ startTime: newStart, endTime: newEnd, updatedAt: new Date() })
    .where(and(eqTenant(schema.bookings.tenantId, tenantId), eq(schema.bookings.id, bookingId)))
    .returning();

  revalidatePath("/bookings");
  revalidatePath("/calendar");
  return updated;
}

export async function updateBookingNotes(bookingId: string, notes: string) {
  const { tenantId } = await requireTenantUser();
  const [updated] = await db
    .update(schema.bookings)
    .set({ notes, updatedAt: new Date() })
    .where(and(eqTenant(schema.bookings.tenantId, tenantId), eq(schema.bookings.id, bookingId)))
    .returning();
  revalidatePath("/bookings");
  return updated;
}
