import { renderBrandIcon } from "@/lib/tenant/icon-image";

// 180x180 is Apple's recommended apple-touch-icon size.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default async function AppleIcon() {
  return renderBrandIcon(180);
}
