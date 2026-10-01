import type { Metadata } from "next";
import { AppShell } from "@/components/layout/app-shell";
import { listActiveGameTypes, listStations } from "@/lib/queries/stations";
import { listPricingRules } from "@/lib/queries/pricing";
import { requireTenantUser } from "@/lib/auth/session";
import { resolveLogoSrc } from "@/lib/tenant/branding";

// Station availability and pricing feed the global Walk-In button on every
// page — this must never be served from a stale build-time snapshot.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { tenant } = await requireTenantUser();
  return {
    title: `${tenant.displayName} — Gaming Center Management`,
    description: "Booking, sessions and revenue management for gaming centers.",
  };
}

export default async function TenantLayout({ children }: LayoutProps<"/">) {
  // proxy.ts already redirects unauthenticated/mismatched-tenant requests to
  // /login before this ever renders, but this call is still required (not
  // just redundant defense-in-depth) — it's how we get the tenant/user data
  // this layout needs to render branding and the shell at all.
  const { tenant, user } = await requireTenantUser();

  const [gameTypes, stations, pricingRules] = await Promise.all([
    listActiveGameTypes(tenant.id),
    listStations(tenant.id),
    listPricingRules(tenant.id),
  ]);

  return (
    <AppShell
      branding={{
        displayName: tenant.displayName,
        logoSrc: resolveLogoSrc(tenant.slug, tenant.logoPath),
        primaryColor: tenant.primaryColor,
      }}
      currentUser={{ name: user.name, role: user.role }}
      gameTypes={gameTypes.map((g) => ({ id: g.id, name: g.name, icon: g.icon, color: g.color }))}
      stations={stations.map((s) => ({
        id: s.id,
        name: s.name,
        gameTypeId: s.gameTypeId,
        status: s.status,
        isActive: s.isActive,
      }))}
      pricingRules={pricingRules.map((r) => ({
        id: r.id,
        gameTypeId: r.gameTypeId,
        stationId: r.stationId,
        unit: r.unit,
        durationMinutes: r.durationMinutes,
        price: r.price,
        tier: r.tier,
        daysOfWeek: r.daysOfWeek,
        startTime: r.startTime,
        endTime: r.endTime,
        priority: r.priority,
        isActive: r.isActive,
      }))}
    >
      {children}
    </AppShell>
  );
}
