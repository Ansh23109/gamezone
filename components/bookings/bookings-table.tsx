"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, CalendarDays, List as ListIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form";
import { StatusBadge } from "@/components/ui/badge";
import { BOOKING_STATUS_STYLES, PAYMENT_STATUS_STYLES } from "@/lib/constants";
import { formatCurrency, formatDuration, formatTime } from "@/lib/format";
import { CreateBookingModal } from "./create-booking-modal";
import { BookingDetailModal } from "./booking-detail-modal";
import { DayGrid, type CalendarBooking, type CalendarStation } from "@/components/calendar/day-grid";
import type { PricingRuleLike } from "@/lib/pricing-shared";
import { dayBoundsForDateString } from "@/lib/date-range";
import { cn } from "@/lib/utils";

type GameType = { id: string; name: string };
type Station = { id: string; name: string; gameTypeId: string; status: string; isActive: boolean };

export function BookingsTable({
  date,
  bookings,
  gameTypes,
  stations,
  pricingRules,
}: {
  date: string;
  bookings: any[];
  gameTypes: GameType[];
  stations: Station[];
  pricingRules: PricingRuleLike[];
}) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [gameFilter, setGameFilter] = useState("ALL");
  const [view, setView] = useState<"list" | "timeline">("list");
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      bookings.filter(
        (b) => (statusFilter === "ALL" || b.status === statusFilter) && (gameFilter === "ALL" || b.gameTypeId === gameFilter),
      ),
    [bookings, statusFilter, gameFilter],
  );

  const selectedBooking = selectedBookingId ? bookings.find((b) => b.id === selectedBookingId) : null;

  const calendarBookings: CalendarBooking[] = filtered.map((b) => ({
    id: b.id,
    startTime: b.startTime,
    endTime: b.endTime,
    status: b.status,
    stationId: b.stationId,
    customerName: b.customer.name,
    gameTypeName: b.gameType.name,
    price: b.price,
  }));
  const timelineStations: CalendarStation[] = stations.map((s) => ({ id: s.id, name: s.name, status: s.status }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Input type="date" value={date} onChange={(e) => router.push(`/bookings?date=${e.target.value}`)} className="w-40" />
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-40">
            <option value="ALL">All statuses</option>
            {Object.keys(BOOKING_STATUS_STYLES).map((s) => (
              <option key={s} value={s}>
                {BOOKING_STATUS_STYLES[s].label}
              </option>
            ))}
          </Select>
          <Select value={gameFilter} onChange={(e) => setGameFilter(e.target.value)} className="w-36">
            <option value="ALL">All games</option>
            {gameTypes.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border bg-surface-2 p-1">
            <button
              onClick={() => setView("list")}
              className={cn("flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium", view === "list" ? "bg-accent text-white" : "text-muted")}
            >
              <ListIcon className="h-3.5 w-3.5" /> List
            </button>
            <button
              onClick={() => setView("timeline")}
              className={cn("flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium", view === "timeline" ? "bg-accent text-white" : "text-muted")}
            >
              <CalendarDays className="h-3.5 w-3.5" /> Timeline
            </button>
          </div>
          <Button variant="primary" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> New Booking
          </Button>
        </div>
      </div>

      {view === "list" ? (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-2 text-left text-xs text-muted">
                <th className="px-4 py-2.5 font-medium">Time</th>
                <th className="px-4 py-2.5 font-medium">Customer</th>
                <th className="px-4 py-2.5 font-medium">Game / Station</th>
                <th className="px-4 py-2.5 font-medium">Duration</th>
                <th className="px-4 py-2.5 font-medium">Price</th>
                <th className="px-4 py-2.5 font-medium">Payment</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-xs text-muted-2">
                    No bookings match these filters.
                  </td>
                </tr>
              )}
              {filtered.map((b) => (
                <tr
                  key={b.id}
                  onClick={() => setSelectedBookingId(b.id)}
                  className="border-b border-border last:border-b-0 hover:bg-surface-2 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 text-foreground whitespace-nowrap">{formatTime(b.startTime)}</td>
                  <td className="px-4 py-3">
                    <p className="text-foreground font-medium">{b.customer.name}</p>
                    {!b.customer.mobile.startsWith("GUEST-") && <p className="text-xs text-muted">{b.customer.mobile}</p>}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {b.gameType.name} · {b.station.name}
                  </td>
                  <td className="px-4 py-3 text-muted whitespace-nowrap">{formatDuration(b.durationMinutes)}</td>
                  <td className="px-4 py-3 text-foreground font-medium whitespace-nowrap">{formatCurrency(b.price)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge style={PAYMENT_STATUS_STYLES[b.paymentStatus]} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge style={BOOKING_STATUS_STYLES[b.status]} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <DayGrid
          date={dayBoundsForDateString(date).start}
          stations={timelineStations}
          bookings={calendarBookings}
          onSlotClick={() => setCreateOpen(true)}
          onBookingClick={setSelectedBookingId}
        />
      )}

      {createOpen && (
        <CreateBookingModal
          open
          onClose={() => setCreateOpen(false)}
          gameTypes={gameTypes}
          stations={stations}
          pricingRules={pricingRules}
          defaultDate={date}
        />
      )}
      {selectedBooking && <BookingDetailModal booking={selectedBooking} onClose={() => setSelectedBookingId(null)} />}
    </div>
  );
}
