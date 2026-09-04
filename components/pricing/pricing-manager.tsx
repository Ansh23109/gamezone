"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, Trash2, Pencil } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Input, Label, Select } from "@/components/ui/form";
import { formatCurrency } from "@/lib/format";
import { PRICING_UNIT_LABELS, PRICING_UNITS, PRICING_TIERS } from "@/lib/constants";
import { createPricingRule, updatePricingRule, deletePricingRule, type PricingRuleInput } from "@/lib/actions/pricing";
import { cn } from "@/lib/utils";

type Rule = {
  id: string;
  name: string;
  unit: string;
  durationMinutes: number;
  price: string;
  tier: string;
  isActive: boolean;
  stationId: string | null;
  startTime: string | null;
  endTime: string | null;
  gameType: { id: string; name: string };
  station: { id: string; name: string } | null;
};
type GameType = { id: string; name: string };
type Station = { id: string; name: string; gameTypeId: string };

export function PricingManager({ rules, gameTypes, stations }: { rules: Rule[]; gameTypes: GameType[]; stations: Station[] }) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Rule | null>(null);
  const [isPending, startTransition] = useTransition();

  function run(fn: () => Promise<unknown>) {
    startTransition(async () => {
      await fn();
      router.refresh();
    });
  }

  const byGameType = gameTypes.map((gt) => ({ gameType: gt, rules: rules.filter((r) => r.gameType.id === gt.id) }));

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button variant="primary" onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4" /> Add Pricing Rule
        </Button>
      </div>

      {byGameType.map(({ gameType, rules: gtRules }) => (
        <Card key={gameType.id}>
          <CardHeader title={gameType.name} subtitle={`${gtRules.length} pricing rule${gtRules.length !== 1 ? "s" : ""}`} />
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-border bg-surface-2 text-left text-xs text-muted">
                  <th className="px-5 py-2.5 font-medium">Rule</th>
                  <th className="px-5 py-2.5 font-medium">Applies to</th>
                  <th className="px-5 py-2.5 font-medium">Unit</th>
                  <th className="px-5 py-2.5 font-medium">Price</th>
                  <th className="px-5 py-2.5 font-medium">Tier</th>
                  <th className="px-5 py-2.5 font-medium">Window</th>
                  <th className="px-5 py-2.5 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {gtRules.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-6 text-center text-xs text-muted-2">
                      No pricing rules for {gameType.name} yet.
                    </td>
                  </tr>
                )}
                {gtRules.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-b-0">
                    <td className="px-5 py-3 text-foreground font-medium">{r.name}</td>
                    <td className="px-5 py-3 text-muted">{r.station?.name ?? "All stations"}</td>
                    <td className="px-5 py-3 text-muted">{PRICING_UNIT_LABELS[r.unit]}</td>
                    <td className="px-5 py-3 text-foreground font-medium">{formatCurrency(r.price)}</td>
                    <td className="px-5 py-3">
                      <Badge className={r.tier === "PEAK" ? "bg-warning/15 text-warning border-warning/30" : r.tier === "OFF_PEAK" ? "bg-info/15 text-info border-info/30" : "bg-surface-2 text-muted border-border"}>
                        {r.tier}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-muted text-xs">
                      {r.startTime && r.endTime ? `${r.startTime}–${r.endTime}` : "—"}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setEditing(r)} className="text-muted hover:text-foreground">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Delete "${r.name}"?`)) run(() => deletePricingRule(r.id));
                          }}
                          className="text-muted hover:text-danger"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ))}

      {(formOpen || editing) && (
        <PricingFormModal
          gameTypes={gameTypes}
          stations={stations}
          initial={editing}
          onClose={() => {
            setFormOpen(false);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function PricingFormModal({
  gameTypes,
  stations,
  initial,
  onClose,
}: {
  gameTypes: GameType[];
  stations: Station[];
  initial: Rule | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [gameTypeId, setGameTypeId] = useState(initial?.gameType.id ?? gameTypes[0]?.id ?? "");
  const [stationId, setStationId] = useState(initial?.stationId ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [unit, setUnit] = useState(initial?.unit ?? "PER_HOUR");
  const [durationMinutes, setDurationMinutes] = useState(initial?.durationMinutes ?? 60);
  const [price, setPrice] = useState(initial ? Number(initial.price) : 100);
  const [tier, setTier] = useState(initial?.tier ?? "STANDARD");
  const [startTime, setStartTime] = useState(initial?.startTime ?? "18:00");
  const [endTime, setEndTime] = useState(initial?.endTime ?? "23:00");
  const [isPending, startTransition] = useTransition();

  const stationsForGame = stations.filter((s) => s.gameTypeId === gameTypeId);

  function submit() {
    if (!name.trim() || price <= 0) return;
    const payload: PricingRuleInput = {
      gameTypeId,
      stationId: stationId || null,
      name,
      unit: unit as any,
      durationMinutes,
      price,
      tier: tier as any,
      startTime: tier === "STANDARD" ? null : startTime,
      endTime: tier === "STANDARD" ? null : endTime,
    };
    startTransition(async () => {
      if (initial) await updatePricingRule(initial.id, payload);
      else await createPricingRule(payload);
      router.refresh();
      onClose();
    });
  }

  return (
    <Modal open onClose={onClose} title={initial ? "Edit Pricing Rule" : "Add Pricing Rule"} size="md">
      <div className="p-5 space-y-4">
        <div>
          <Label>Rule name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. PS5 Standard" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Game type</Label>
            <Select value={gameTypeId} onChange={(e) => { setGameTypeId(e.target.value); setStationId(""); }}>
              {gameTypes.map((gt) => (
                <option key={gt.id} value={gt.id}>
                  {gt.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Station (optional override)</Label>
            <Select value={stationId} onChange={(e) => setStationId(e.target.value)}>
              <option value="">All stations of this game</option>
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
            <Label>Unit</Label>
            <Select value={unit} onChange={(e) => setUnit(e.target.value)}>
              {PRICING_UNITS.map((u) => (
                <option key={u} value={u}>
                  {PRICING_UNIT_LABELS[u]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>{unit === "PER_GAME" ? "Minutes per game" : "Base duration (min)"}</Label>
            <Input type="number" min={5} value={durationMinutes} onChange={(e) => setDurationMinutes(Number(e.target.value))} />
          </div>
          <div>
            <Label>Price (₹)</Label>
            <Input type="number" min={1} value={price} onChange={(e) => setPrice(Number(e.target.value))} />
          </div>
        </div>
        <div>
          <Label>Tier</Label>
          <div className="flex gap-2">
            {PRICING_TIERS.map((t) => (
              <button
                key={t}
                onClick={() => setTier(t)}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-xs font-medium",
                  tier === t ? "border-accent bg-accent-soft text-foreground" : "border-border text-muted",
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        {tier !== "STANDARD" && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Window start</Label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div>
              <Label>Window end</Label>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} disabled={isPending}>
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {initial ? "Save Changes" : "Add Rule"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
