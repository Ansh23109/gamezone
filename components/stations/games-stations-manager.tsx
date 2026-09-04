"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, Trash2, Pencil } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Input, Label, Select } from "@/components/ui/form";
import { GameIcon } from "@/lib/icon-map";
import { STATION_STATUS_STYLES, STATION_STATUSES } from "@/lib/constants";
import { createStation, setStationStatus, deleteStation, updateStation } from "@/lib/actions/stations";
import { createGameType } from "@/lib/actions/game-types";
import { cn } from "@/lib/utils";

type Station = {
  id: string;
  name: string;
  status: string;
  location: string | null;
  capacity: number;
  isActive: boolean;
  notes: string | null;
};
type GameTypeWithStations = {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  isActive: boolean;
  stations: Station[];
};

export function GamesStationsManager({ gameTypes }: { gameTypes: GameTypeWithStations[] }) {
  const router = useRouter();
  const [addStationFor, setAddStationFor] = useState<string | null>(null);
  const [editStation, setEditStation] = useState<Station | null>(null);
  const [addGameOpen, setAddGameOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function run(fn: () => Promise<unknown>) {
    startTransition(async () => {
      await fn();
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button variant="secondary" onClick={() => setAddGameOpen(true)}>
          <Plus className="h-4 w-4" /> Add Game Type
        </Button>
      </div>

      {gameTypes.map((gt) => (
        <Card key={gt.id} className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: `${gt.color}22`, color: gt.color ?? undefined }}>
                <GameIcon icon={gt.icon} className="h-4.5 w-4.5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">{gt.name}</h3>
                <p className="text-xs text-muted">{gt.stations.length} station{gt.stations.length !== 1 ? "s" : ""}</p>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => setAddStationFor(gt.id)}>
              <Plus className="h-3.5 w-3.5" /> Add Station
            </Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {gt.stations.map((st) => (
              <div key={st.id} className="rounded-xl border border-border bg-surface-2 p-3">
                <div className="flex items-start justify-between">
                  <p className="text-sm font-medium text-foreground truncate">{st.name}</p>
                  <div className="flex gap-1">
                    <button onClick={() => setEditStation(st)} className="text-muted hover:text-foreground">
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Remove ${st.name}? This cannot be undone.`)) run(() => deleteStation(st.id));
                      }}
                      className="text-muted hover:text-danger"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
                {st.location && <p className="text-[11px] text-muted-2 mt-0.5">{st.location}</p>}
                <select
                  value={st.status}
                  disabled={isPending}
                  onChange={(e) => run(() => setStationStatus(st.id, e.target.value as any))}
                  className={cn(
                    "mt-2 w-full rounded-md border px-2 py-1 text-[11px] font-medium bg-transparent outline-none",
                    STATION_STATUS_STYLES[st.status]?.className,
                  )}
                >
                  {STATION_STATUSES.map((s) => (
                    <option key={s} value={s} className="bg-surface text-foreground">
                      {STATION_STATUS_STYLES[s].label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
            {gt.stations.length === 0 && (
              <p className="col-span-full text-xs text-muted-2 py-4 text-center">No stations yet — add one above.</p>
            )}
          </div>
        </Card>
      ))}

      {addStationFor && (
        <AddStationModal gameTypeId={addStationFor} onClose={() => setAddStationFor(null)} />
      )}
      {editStation && <EditStationModal station={editStation} onClose={() => setEditStation(null)} />}
      {addGameOpen && <AddGameTypeModal onClose={() => setAddGameOpen(false)} />}
    </div>
  );
}

function AddStationModal({ gameTypeId, onClose }: { gameTypeId: string; onClose: () => void }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [capacity, setCapacity] = useState(1);
  const [isPending, startTransition] = useTransition();

  function submit() {
    if (!name.trim()) return;
    startTransition(async () => {
      await createStation({ name, gameTypeId, location: location || undefined, capacity });
      router.refresh();
      onClose();
    });
  }

  return (
    <Modal open onClose={onClose} title="Add Station" size="sm">
      <div className="p-5 space-y-4">
        <div>
          <Label>Station name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. PS5-05" autoFocus />
        </div>
        <div>
          <Label>Location / area (optional)</Label>
          <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Zone A" />
        </div>
        <div>
          <Label>Capacity</Label>
          <Input type="number" min={1} value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} disabled={isPending}>
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Add Station
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function EditStationModal({ station, onClose }: { station: Station; onClose: () => void }) {
  const router = useRouter();
  const [name, setName] = useState(station.name);
  const [location, setLocation] = useState(station.location ?? "");
  const [capacity, setCapacity] = useState(station.capacity);
  const [isPending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      await updateStation(station.id, { name, location: location || null, capacity });
      router.refresh();
      onClose();
    });
  }

  return (
    <Modal open onClose={onClose} title="Edit Station" size="sm">
      <div className="p-5 space-y-4">
        <div>
          <Label>Station name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </div>
        <div>
          <Label>Location / area</Label>
          <Input value={location} onChange={(e) => setLocation(e.target.value)} />
        </div>
        <div>
          <Label>Capacity</Label>
          <Input type="number" min={1} value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} disabled={isPending}>
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </div>
    </Modal>
  );
}

const ICON_OPTIONS = ["gamepad-2", "circle-dot", "car", "joystick", "swords", "trophy"];
const COLOR_OPTIONS = ["#6366f1", "#8b5cf6", "#10b981", "#f59e0b", "#ec4899", "#38bdf8", "#f43f5e"];

function AddGameTypeModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [icon, setIcon] = useState(ICON_OPTIONS[0]);
  const [color, setColor] = useState(COLOR_OPTIONS[0]);
  const [isPending, startTransition] = useTransition();

  function submit() {
    if (!name.trim()) return;
    startTransition(async () => {
      await createGameType({ name, icon, color });
      router.refresh();
      onClose();
    });
  }

  return (
    <Modal open onClose={onClose} title="Add Game Type" size="sm">
      <div className="p-5 space-y-4">
        <div>
          <Label>Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. VR Zone" autoFocus />
        </div>
        <div>
          <Label>Icon</Label>
          <div className="flex gap-2 flex-wrap">
            {ICON_OPTIONS.map((i) => (
              <button
                key={i}
                onClick={() => setIcon(i)}
                className={cn("flex h-9 w-9 items-center justify-center rounded-lg border", icon === i ? "border-accent bg-accent-soft" : "border-border")}
              >
                <GameIcon icon={i} className="h-4 w-4" />
              </button>
            ))}
          </div>
        </div>
        <div>
          <Label>Color</Label>
          <div className="flex gap-2 flex-wrap">
            {COLOR_OPTIONS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={cn("h-7 w-7 rounded-full border-2", color === c ? "border-foreground" : "border-transparent")}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} disabled={isPending}>
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Add Game Type
          </Button>
        </div>
      </div>
    </Modal>
  );
}
