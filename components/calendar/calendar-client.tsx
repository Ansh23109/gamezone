"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/form";
import { DayGrid, type CalendarBooking, type CalendarStation } from "./day-grid";
import { WeekAgenda } from "./week-agenda";
import { CreateBookingModal } from "@/components/bookings/create-booking-modal";
import { BookingDetailModal } from "@/components/bookings/booking-detail-modal";
import type { PricingRuleLike } from "@/lib/pricing-shared";
import { toIstDateInputValue, dayBoundsForDateString } from "@/lib/date-range";
import { cn } from "@/lib/utils";

type GameType = { id: string; name: string };
type Station = { id: string; name: string; gameTypeId: string; status: string; isActive: boolean };

export function CalendarClient({
  view,
  date,
  gameTypeId,
  gameTypes,
  stations,
  pricingRules,
  bookings,
  bookingDetails,
  weekStart,
}: {
  view: "day" | "week";
  date: string;
  gameTypeId: string;
  gameTypes: GameType[];
  stations: Station[];
  pricingRules: PricingRuleLike[];
  bookings: CalendarBooking[];
  bookingDetails: Record<string, any>;
  weekStart?: Date;
}) {
  const router = useRouter();
  const [createState, setCreateState] = useState<{ stationId?: string; time?: string; date?: string } | null>(null);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);

  const filteredStations: CalendarStation[] = stations
    .filter((s) => s.gameTypeId === gameTypeId)
    .map((s) => ({ id: s.id, name: s.name, status: s.status }));

  function navigate(params: Record<string, string>) {
    const sp = new URLSearchParams({ view, date, gameType: gameTypeId, ...params });
    router.push(`/calendar?${sp.toString()}`);
  }

  function shiftDate(days: number) {
    // Add whole days to the IST-midnight instant for `date` — never local
    // Date.setDate(), which is relative to the browser/server's own
    // timezone and can land on the wrong calendar day.
    const { start } = dayBoundsForDateString(date);
    const shifted = new Date(start.getTime() + days * 24 * 60 * 60 * 1000);
    navigate({ date: toIstDateInputValue(shifted) });
  }

  const selectedBooking = selectedBookingId ? bookingDetails[selectedBookingId] : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border bg-surface-2 p-1">
            <button
              onClick={() => navigate({ view: "day" })}
              className={cn("rounded-md px-3 py-1.5 text-xs font-medium", view === "day" ? "bg-accent text-white" : "text-muted")}
            >
              Day
            </button>
            <button
              onClick={() => navigate({ view: "week" })}
              className={cn("rounded-md px-3 py-1.5 text-xs font-medium", view === "week" ? "bg-accent text-white" : "text-muted")}
            >
              Week
            </button>
          </div>
          <Button size="sm" variant="outline" onClick={() => shiftDate(view === "day" ? -1 : -7)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={() => navigate({ date: toIstDateInputValue(new Date()) })}>
            Today
          </Button>
          <Button size="sm" variant="outline" onClick={() => shiftDate(view === "day" ? 1 : 7)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <p className="text-sm font-medium text-foreground ml-1">
            {dayBoundsForDateString(date).start.toLocaleDateString("en-IN", {
              day: "numeric",
              month: "long",
              year: "numeric",
              timeZone: "Asia/Kolkata",
            })}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Select value={gameTypeId} onChange={(e) => navigate({ gameType: e.target.value })} className="w-40">
            {gameTypes.map((gt) => (
              <option key={gt.id} value={gt.id}>
                {gt.name}
              </option>
            ))}
          </Select>
          <Button variant="primary" onClick={() => setCreateState({ date })}>
            <Plus className="h-4 w-4" /> New Booking
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs text-muted">
        <LegendDot className="bg-sky-500/60" label="Upcoming" />
        <LegendDot className="bg-amber-500/60" label="Checked In" />
        <LegendDot className="bg-emerald-500/60" label="Active" />
        <LegendDot className="bg-zinc-500/60" label="Completed" />
        <LegendDot className="bg-rose-500/60" label="Cancelled / No Show" />
      </div>

      {view === "day" ? (
        <DayGrid
          date={dayBoundsForDateString(date).start}
          stations={filteredStations}
          bookings={bookings}
          onSlotClick={(stationId, time) => setCreateState({ stationId, time, date })}
          onBookingClick={setSelectedBookingId}
        />
      ) : (
        <WeekAgenda
          weekStart={weekStart ?? dayBoundsForDateString(date).start}
          bookings={bookings}
          onBookingClick={setSelectedBookingId}
          onDayClick={(d) => navigate({ view: "day", date: d })}
        />
      )}

      {createState && (
        <CreateBookingModal
          open
          onClose={() => setCreateState(null)}
          gameTypes={gameTypes}
          stations={stations}
          pricingRules={pricingRules}
          defaultDate={createState.date}
          defaultStartTime={createState.time}
          defaultStationId={createState.stationId}
          defaultGameTypeId={gameTypeId}
        />
      )}

      {selectedBooking && <BookingDetailModal booking={selectedBooking} onClose={() => setSelectedBookingId(null)} />}
    </div>
  );
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("h-2 w-2 rounded-full", className)} />
      {label}
    </span>
  );
}
