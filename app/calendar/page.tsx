import { listBookings } from "@/lib/queries/bookings";
import { listActiveGameTypes, listStations } from "@/lib/queries/stations";
import { listPricingRules } from "@/lib/queries/pricing";
import { CalendarClient } from "@/components/calendar/calendar-client";
import { toIstDateInputValue, istNow, dayBoundsForDateString, getIstParts } from "@/lib/date-range";
import type { CalendarBooking } from "@/components/calendar/day-grid";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; date?: string; gameType?: string }>;
}) {
  const sp = await searchParams;
  const view = sp.view === "week" ? "week" : "day";
  const date = sp.date || toIstDateInputValue(istNow());

  const [gameTypes, stations, pricingRules] = await Promise.all([
    listActiveGameTypes(),
    listStations(),
    listPricingRules(),
  ]);
  const gameTypeId = sp.gameType || gameTypes[0]?.id || "";

  // Boundaries are computed in IST wall-clock time (the business's own day),
  // not the server's local timezone — see lib/date-range.ts.
  const baseDayBounds = dayBoundsForDateString(date);
  let rangeStart: Date;
  let rangeEnd: Date;
  let weekStart: Date | undefined;

  if (view === "day") {
    rangeStart = baseDayBounds.start;
    rangeEnd = baseDayBounds.end;
  } else {
    const dow = getIstParts(baseDayBounds.start).dayOfWeek;
    const diffToMonday = dow === 0 ? 6 : dow - 1;
    weekStart = new Date(baseDayBounds.start.getTime() - diffToMonday * 24 * 60 * 60 * 1000);
    rangeStart = weekStart;
    rangeEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
  }

  const bookings = await listBookings({ rangeStart, rangeEnd, gameTypeId });

  const calendarBookings: CalendarBooking[] = bookings.map((b) => ({
    id: b.id,
    startTime: b.startTime,
    endTime: b.endTime,
    status: b.status,
    stationId: b.stationId,
    customerName: b.customer.name,
    gameTypeName: b.gameType.name,
    price: b.price,
  }));

  const bookingDetails: Record<string, any> = {};
  for (const b of bookings) {
    bookingDetails[b.id] = {
      id: b.id,
      startTime: b.startTime,
      endTime: b.endTime,
      durationMinutes: b.durationMinutes,
      price: b.price,
      status: b.status,
      paymentStatus: b.paymentStatus,
      notes: b.notes,
      isWalkIn: b.isWalkIn,
      customer: { name: b.customer.name, mobile: b.customer.mobile },
      gameType: { name: b.gameType.name },
      station: { name: b.station.name },
    };
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Calendar</h1>
        <p className="text-sm text-muted mt-0.5">Click an open slot to book, or an existing block to manage it.</p>
      </div>
      <CalendarClient
        view={view}
        date={date}
        gameTypeId={gameTypeId}
        gameTypes={gameTypes}
        stations={stations}
        pricingRules={pricingRules.map((r) => ({
          id: r.id,
          gameTypeId: r.gameTypeId,
          stationId: r.stationId,
          unit: r.unit,
          durationMinutes: r.durationMinutes,
          price: r.price,
          tier: r.tier,
          daysOfWeek: r.daysOfWeek,
          startTime: r.startTime,
          endTime: r.endTime,
          priority: r.priority,
          isActive: r.isActive,
        }))}
        bookings={calendarBookings}
        bookingDetails={bookingDetails}
        weekStart={weekStart}
      />
    </div>
  );
}
