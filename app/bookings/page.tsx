import { listBookings } from "@/lib/queries/bookings";
import { listAllGameTypes, listStations } from "@/lib/queries/stations";
import { listPricingRules } from "@/lib/queries/pricing";
import { BookingsTable } from "@/components/bookings/bookings-table";
import { toIstDateInputValue, istNow } from "@/lib/date-range";

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const sp = await searchParams;
  const date = sp.date || toIstDateInputValue(istNow());

  const [bookings, gameTypes, stations, pricingRules] = await Promise.all([
    listBookings({ date }),
    listAllGameTypes(),
    listStations(),
    listPricingRules(),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Bookings</h1>
        <p className="text-sm text-muted mt-0.5">All scheduled and walk-in bookings for the selected day.</p>
      </div>
      <BookingsTable
        date={date}
        bookings={bookings}
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
      />
    </div>
  );
}
