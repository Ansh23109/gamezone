"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Zap, Loader2, Check } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/form";
import { GameIcon } from "@/lib/icon-map";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import { previewPrice, type PricingRuleLike } from "@/lib/pricing-shared";
import { startWalkInSession } from "@/lib/actions/sessions";
import { useStaff } from "@/lib/context/staff-context";
import { STATION_STATUS_STYLES } from "@/lib/constants";

type GameType = { id: string; name: string; icon: string | null; color: string | null };
type Station = { id: string; name: string; gameTypeId: string; status: string; isActive: boolean };

export function WalkInButton({
  gameTypes,
  stations,
  pricingRules,
  variant = "primary",
  fullWidth = false,
  label = "New Entry",
}: {
  gameTypes: GameType[];
  stations: Station[];
  pricingRules: PricingRuleLike[];
  variant?: "primary" | "secondary";
  fullWidth?: boolean;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant={variant}
        size="lg"
        className={cn("font-semibold", fullWidth && "w-full")}
        onClick={() => setOpen(true)}
      >
        <Zap className="h-4 w-4" />
        {label}
      </Button>
      {open && (
        <WalkInModal
          open={open}
          onClose={() => setOpen(false)}
          gameTypes={gameTypes}
          stations={stations}
          pricingRules={pricingRules}
        />
      )}
    </>
  );
}

function unitPresets(rule: PricingRuleLike | null): { label: string; minutes: number }[] {
  if (!rule) return [{ label: "1h", minutes: 60 }];
  if (rule.unit === "PER_30_MIN") {
    return [
      { label: "30m", minutes: 30 },
      { label: "1h", minutes: 60 },
      { label: "1.5h", minutes: 90 },
      { label: "2h", minutes: 120 },
    ];
  }
  if (rule.unit === "PER_GAME") {
    const block = rule.durationMinutes || 10;
    return [
      { label: "1 game", minutes: block },
      { label: "2 games", minutes: block * 2 },
      { label: "3 games", minutes: block * 3 },
      { label: "5 games", minutes: block * 5 },
    ];
  }
  return [
    { label: "30m", minutes: 30 },
    { label: "1h", minutes: 60 },
    { label: "1.5h", minutes: 90 },
    { label: "2h", minutes: 120 },
    { label: "3h", minutes: 180 },
  ];
}

