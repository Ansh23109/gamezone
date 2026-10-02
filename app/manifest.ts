import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { resolveHostMode, getTenantBySlug } from "@/lib/tenant/resolve";

// Next.js only supports one app/manifest.ts per app (it's not a per-segment
// convention like icon.tsx), so this branches on the requesting host to
// serve the right identity for the tenant app vs. the owner console.
// Resolved directly from the raw `host` header (via resolveHostMode), NOT
// the x-host-mode/x-tenant-slug headers proxy.ts sets — this route is
// deliberately excluded from proxy's matcher (must be fetchable pre-auth),
// so proxy never runs for it and those headers are never set. Calling
// headers() also makes this dynamic/request-time rather than the
// cached-by-default static manifest Next.js would otherwise produce.
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const h = await headers();
  const hostMode = resolveHostMode(h.get("host"));

  if (hostMode.kind === "admin") {
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

  const tenant = hostMode.kind === "tenant" ? await getTenantBySlug(hostMode.slug) : null;
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
