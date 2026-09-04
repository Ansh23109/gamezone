"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, LogIn, Play, XCircle, UserX, CalendarClock } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { Input, Label } from "@/components/ui/form";
import { BOOKING_STATUS_STYLES, PAYMENT_STATUS_STYLES } from "@/lib/constants";
import { formatCurrency, formatDate, formatDateTime, formatDuration, formatTime } from "@/lib/format";
import { checkInBooking, cancelBooking, markNoShow, rescheduleBooking } from "@/lib/actions/bookings";
import { startSessionFromBooking } from "@/lib/actions/sessions";
import { useStaff } from "@/lib/context/staff-context";
import { toIstDateInputValue } from "@/lib/date-range";

type BookingDetail = {
  id: string;
  startTime: Date;
  endTime: Date;
  durationMinutes: number;
  price: string;
  status: string;
  paymentStatus: string;
  notes: string | null;
  isWalkIn: boolean;
  customer: { name: string; mobile: string };
  gameType: { name: string };
  station: { name: string };
};

export function BookingDetailModal({ booking, onClose }: { booking: BookingDetail; onClose: () => void }) {
  const router = useRouter();
  const { currentStaffId } = useStaff();
  const [isPending, startTransition] = useTransition();
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [newDate, setNewDate] = useState(toIstDateInputValue(booking.startTime));
  const [newTime, setNewTime] = useState(formatTime(booking.startTime));
  const [error, setError] = useState<string | null>(null);

  function run(fn: () => Promise<unknown>) {
    setError(null);
    startTransition(async () => {
      try {
        await fn();
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  return (
    <Modal open onClose={onClose} title={`${booking.gameType.name} · ${booking.station.name}`} subtitle={formatDateTime(booking.startTime)} size="md">
      <div className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <StatusBadge style={BOOKING_STATUS_STYLES[booking.status]} />
          <StatusBadge style={PAYMENT_STATUS_STYLES[booking.paymentStatus]} />
          {booking.isWalkIn && <StatusBadge style={{ label: "Walk-In", className: "bg-surface-2 text-muted border-border" }} />}
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-muted">Customer</p>
            <p className="text-foreground font-medium">{booking.customer.name}</p>
            {!booking.customer.mobile.startsWith("GUEST-") && <p className="text-xs text-muted">{booking.customer.mobile}</p>}
          </div>
          <div>
            <p className="text-xs text-muted">Duration</p>
            <p className="text-foreground font-medium">{formatDuration(booking.durationMinutes)}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Start — End</p>
            <p className="text-foreground font-medium">
              {formatTime(booking.startTime)} — {formatTime(booking.endTime)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted">Price</p>
            <p className="text-foreground font-medium">{formatCurrency(booking.price)}</p>
          </div>
        </div>

        {booking.notes && (
          <div className="rounded-lg bg-surface-2 p-3 text-xs text-muted">{booking.notes}</div>
        )}

        {error && <p className="text-sm text-danger">{error}</p>}

        {rescheduleOpen && (
          <div className="rounded-lg border border-border p-3 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>New date</Label>
                <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
              </div>
              <div>
                <Label>New time</Label>
                <Input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => setRescheduleOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                variant="primary"
                onClick={() => run(() => rescheduleBooking(booking.id, newDate, newTime))}
                disabled={isPending}
              >
                Confirm Reschedule
              </Button>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
          {(booking.status === "UPCOMING" || booking.status === "CHECKED_IN") && (
            <>
              {booking.status === "UPCOMING" && (
                <Button size="sm" variant="secondary" disabled={isPending} onClick={() => run(() => checkInBooking(booking.id))}>
                  <LogIn className="h-3.5 w-3.5" /> Check In
                </Button>
              )}
              <Button
                size="sm"
                variant="primary"
                disabled={isPending}
                onClick={() => run(() => startSessionFromBooking(booking.id, currentStaffId || undefined))}
              >
                <Play className="h-3.5 w-3.5" /> Start Session
              </Button>
              <Button size="sm" variant="outline" disabled={isPending} onClick={() => setRescheduleOpen((v) => !v)}>
                <CalendarClock className="h-3.5 w-3.5" /> Reschedule
              </Button>
              <Button size="sm" variant="outline" disabled={isPending} onClick={() => run(() => markNoShow(booking.id))}>
                <UserX className="h-3.5 w-3.5" /> No Show
              </Button>
              <Button size="sm" variant="danger" disabled={isPending} onClick={() => run(() => cancelBooking(booking.id))}>
                <XCircle className="h-3.5 w-3.5" /> Cancel
              </Button>
            </>
          )}
          {booking.status === "ACTIVE" && (
            <Link href="/active-sessions">
              <Button size="sm" variant="primary">
                Manage in Active Sessions →
              </Button>
            </Link>
          )}
          {isPending && <Loader2 className="h-4 w-4 animate-spin text-muted self-center" />}
        </div>
      </div>
    </Modal>
  );
}
