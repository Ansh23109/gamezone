import { CURRENCY_SYMBOL } from "./constants";

export function formatCurrency(amount: number | string): string {
  const n = typeof amount === "string" ? Number(amount) : amount;
  return `${CURRENCY_SYMBOL}${n.toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;
}

export function formatCurrencyPrecise(amount: number | string): string {
  const n = typeof amount === "string" ? Number(amount) : amount;
  return `${CURRENCY_SYMBOL}${n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function formatTime(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  }).format(date);
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(date);
}

export function formatDateTime(date: Date): string {
  return `${formatDate(date)}, ${formatTime(date)}`;
}

export function formatRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.round(diffMs / 60000);
  if (Math.abs(diffMin) < 1) return "just now";
  if (diffMin > 0) {
    if (diffMin < 60) return `${diffMin}m ago`;
    const h = Math.floor(diffMin / 60);
    if (h < 24) return `${h}h ${diffMin % 60}m ago`;
    return formatDate(date);
  }
  const abs = Math.abs(diffMin);
  if (abs < 60) return `in ${abs}m`;
  const h = Math.floor(abs / 60);
  return `in ${h}h ${abs % 60}m`;
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
