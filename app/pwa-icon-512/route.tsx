import { renderBrandIcon } from "@/lib/tenant/icon-image";

export async function GET() {
  return renderBrandIcon(512);
}
