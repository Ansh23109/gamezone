// Central place for status labels, colors and small config used across the UI.
// Keeping these out of components means adding a new status/game type never
// requires touching JSX.

export const BOOKING_STATUSES = [
  "UPCOMING",
  "CHECKED_IN",
  "ACTIVE",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
] as const;

export const SESSION_STATUSES = ["ACTIVE", "PAUSED", "COMPLETED", "CANCELLED"] as const;

export const STATION_STATUSES = [
  "AVAILABLE",
  "BOOKED",
  "ACTIVE",
  "MAINTENANCE",
  "OFFLINE",
] as const;

export const PAYMENT_STATUSES = ["PAID", "PARTIALLY_PAID", "PENDING"] as const;
export const PAYMENT_METHODS = ["CASH", "UPI", "CARD", "OTHER"] as const;
export const PRICING_UNITS = ["PER_HOUR", "PER_30_MIN", "PER_GAME", "CUSTOM"] as const;
export const PRICING_TIERS = ["STANDARD", "PEAK", "OFF_PEAK"] as const;

type BadgeStyle = { label: string; className: string };

export const BOOKING_STATUS_STYLES: Record<string, BadgeStyle> = {
  UPCOMING: { label: "Upcoming", className: "bg-sky-500/15 text-sky-300 border-sky-500/30" },
  CHECKED_IN: { label: "Checked In", className: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
  ACTIVE: { label: "Active", className: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  COMPLETED: { label: "Completed", className: "bg-zinc-500/15 text-zinc-300 border-zinc-500/30" },
  CANCELLED: { label: "Cancelled", className: "bg-rose-500/15 text-rose-300 border-rose-500/30" },
  NO_SHOW: { label: "No Show", className: "bg-orange-500/15 text-orange-300 border-orange-500/30" },
};

export const SESSION_STATUS_STYLES: Record<string, BadgeStyle> = {
  ACTIVE: { label: "Active", className: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  PAUSED: { label: "Paused", className: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
  COMPLETED: { label: "Completed", className: "bg-zinc-500/15 text-zinc-300 border-zinc-500/30" },
  CANCELLED: { label: "Cancelled", className: "bg-rose-500/15 text-rose-300 border-rose-500/30" },
};

export const STATION_STATUS_STYLES: Record<string, BadgeStyle> = {
  AVAILABLE: { label: "Available", className: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  BOOKED: { label: "Booked", className: "bg-sky-500/15 text-sky-300 border-sky-500/30" },
  ACTIVE: { label: "Active", className: "bg-violet-500/15 text-violet-300 border-violet-500/30" },
  MAINTENANCE: { label: "Maintenance", className: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
  OFFLINE: { label: "Offline", className: "bg-rose-500/15 text-rose-300 border-rose-500/30" },
};

export const PAYMENT_STATUS_STYLES: Record<string, BadgeStyle> = {
  PAID: { label: "Paid", className: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  PARTIALLY_PAID: { label: "Partial", className: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
  PENDING: { label: "Pending", className: "bg-rose-500/15 text-rose-300 border-rose-500/30" },
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: "Cash",
  UPI: "UPI",
  CARD: "Card",
  OTHER: "Other",
};

export const PRICING_UNIT_LABELS: Record<string, string> = {
  PER_HOUR: "Per hour",
  PER_30_MIN: "Per 30 minutes",
  PER_GAME: "Per game",
  CUSTOM: "Custom duration",
};

export const DURATION_PRESETS_MINUTES = [30, 60, 90, 120, 180];

export const CURRENCY = "INR";
export const CURRENCY_SYMBOL = "₹";

export const BUSINESS_HOURS = { openHour: 10, closeHour: 24 }; // 10:00 - 24:00
