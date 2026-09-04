"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarClock,
  CalendarDays,
  Zap,
  Users,
  Gamepad2,
  Tag,
  Wallet,
  BarChart3,
  Settings,
  Joystick,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/bookings", label: "Bookings", icon: CalendarClock },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/active-sessions", label: "Active Sessions", icon: Zap },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/games-stations", label: "Games & Stations", icon: Gamepad2 },
  { href: "/pricing", label: "Pricing", icon: Tag },
  { href: "/payments", label: "Payments", icon: Wallet },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({ mobileOpen, onCloseMobile }: { mobileOpen: boolean; onCloseMobile: () => void }) {
  const pathname = usePathname();

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={onCloseMobile} />
      )}
      <aside
        className={cn(
          "fixed lg:sticky top-0 z-50 lg:z-0 h-dvh w-64 shrink-0 border-r border-border bg-surface flex flex-col transition-transform lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between px-5 h-16 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-white glow-accent">
              <Joystick className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight text-foreground">GameZone</p>
              <p className="text-[10px] text-muted-2 leading-tight">Management Console</p>
            </div>
          </div>
          <button onClick={onCloseMobile} className="lg:hidden text-muted hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {NAV.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onCloseMobile}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-accent-soft text-foreground"
                    : "text-muted hover:bg-surface-2 hover:text-foreground",
                )}
              >
                <Icon className={cn("h-4 w-4 shrink-0", active && "text-accent")} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border p-4">
          <p className="text-[11px] text-muted-2">GameZone Console v1.0</p>
        </div>
      </aside>
    </>
  );
}
