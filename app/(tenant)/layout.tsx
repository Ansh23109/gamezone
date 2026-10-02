import type { Metadata, Viewport } from "next";
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
    // manifest is auto-linked from app/manifest.ts; appleWebApp emits both
    // mobile-web-app-capable and apple-mobile-web-app-title, which together
    // with the manifest is what lets iOS/Android actually offer
    // "Add to Home Screen" / install as an app.
    appleWebApp: { title: tenant.displayName, statusBarStyle: "black-translucent" },
  };
}

// generateViewport (not the static `viewport` export) since it needs the
// per-tenant color from requireTenantUser() — this layout is already fully
// dynamic (force-dynamic above), so the "can't stream" tradeoff noted in
// Next's docs doesn't cost anything extra here.
export async function generateViewport(): Promise<Viewport> {
  const { tenant } = await requireTenantUser();
  return { themeColor: tenant.primaryColor };
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
