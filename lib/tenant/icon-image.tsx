import { ImageResponse } from "next/og";
import { headers } from "next/headers";
import { getTenantBySlug } from "./resolve";

/**
 * Shared renderer behind app/icon.tsx, app/apple-icon.tsx, and the two PWA
 * manifest icon routes — one place for the glyph so all four stay visually
 * consistent. Reads tenant branding straight from the x-tenant-slug header
 * proxy.ts sets (not getTenantContext()/requireTenantUser() — icons must
 * render pre-login too, e.g. on the login page itself).
 */
export async function renderBrandIcon(size: number) {
  const h = await headers();
  const isAdminHost = h.get("x-host-mode") === "admin";
  const slug = h.get("x-tenant-slug");

  let primaryColor = "#6366f1";
  if (isAdminHost) {
    primaryColor = "#111111";
  } else if (slug) {
    const tenant = await getTenantBySlug(slug);
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
