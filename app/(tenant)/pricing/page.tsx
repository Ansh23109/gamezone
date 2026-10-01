import { listPricingRules } from "@/lib/queries/pricing";
import { listAllGameTypes, listStations } from "@/lib/queries/stations";
import { PricingManager } from "@/components/pricing/pricing-manager";
import { requireTenantUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function PricingPage() {
  const { tenant } = await requireTenantUser();
  const [rules, gameTypes, stations] = await Promise.all([
    listPricingRules(tenant.id),
    listAllGameTypes(tenant.id),
    listStations(tenant.id),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Pricing</h1>
        <p className="text-sm text-muted mt-0.5">Configure per-hour, per-30-min, per-game and peak/off-peak rates.</p>
      </div>
      <PricingManager
        rules={rules as any}
        gameTypes={gameTypes}
        stations={stations.map((s) => ({ id: s.id, name: s.name, gameTypeId: s.gameTypeId }))}
      />
    </div>
  );
}
