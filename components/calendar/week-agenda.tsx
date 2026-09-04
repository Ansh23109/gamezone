"use client";

import { cn } from "@/lib/utils";
import { formatCurrency, formatTime } from "@/lib/format";
import { BOOKING_STATUS_STYLES } from "@/lib/constants";
import { toIstDateInputValue, getIstParts } from "@/lib/date-range";
import type { CalendarBooking } from "./day-grid";

export function WeekAgenda({
  weekStart,
  bookings,
  onBookingClick,
  onDayClick,
}: {
  weekStart: Date;
  bookings: CalendarBooking[];
  onBookingClick: (id: string) => void;
  onDayClick: (date: string) => void;
}) {
  // Add whole days as fixed 24h increments to the weekStart instant — never
  // local setDate()/getDate(), which are relative to the browser's own
  // timezone and can land on the wrong IST calendar day.
  const days = Array.from({ length: 7 }, (_, i) => new Date(weekStart.getTime() + i * 24 * 60 * 60 * 1000));
  const todayKey = toIstDateInputValue(new Date());

  return (
    <div className="grid grid-cols-7 gap-2">
      {days.map((day) => {
        const key = toIstDateInputValue(day);
        const dayBookings = bookings
          .filter((b) => toIstDateInputValue(b.startTime) === key)
          .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
        const isToday = key === todayKey;
        return (
          <div key={key} className="rounded-xl border border-border bg-surface min-h-[280px]">
            <button
              onClick={() => onDayClick(key)}
              className={cn(
                "w-full flex flex-col items-center py-2 border-b border-border text-xs font-medium hover:bg-surface-2",
                isToday && "text-accent",
              )}
            >
              <span>{day.toLocaleDateString("en-IN", { weekday: "short", timeZone: "Asia/Kolkata" })}</span>
              <span className="text-base">{getIstParts(day).day}</span>
            </button>
            <div className="p-1.5 space-y-1.5">
              {dayBookings.length === 0 && <p className="text-[10px] text-muted-2 text-center py-4">—</p>}
              {dayBookings.map((b) => {
                const style = BOOKING_STATUS_STYLES[b.status];
                return (
                  <button
                    key={b.id}
                    onClick={() => onBookingClick(b.id)}
                    className={cn("w-full rounded-md border px-1.5 py-1 text-left text-[10px] leading-tight", style?.className)}
                  >
                    <p className="font-semibold truncate">{formatTime(b.startTime)} · {b.customerName}</p>
                    <p className="truncate opacity-80">{b.gameTypeName} · {formatCurrency(b.price)}</p>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
