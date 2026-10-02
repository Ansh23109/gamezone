import { renderBrandIcon } from "@/lib/tenant/icon-image";

// Separate from app/icon.tsx (32x32, for browser tabs/favicons) — these two
// sizes are what Chrome/Android's "Add to Home Screen" install criteria
// specifically look for in the manifest's icons array.
export async function GET() {
  return renderBrandIcon(192);
}
