import { listGameTypesWithStations } from "@/lib/queries/stations";
import { GamesStationsManager } from "@/components/stations/games-stations-manager";
import { requireTenantUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function GamesStationsPage() {
  const { tenant } = await requireTenantUser();
  const gameTypes = await listGameTypesWithStations(tenant.id);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Games & Stations</h1>
        <p className="text-sm text-muted mt-0.5">Manage every gaming experience and the physical stations behind it.</p>
      </div>
      <GamesStationsManager gameTypes={gameTypes} />
    </div>
  );
}
