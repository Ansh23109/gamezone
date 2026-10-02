import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { getTenantBySlug } from "@/lib/tenant/resolve";

// Next.js only supports one app/manifest.ts per app (it's not a per-segment
// convention like icon.tsx), so this branches on the x-host-mode/
// x-tenant-slug headers proxy.ts sets to serve the right identity for
// whichever host requested it — the tenant app or the owner console.
// Calling headers() makes this dynamic/request-time rather than the
// cached-by-default static manifest Next.js would otherwise produce.
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const h = await headers();
  const isAdminHost = h.get("x-host-mode") === "admin";
  const slug = h.get("x-tenant-slug");

  if (isAdminHost) {
    return {
      name: "Owner Console",
      short_name: "Owner Console",
      description: "Cross-tenant administration",
      start_url: "/admin",
      display: "standalone",
      background_color: "#0a0a0a",
      theme_color: "#111111",
      icons: [
        { src: "/pwa-icon-192", sizes: "192x192", type: "image/png" },
        { src: "/pwa-icon-512", sizes: "512x512", type: "image/png" },
      ],
    };
  }

  const tenant = slug ? await getTenantBySlug(slug) : null;
  const displayName = tenant?.displayName ?? "Gaming Center Management";
  const primaryColor = tenant?.primaryColor ?? "#6366f1";

  return {
    name: displayName,
    short_name: displayName,
    description: "Booking, sessions and revenue management for gaming centers.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: primaryColor,
    icons: [
      { src: "/pwa-icon-192", sizes: "192x192", type: "image/png" },
      { src: "/pwa-icon-512", sizes: "512x512", type: "image/png" },
    ],
  };
}
