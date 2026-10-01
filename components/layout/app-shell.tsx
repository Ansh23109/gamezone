"use client";

import { useState } from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import type { PricingRuleLike } from "@/lib/pricing-shared";

type GameType = { id: string; name: string; icon: string | null; color: string | null };
type Station = { id: string; name: string; gameTypeId: string; status: string; isActive: boolean };
export type Branding = { displayName: string; logoSrc: string | null; primaryColor: string };
export type CurrentUser = { name: string; role: string };

export function AppShell({
  children,
  gameTypes,
  stations,
  pricingRules,
  branding,
  currentUser,
}: {
  children: React.ReactNode;
  gameTypes: GameType[];
  stations: Station[];
  pricingRules: PricingRuleLike[];
  branding: Branding;
  currentUser: CurrentUser;
}) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex min-h-dvh">
      <Sidebar
        mobileOpen={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
        branding={branding}
        currentUser={currentUser}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar
          onOpenMobileNav={() => setMobileNavOpen(true)}
          gameTypes={gameTypes}
          stations={stations}
          pricingRules={pricingRules}
        />
        <main className="flex-1 px-4 sm:px-6 py-6 max-w-[1600px] w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
