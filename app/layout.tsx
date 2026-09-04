import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/layout/app-shell";
import { listActiveGameTypes, listStations } from "@/lib/queries/stations";
import { listPricingRules } from "@/lib/queries/pricing";
import { listActiveStaff } from "@/lib/queries/users";
import StaticLanding from "@/components/static-landing";

export const metadata: Metadata = {
  title: "GameZone — Gaming Center Management",
  description: "Booking, sessions and revenue management for gaming centers.",
};

// Station availability and pricing feed the global Walk-In button on every
// page — this must never be served from a stale build-time snapshot.
export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [gameTypes, stations, pricingRules, staff] = await Promise.all([
    listActiveGameTypes(),
    listStations(),
    listPricingRules(),
    listActiveStaff(),
  ]);
  const dbMissing = !process.env.DATABASE_URL && process.env.NODE_ENV === "production";

  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full font-sans">
        {dbMissing && (
          <div className="w-full bg-yellow-600 text-black p-2 text-sm text-center">
            Warning: Database not configured for this deployment. Some pages may be unavailable. Set
            DATABASE_URL in Vercel Project Settings → Environment Variables.
          </div>
        )}
  const dbMissing = !process.env.DATABASE_URL && process.env.NODE_ENV === "production";

  if (dbMissing) {
    return (
      <html lang="en" className="h-full antialiased">
        <body className="min-h-full font-sans">
          <div className="w-full bg-yellow-600 text-black p-2 text-sm text-center">
            Warning: Database not configured for this deployment. Some pages may be unavailable. Set
            DATABASE_URL in Vercel Project Settings → Environment Variables.
          </div>
          <StaticLanding />
        </body>
      </html>
    );
  }

  const [gameTypes, stations, pricingRules, staff] = await Promise.all([
    listActiveGameTypes(),
    listStations(),
    listPricingRules(),
    listActiveStaff(),
  ]);

  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full font-sans">
        <AppShell
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
          staff={staff.map((s) => ({ id: s.id, name: s.name, role: s.role }))}
        >
          {children}
        </AppShell>
      </body>
    </html>
  );
}
