"use client";

import { useEffect, useState, useTransition } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { GameIcon } from "@/lib/icon-map";
import { SESSION_STATUS_STYLES, PAYMENT_STATUS_STYLES } from "@/lib/constants";
import { formatCurrency, formatDuration } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Pause, Play, Square, Plus, IndianRupee, Phone, Loader2 } from "lucide-react";
import { extendSession, pauseSession, resumeSession, endSession, addExtraCharge } from "@/lib/actions/sessions";
import { setPaymentStatus } from "@/lib/actions/payments";
import { Modal } from "@/components/ui/modal";
import { Input, Label } from "@/components/ui/form";
import type { listActiveSessions } from "@/lib/queries/sessions";

type SessionWithRelations = Awaited<ReturnType<typeof listActiveSessions>>[number];

function useElapsed(session: SessionWithRelations) {
  const [, tick] = useState(0);
  useEffect(() => {
    if (session.status !== "ACTIVE") return;
    const id = setInterval(() => tick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [session.status]);

  const now = Date.now();
  const start = new Date(session.actualStartTime).getTime();
  let elapsedMs = now - start - session.totalPausedMinutes * 60000;
  if (session.status === "PAUSED" && session.pausedAt) {
    elapsedMs -= now - new Date(session.pausedAt).getTime();
  }
  const elapsedMin = Math.max(0, Math.floor(elapsedMs / 60000));
  const remainingMin = session.plannedDurationMinutes - elapsedMin;
  return { elapsedMin, remainingMin };
}

export function SessionCard({ session }: { session: SessionWithRelations }) {
  const { elapsedMin, remainingMin } = useElapsed(session);
  const [isPending, startTransition] = useTransition();
  const [chargeOpen, setChargeOpen] = useState(false);

  const overtime = remainingMin < 0;

  function run(fn: () => Promise<unknown>) {
    startTransition(async () => {
      await fn();
    });
  }

  return (
    <Card className={cn("p-4 relative overflow-hidden", session.status === "ACTIVE" && "ring-1 ring-accent/20")}>
      {session.status === "ACTIVE" && (
        <span className="absolute top-4 right-4 h-2 w-2 rounded-full bg-success pulse-dot" />
      )}
      <div className="flex items-start gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${session.gameType.color}22`, color: session.gameType.color ?? undefined }}
        >
          <GameIcon icon={session.gameType.icon} className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-foreground truncate">{session.station.name}</p>
            <StatusBadge style={SESSION_STATUS_STYLES[session.status]} />
          </div>
          <p className="text-xs text-muted mt-0.5 truncate">{session.gameType.name}</p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-muted">
        <span className="truncate">{session.customer.name}</span>
        {!session.customer.mobile.startsWith("GUEST-") && (
          <span className="flex items-center gap-1 shrink-0">
            <Phone className="h-3 w-3" /> {session.customer.mobile}
          </span>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-center">
        <div className="rounded-lg bg-surface-2 py-2">
          <p className="text-[10px] text-muted-2 uppercase tracking-wide">Elapsed</p>
          <p className="text-sm font-semibold text-foreground">{formatDuration(elapsedMin)}</p>
        </div>
        <div className="rounded-lg bg-surface-2 py-2">
          <p className="text-[10px] text-muted-2 uppercase tracking-wide">{overtime ? "Overtime" : "Remaining"}</p>
          <p className={cn("text-sm font-semibold", overtime ? "text-warning" : "text-foreground")}>
            {formatDuration(Math.abs(remainingMin))}
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div>
          <p className="text-lg font-semibold text-foreground">{formatCurrency(session.totalAmount)}</p>
          {Number(session.extraCharges) > 0 && (
            <p className="text-[10px] text-muted-2">incl. {formatCurrency(session.extraCharges)} extra</p>
          )}
        </div>
        {session.payment && <StatusBadge style={PAYMENT_STATUS_STYLES[session.payment.status]} />}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {session.status === "ACTIVE" ? (
          <Button size="sm" variant="secondary" disabled={isPending} onClick={() => run(() => pauseSession(session.id))}>
            <Pause className="h-3.5 w-3.5" /> Pause
          </Button>
        ) : (
          <Button size="sm" variant="secondary" disabled={isPending} onClick={() => run(() => resumeSession(session.id))}>
            <Play className="h-3.5 w-3.5" /> Resume
          </Button>
        )}
        <Button size="sm" variant="secondary" disabled={isPending} onClick={() => run(() => extendSession(session.id, 30))}>
          <Plus className="h-3.5 w-3.5" /> Extend 30m
        </Button>
        <Button size="sm" variant="outline" disabled={isPending} onClick={() => setChargeOpen(true)}>
          <IndianRupee className="h-3.5 w-3.5" /> Add Charge
        </Button>
        {session.payment?.status !== "PAID" ? (
          <Button
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() => session.payment && run(() => setPaymentStatus(session.payment!.id, "PAID"))}
          >
            Mark Paid
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() => session.payment && run(() => setPaymentStatus(session.payment!.id, "PENDING"))}
          >
            Mark Unpaid
          </Button>
        )}
        <Button
          size="sm"
          variant="danger"
          className="col-span-2"
          disabled={isPending}
          onClick={() => run(() => endSession(session.id))}
        >
          {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Square className="h-3.5 w-3.5" />}
          End Session
        </Button>
      </div>

      {chargeOpen && (
        <AddChargeModal sessionId={session.id} onClose={() => setChargeOpen(false)} />
      )}
    </Card>
  );
}

function AddChargeModal({ sessionId, onClose }: { sessionId: string; onClose: () => void }) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();

  function submit() {
    const n = Number(amount);
    if (!n || n <= 0) return;
    startTransition(async () => {
      await addExtraCharge(sessionId, n, note || undefined);
      onClose();
    });
  }

  return (
    <Modal open onClose={onClose} title="Add Extra Charge" size="sm">
      <div className="p-5 space-y-4">
        <div>
          <Label>Amount (₹)</Label>
          <Input type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 50" autoFocus />
        </div>
        <div>
          <Label>Note (optional)</Label>
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Extra controller, snacks..." />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} disabled={isPending}>
            {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Add Charge
          </Button>
        </div>
      </div>
    </Modal>
  );
}
