"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { formatCurrency, formatTime } from "@/lib/format";
import { BOOKING_STATUS_STYLES } from "@/lib/constants";
import { toIstDateInputValue, getIstParts } from "@/lib/date-range";

const START_HOUR = 10;
const END_HOUR = 24;
const PX_PER_MIN = 1.4;
const TOTAL_MIN = (END_HOUR - START_HOUR) * 60;

export type CalendarBooking = {
  id: string;
  startTime: Date;
  endTime: Date;
  status: string;
  stationId: string;
  customerName: string;
  gameTypeName: string;
  price: string;
};

export type CalendarStation = { id: string; name: string; status: string };

// Grid position is always relative to IST wall-clock time (10am-midnight,
// the business's own hours) — never the runtime's local timezone, which is
// commonly UTC on a server and would otherwise misplace every block.
function minutesSinceOpen(d: Date): number {
  const { hour, minute } = getIstParts(d);
  const h = hour + minute / 60;
  return Math.max(0, (h - START_HOUR) * 60);
}

export function DayGrid({
  date,
  stations,
  bookings,
  onSlotClick,
  onBookingClick,
}: {
  date: Date;
  stations: CalendarStation[];
  bookings: CalendarBooking[];
  onSlotClick: (stationId: string, time: string) => void;
  onBookingClick: (bookingId: string) => void;
}) {
  const hours = useMemo(() => Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i), []);
  const isToday = toIstDateInputValue(date) === toIstDateInputValue(new Date());
  const nowOffset = isToday ? minutesSinceOpen(new Date()) * PX_PER_MIN : null;

  return (
    <div className="flex overflow-x-auto rounded-xl border border-border">
      {/* Time axis */}
      <div className="sticky left-0 z-10 w-14 shrink-0 bg-surface border-r border-border">
        <div className="h-10 border-b border-border" />
        <div style={{ height: TOTAL_MIN * PX_PER_MIN, position: "relative" }}>
          {hours.map((h) => (
            <div
              key={h}
              className="absolute left-0 right-0 text-[10px] text-muted-2 px-1 -translate-y-1/2"
              style={{ top: (h - START_HOUR) * 60 * PX_PER_MIN }}
            >
              {h % 12 === 0 ? 12 : h % 12}
              {h < 12 ? "am" : "pm"}
            </div>
          ))}
        </div>
      </div>

      {/* Station columns */}
      <div className="flex">
        {stations.map((station) => {
          const stationBookings = bookings.filter((b) => b.stationId === station.id);
          return (
            <div key={station.id} className="w-40 shrink-0 border-r border-border last:border-r-0">
              <div className="h-10 flex items-center justify-center border-b border-border px-2 text-xs font-medium text-foreground truncate sticky top-0 bg-surface z-10">
                {station.name}
              </div>
              <div
                className="relative"
                style={{ height: TOTAL_MIN * PX_PER_MIN }}
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const y = e.clientY - rect.top;
                  const minutes = Math.round(y / PX_PER_MIN / 15) * 15;
                  const totalMin = START_HOUR * 60 + Math.max(0, Math.min(TOTAL_MIN, minutes));
                  const hh = Math.floor(totalMin / 60);
                  const mm = totalMin % 60;
                  onSlotClick(station.id, `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`);
                }}
              >
                {/* hour gridlines */}
                {hours.map((h) => (
                  <div
                    key={h}
                    className="absolute left-0 right-0 border-t border-border/60"
                    style={{ top: (h - START_HOUR) * 60 * PX_PER_MIN }}
                  />
                ))}
                {nowOffset !== null && nowOffset >= 0 && nowOffset <= TOTAL_MIN * 1 && (
                  <div className="absolute left-0 right-0 border-t-2 border-danger z-10" style={{ top: nowOffset }} />
                )}
                {stationBookings.map((b) => {
                  const top = minutesSinceOpen(b.startTime) * PX_PER_MIN;
                  const height = Math.max(20, ((b.endTime.getTime() - b.startTime.getTime()) / 60000) * PX_PER_MIN);
                  const style = BOOKING_STATUS_STYLES[b.status];
                  return (
                    <button
                      key={b.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onBookingClick(b.id);
                      }}
                      className={cn(
                        "absolute left-0.5 right-0.5 rounded-md border px-1.5 py-1 text-left text-[10px] leading-tight overflow-hidden hover:brightness-110 transition",
                        style?.className,
                      )}
                      style={{ top, height }}
                    >
                      <p className="font-semibold truncate">{b.customerName}</p>
                      <p className="truncate opacity-80">
                        {formatTime(b.startTime)} · {formatCurrency(b.price)}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
