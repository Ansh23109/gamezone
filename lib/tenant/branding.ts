import "server-only";
import fs from "node:fs";
import path from "node:path";

const EXTENSIONS = ["svg", "png", "jpg", "webp"];

/**
 * Resolves a tenant's logo to a `public/`-relative URL. Logos are static
 * files the owner drops in at public/brands/<slug>/logo.<ext> when
 * onboarding a client (per the project's chosen "owner-managed, no upload
 * infra" approach) — `tenants.logoPath` can override this convention when
 * set. Returns null (falls back to the default icon in the UI) if nothing
 * is found, rather than pointing at a 404'ing image.
 */
export function resolveLogoSrc(slug: string, logoPathOverride: string | null): string | null {
  if (logoPathOverride) return logoPathOverride;
  for (const ext of EXTENSIONS) {
    const rel = `brands/${slug}/logo.${ext}`;
    const abs = path.join(process.cwd(), "public", rel);
    if (fs.existsSync(abs)) return `/${rel}`;
  }
  return null;
}
