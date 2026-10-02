import { ImageResponse } from "next/og";
import { headers } from "next/headers";
import { resolveHostMode, getTenantBySlug } from "./resolve";

/**
 * Shared renderer behind app/icon.tsx, app/apple-icon.tsx, and the two PWA
 * manifest icon routes — one place for the glyph so all four stay visually
 * consistent. These routes are deliberately excluded from proxy.ts's
 * matcher (they must be fetchable pre-auth, e.g. on the login page), which
 * means proxy never runs for them and never sets its x-host-mode/
 * x-tenant-slug headers — so this resolves the host itself from the raw
 * `host` header (always present regardless of proxy) rather than depending
 * on those.
 */
export async function renderBrandIcon(size: number) {
  const h = await headers();
  const hostMode = resolveHostMode(h.get("host"));

  let primaryColor = "#6366f1";
  if (hostMode.kind === "admin") {
    primaryColor = "#111111";
  } else if (hostMode.kind === "tenant") {
    const tenant = await getTenantBySlug(hostMode.slug);
    if (tenant) primaryColor = tenant.primaryColor;
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: primaryColor,
          borderRadius: size * 0.22,
        }}
      >
        {/* Exact Joystick path from lucide-react (node_modules/lucide-react/
           dist/esm/icons/joystick.mjs) — matches the fallback icon used in
           the UI (components/layout/sidebar.tsx) when a tenant has no
           uploaded logo, so the installed app icon and in-app branding stay
           visually consistent. Can't use the <Joystick> component directly:
           ImageResponse's Satori renderer only supports plain <svg>/<path>. */}
        <svg width={size * 0.56} height={size * 0.56} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 17a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2Z" />
          <path d="M6 15v-2" />
          <path d="M12 15V9" />
          <circle cx="12" cy="6" r="3" />
        </svg>
      </div>
    ),
    { width: size, height: size },
  );
}
