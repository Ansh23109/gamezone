import { renderBrandIcon } from "@/lib/tenant/icon-image";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default async function Icon() {
  return renderBrandIcon(32);
}
