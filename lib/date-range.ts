// All "day" boundaries are computed in Asia/Kolkata (IST, UTC+5:30) since this
// is an India-focused gaming center, regardless of the server's own timezone.

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

export type DateRangePreset = "today" | "yesterday" | "week" | "month" | "custom";

export function istNow(): Date {
  return new Date(Date.now() + IST_OFFSET_MS);
}

/** Returns UTC instants representing the start/end of an IST calendar day. */
function istDayBounds(istDate: Date): { start: Date; end: Date } {
  const y = istDate.getUTCFullYear();
  const m = istDate.getUTCMonth();
  const d = istDate.getUTCDate();
  const startIst = Date.UTC(y, m, d, 0, 0, 0, 0);
  const start = new Date(startIst - IST_OFFSET_MS);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

export function resolveDateRange(
  preset: DateRangePreset,
  custom?: { from?: string; to?: string },
): { start: Date; end: Date; label: string } {
  const nowIst = istNow();

  switch (preset) {
    case "today": {
      const { start, end } = istDayBounds(nowIst);
      return { start, end, label: "Today" };
    }
    case "yesterday": {
      const yesterdayIst = new Date(nowIst.getTime() - 24 * 60 * 60 * 1000);
      const { start, end } = istDayBounds(yesterdayIst);
      return { start, end, label: "Yesterday" };
    }
    case "week": {
      const day = nowIst.getUTCDay(); // 0 = Sunday
      const diffToMonday = day === 0 ? 6 : day - 1;
      const mondayIst = new Date(nowIst.getTime() - diffToMonday * 24 * 60 * 60 * 1000);
      const { start } = istDayBounds(mondayIst);
      const { end } = istDayBounds(nowIst);
      return { start, end, label: "This Week" };
    }
    case "month": {
      const firstOfMonthIst = new Date(Date.UTC(nowIst.getUTCFullYear(), nowIst.getUTCMonth(), 1));
      const { start } = istDayBounds(firstOfMonthIst);
      const { end } = istDayBounds(nowIst);
      return { start, end, label: "This Month" };
    }
    case "custom": {
      if (custom?.from && custom?.to) {
        const [fy, fm, fd] = custom.from.split("-").map(Number);
        const [ty, tm, td] = custom.to.split("-").map(Number);
        const { start } = istDayBounds(new Date(Date.UTC(fy, fm - 1, fd)));
        const { end } = istDayBounds(new Date(Date.UTC(ty, tm - 1, td)));
        return { start, end, label: "Custom Range" };
      }
      const { start, end } = istDayBounds(nowIst);
      return { start, end, label: "Custom Range" };
    }
  }
}

export function toIstDateInputValue(date: Date): string {
  const ist = new Date(date.getTime() + IST_OFFSET_MS);
  const y = ist.getUTCFullYear();
  const m = String(ist.getUTCMonth() + 1).padStart(2, "0");
  const d = String(ist.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Converts an IST wall-clock date+time (as typed by staff — "2026-09-04",
 * "14:10") into the correct UTC instant, regardless of what timezone the
 * Node process itself happens to run in. Never use `new Date(y,m,d,h,min)`
 * for business timestamps — that constructor uses the server's LOCAL
 * timezone, which is frequently UTC in cloud deployments and would silently
 * shift every booking by 5.5 hours.
 */
export function istWallClockToUtc(dateStr: string, timeStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [h, min] = timeStr.split(":").map(Number);
  return new Date(Date.UTC(y, (m ?? 1) - 1, d, h, min, 0, 0) - IST_OFFSET_MS);
}

/** Returns the UTC instants bounding an IST calendar day, given "yyyy-mm-dd". */
export function dayBoundsForDateString(dateStr: string): { start: Date; end: Date } {
  const [y, m, d] = dateStr.split("-").map(Number);
  const start = new Date(Date.UTC(y, (m ?? 1) - 1, d, 0, 0, 0, 0) - IST_OFFSET_MS);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

/** Reads a UTC instant back as IST wall-clock parts (hour/minute/day-of-week). */
export function getIstParts(date: Date): { hour: number; minute: number; dayOfWeek: number; year: number; month: number; day: number } {
  const ist = new Date(date.getTime() + IST_OFFSET_MS);
  return {
    hour: ist.getUTCHours(),
    minute: ist.getUTCMinutes(),
    dayOfWeek: ist.getUTCDay(),
    year: ist.getUTCFullYear(),
    month: ist.getUTCMonth(),
    day: ist.getUTCDate(),
  };
}
