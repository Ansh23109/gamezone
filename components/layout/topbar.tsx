"use client";

import Link from "next/link";
import { Menu, Zap, CalendarPlus, CalendarClock, Wallet } from "lucide-react";
import { WalkInButton } from "@/components/sessions/walk-in-button";
import type { PricingRuleLike } from "@/lib/pricing-shared";

type GameType = { id: string; name: string; icon: string | null; color: string | null };
type Station = { id: string; name: string; gameTypeId: string; status: string; isActive: boolean };

export function Topbar({
  onOpenMobileNav,
  gameTypes,
  stations,
  pricingRules,
}: {
  onOpenMobileNav: () => void;
  gameTypes: GameType[];
  stations: Station[];
  pricingRules: PricingRuleLike[];
}) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/80 backdrop-blur px-4 sm:px-6">
      <button onClick={onOpenMobileNav} className="lg:hidden text-muted hover:text-foreground">
        <Menu className="h-5 w-5" />
      </button>

      <div className="hidden md:flex items-center gap-1.5">
        <QuickLink href="/bookings" icon={CalendarPlus} label="New Booking" />
        <QuickLink href="/active-sessions" icon={Zap} label="Active Sessions" />
        <QuickLink href="/bookings" icon={CalendarClock} label="Today's Bookings" />
        <QuickLink href="/payments" icon={Wallet} label="Payments" />
      </div>

      <div className="ml-auto">
        <WalkInButton gameTypes={gameTypes} stations={stations} pricingRules={pricingRules} />
      </div>
    </header>
  );
}

function QuickLink({ href, icon: Icon, label }: { href: string; icon: React.ElementType; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted hover:bg-surface-2 hover:text-foreground"
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </Link>
  );
}
