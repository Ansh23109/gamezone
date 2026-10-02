import type { Metadata, Viewport } from "next";
import "./globals.css";
import StaticLanding from "@/components/static-landing";
import { PwaRegister } from "@/components/pwa-register";

// Fallback metadata for routes that don't set their own (e.g. /login, the
// DB-missing fallback below) — (tenant)/layout.tsx and app/admin/layout.tsx
// override this per-tenant/console via their own generateMetadata/metadata.
export const metadata: Metadata = {
  title: "Gaming Center Management",
  description: "Booking, sessions and revenue management for gaming centers.",
  appleWebApp: { statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = { themeColor: "#6366f1" };

// This is the ONE root layout shared by (auth), (tenant) and admin routes —
// it must stay minimal (no data fetching, no per-tenant branding) since it
// wraps all of them, including the login page that renders before any
// tenant/session is known.
export default async function RootLayout({ children }: LayoutProps<"/">) {
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

  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full font-sans">
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