function WalkInModal({
  open,
  onClose,
  gameTypes,
  stations,
  pricingRules,
}: {
  open: boolean;
  onClose: () => void;
  gameTypes: GameType[];
  stations: Station[];
  pricingRules: PricingRuleLike[];
}) {
  const router = useRouter();
  const { staff, currentStaffId, setCurrentStaffId } = useStaff();
  const [gameTypeId, setGameTypeId] = useState<string>(gameTypes[0]?.id ?? "");
  const [stationId, setStationId] = useState<string>("");
  const [customerName, setCustomerName] = useState("");
  const [customerMobile, setCustomerMobile] = useState("");
  const [durationMinutes, setDurationMinutes] = useState<number | null>(null);
  const [markPaid, setMarkPaid] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "UPI" | "CARD" | "OTHER">("CASH");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  const stationsForGame = useMemo(
    () => stations.filter((s) => s.gameTypeId === gameTypeId && s.isActive),
    [stations, gameTypeId],
  );

  const activeStationId = stationId || stationsForGame.find((s) => s.status === "AVAILABLE")?.id || "";

  const { amount, rule } = useMemo(() => {
    if (!gameTypeId || !activeStationId) return { amount: 0, rule: null };
    const presetRule = previewPrice(pricingRules, gameTypeId, activeStationId, 60).rule;
    const minutes = durationMinutes ?? unitPresets(presetRule)[0]?.minutes ?? 60;
    return previewPrice(pricingRules, gameTypeId, activeStationId, minutes);
  }, [gameTypeId, activeStationId, durationMinutes, pricingRules]);

  const presets = unitPresets(rule);
  const effectiveMinutes = durationMinutes ?? presets[0]?.minutes ?? 60;

  function reset() {
    setGameTypeId(gameTypes[0]?.id ?? "");
    setStationId("");
    setCustomerName("");
    setCustomerMobile("");
    setDurationMinutes(null);
    setMarkPaid(false);
    setError(null);
    setSuccess(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleSubmit() {
    setError(null);
    if (!gameTypeId) return setError("Pick a game.");
    if (!activeStationId) return setError("Pick an available station.");

    startTransition(async () => {
      try {
        await startWalkInSession({
          customerName: customerName || undefined,
          customerMobile: customerMobile || undefined,
          gameTypeId,
          stationId: activeStationId,
          durationMinutes: effectiveMinutes,
          staffId: currentStaffId || undefined,
          markPaid,
          paymentMethod,
        });
        setSuccess(true);
        setTimeout(() => {
          handleClose();
          router.push("/active-sessions");
        }, 700);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  return (
    <Modal open={open} onClose={handleClose} title="New Walk-In Entry" subtitle="Start a session in seconds" size="lg">
      <div className="p-5 space-y-5">
        {success ? (
          <div className="flex flex-col items-center justify-center gap-3 py-10">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/15 text-success">
              <Check className="h-6 w-6" />
            </div>
            <p className="text-sm font-medium text-foreground">Session started!</p>
          </div>
        ) : (
          <>
            {/* Step 1: Game */}
            <div>
              <Label>1. Select game</Label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {gameTypes.map((gt) => (
                  <button
                    key={gt.id}
                    onClick={() => {
                      setGameTypeId(gt.id);
                      setStationId("");
                      setDurationMinutes(null);
                    }}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-xs font-medium transition-colors",
                      gameTypeId === gt.id
                        ? "border-accent bg-accent-soft text-foreground"
                        : "border-border bg-surface-2 text-muted hover:border-border-strong",
                    )}
                  >
                    <GameIcon icon={gt.icon} className="h-5 w-5" style={{ color: gt.color ?? undefined }} />
                    {gt.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: Station */}
            <div>
              <Label>2. Select station</Label>
              {stationsForGame.length === 0 ? (
                <p className="text-xs text-muted-2">No stations for this game type.</p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {stationsForGame.map((st) => {
                    const disabled = st.status !== "AVAILABLE";
                    const isSelected = activeStationId === st.id;
                    return (
                      <button
                        key={st.id}
                        disabled={disabled}
                        onClick={() => setStationId(st.id)}
                        className={cn(
                          "rounded-xl border px-2 py-2.5 text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
                          isSelected
                            ? "border-accent bg-accent-soft text-foreground"
                            : "border-border bg-surface-2 text-muted hover:border-border-strong",
                        )}
                      >
                        <div>{st.name}</div>
                        <div
                          className={cn(
                            "mt-1 inline-block rounded px-1.5 py-0.5 text-[10px]",
                            STATION_STATUS_STYLES[st.status]?.className,
                          )}
                        >
                          {STATION_STATUS_STYLES[st.status]?.label ?? st.status}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Step 3: Customer (optional) */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>3. Customer name (optional)</Label>
                <Input placeholder="Walk-in Guest" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
              </div>
              <div>
                <Label>Mobile number (optional)</Label>
                <Input placeholder="98765 43210" value={customerMobile} onChange={(e) => setCustomerMobile(e.target.value)} />
              </div>
            </div>

            {/* Step 4: Duration */}
            <div>
              <Label>4. Duration</Label>
              <div className="flex flex-wrap gap-2">
                {presets.map((p) => (
                  <button
                    key={p.minutes}
                    onClick={() => setDurationMinutes(p.minutes)}
                    className={cn(
                      "rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors",
                      effectiveMinutes === p.minutes
                        ? "border-accent bg-accent-soft text-foreground"
                        : "border-border bg-surface-2 text-muted hover:border-border-strong",
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Price */}
            <div className="rounded-xl border border-border bg-surface-2 p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted">Total price</p>
                <p className="text-2xl font-semibold text-foreground">{formatCurrency(amount)}</p>
                {rule && <p className="text-xs text-muted-2 mt-0.5">{rule.tier !== "STANDARD" ? `${rule.tier} rate · ` : ""}auto-calculated</p>}
              </div>
              <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                <input type="checkbox" checked={markPaid} onChange={(e) => setMarkPaid(e.target.checked)} className="h-4 w-4 rounded accent-[var(--accent)]" />
                Mark as paid now
              </label>
            </div>

            {markPaid && (
              <div className="flex gap-2">
                {(["CASH", "UPI", "CARD", "OTHER"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setPaymentMethod(m)}
                    className={cn(
                      "rounded-lg border px-3 py-1.5 text-xs font-medium",
                      paymentMethod === m ? "border-accent bg-accent-soft text-foreground" : "border-border bg-surface-2 text-muted",
                    )}
                  >
                    {m}
                  </button>
                ))}
              </div>
            )}

            {staff.length > 0 && (
              <div>
                <Label>Staff</Label>
                <select
                  value={currentStaffId ?? ""}
                  onChange={(e) => setCurrentStaffId(e.target.value)}
                  className="h-9 w-full rounded-lg border border-border-strong bg-surface-2 px-3 text-sm text-foreground outline-none focus:border-accent"
                >
                  {staff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {error && <p className="text-sm text-danger">{error}</p>}

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="ghost" onClick={handleClose}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleSubmit} disabled={isPending || !activeStationId}>
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                Start Session
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
