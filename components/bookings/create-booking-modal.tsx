"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CalendarPlus } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/form";
import { formatCurrency } from "@/lib/format";
import { previewPrice, type PricingRuleLike } from "@/lib/pricing-shared";
import { createBooking } from "@/lib/actions/bookings";
import { useStaff } from "@/lib/context/staff-context";
import { toIstDateInputValue } from "@/lib/date-range";

type GameType = { id: string; name: string };
type Station = { id: string; name: string; gameTypeId: string; status: string; isActive: boolean };

export function CreateBookingModal({
  open,
  onClose,
  gameTypes,
  stations,
  pricingRules,
  defaultDate,
  defaultStartTime,
  defaultStationId,
  defaultGameTypeId,
}: {
  open: boolean;
  onClose: () => void;
  gameTypes: GameType[];
  stations: Station[];
  pricingRules: PricingRuleLike[];
  defaultDate?: string;
  defaultStartTime?: string;
  defaultStationId?: string;
  defaultGameTypeId?: string;
}) {
  const router = useRouter();
  const { currentStaffId } = useStaff();
  const [gameTypeId, setGameTypeId] = useState(defaultGameTypeId || gameTypes[0]?.id || "");
  const [stationId, setStationId] = useState(defaultStationId || "");
  const [customerName, setCustomerName] = useState("");
  const [customerMobile, setCustomerMobile] = useState("");
  const [date, setDate] = useState(defaultDate || toIstDateInputValue(new Date()));
  const [startTime, setStartTime] = useState(defaultStartTime || "18:00");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [paymentStatus, setPaymentStatus] = useState<"PENDING" | "PAID">("PENDING");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const stationsForGame = useMemo(() => stations.filter((s) => s.gameTypeId === gameTypeId), [stations, gameTypeId]);

  const { amount, rule } = useMemo(() => {
    if (!gameTypeId || !stationId) return { amount: 0, rule: null };
    const at = new Date(`${date}T${startTime}:00`);
    return previewPrice(pricingRules, gameTypeId, stationId, durationMinutes, at);
  }, [gameTypeId, stationId, durationMinutes, date, startTime, pricingRules]);

  function handleSubmit() {
    setError(null);
    if (!customerName.trim() && !customerMobile.trim()) {
      setError("Enter a customer name or mobile number.");
      return;
    }
    if (!stationId) {
      setError("Pick a station.");
      return;
    }
    startTransition(async () => {
      try {
        await createBooking({
          customerName: customerName || "Guest",
          customerMobile,
          gameTypeId,
          stationId,
          date,
          startTime,
          durationMinutes,
          paymentStatus,
          notes: notes || undefined,
          createdById: currentStaffId || undefined,
        });
        onClose();
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not create booking.");
      }
    });
  }

  return (
    <Modal open={open} onClose={onClose} title="Create Booking" subtitle="Schedule a gaming session" size="lg">
      <div className="p-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Customer name</Label>
            <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Full name" />
          </div>
          <div>
            <Label>Mobile number</Label>
            <Input value={customerMobile} onChange={(e) => setCustomerMobile(e.target.value)} placeholder="98765 43210" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Game</Label>
            <Select
              value={gameTypeId}
              onChange={(e) => {
                setGameTypeId(e.target.value);
                setStationId("");
              }}
            >
              {gameTypes.map((gt) => (
                <option key={gt.id} value={gt.id}>
                  {gt.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Station</Label>
            <Select value={stationId} onChange={(e) => setStationId(e.target.value)}>
              <option value="">Select station</option>
              {stationsForGame.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label>Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <Label>Start time</Label>
            <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </div>
          <div>
            <Label>Duration (min)</Label>
            <Input type="number" min={10} step={10} value={durationMinutes} onChange={(e) => setDurationMinutes(Number(e.target.value))} />
          </div>
        </div>

        <div>
          <Label>Notes (optional)</Label>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any special request..." />
        </div>

        <div className="rounded-xl border border-border bg-surface-2 p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted">Price</p>
            <p className="text-xl font-semibold text-foreground">{formatCurrency(amount)}</p>
            {rule && rule.tier !== "STANDARD" && <p className="text-xs text-muted-2">{rule.tier} rate applied</p>}
          </div>
          <div className="flex gap-2">
            {(["PENDING", "PAID"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPaymentStatus(p)}
                className={
                  "rounded-lg border px-3 py-1.5 text-xs font-medium " +
                  (paymentStatus === p ? "border-accent bg-accent-soft text-foreground" : "border-border text-muted")
                }
              >
                {p === "PENDING" ? "Pay later" : "Paid now"}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={isPending}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarPlus className="h-4 w-4" />}
            Create Booking
          </Button>
        </div>
      </div>
    </Modal>
  );
}
