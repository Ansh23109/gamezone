// Pure pricing-resolution logic with no database dependency, so it can run
// both on the server (fed rows from the DB) and in the browser (fed rows
// already loaded as props) for instant "as you type" price previews.

import { round2 } from "./format";

// Peak/off-peak windows are always defined in IST wall-clock time (the
// business's own timezone), regardless of what timezone this code happens to
// run in (server or browser) — so day-of-week/hour are read via a fixed IST
// offset rather than the runtime's local getDay()/getHours().
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
function istPartsOf(at: Date): { dayOfWeek: number; minutesOfDay: number } {
  const ist = new Date(at.getTime() + IST_OFFSET_MS);
  return { dayOfWeek: ist.getUTCDay(), minutesOfDay: ist.getUTCHours() * 60 + ist.getUTCMinutes() };
}

export type PricingRuleLike = {
  id: string;
  gameTypeId: string;
  stationId: string | null;
  unit: "PER_HOUR" | "PER_30_MIN" | "PER_GAME" | "CUSTOM";
  durationMinutes: number;
  price: string | number;
  tier: "STANDARD" | "PEAK" | "OFF_PEAK";
  daysOfWeek: number[];
  startTime: string | null;
  endTime: string | null;
  priority: number;
  isActive: boolean;
};

export function ruleMatchesTime(rule: PricingRuleLike, at: Date): boolean {
  if (rule.tier === "STANDARD") return true;
  const { dayOfWeek: day, minutesOfDay: minutesNow } = istPartsOf(at);
  if (rule.daysOfWeek && rule.daysOfWeek.length > 0 && !rule.daysOfWeek.includes(day)) {
    return false;
  }
  if (rule.startTime && rule.endTime) {
    const [sh, sm] = rule.startTime.split(":").map(Number);
    const [eh, em] = rule.endTime.split(":").map(Number);
    const startMin = sh * 60 + sm;
    const endMin = eh * 60 + em;
    if (startMin <= endMin) {
      if (minutesNow < startMin || minutesNow >= endMin) return false;
    } else {
      if (minutesNow < startMin && minutesNow >= endMin) return false;
    }
  }
  return true;
}

export function findApplicablePricingRuleFromList(
  rules: PricingRuleLike[],
  gameTypeId: string,
  stationId: string | null,
  at: Date,
): PricingRuleLike | null {
  const candidates = rules.filter(
    (r) => r.gameTypeId === gameTypeId && r.isActive && (r.stationId === stationId || r.stationId === null),
  );
  if (candidates.length === 0) return null;

  const scored = candidates.map((rule) => {
    let score = 0;
    if (rule.stationId) score += 10;
    if (rule.tier !== "STANDARD" && ruleMatchesTime(rule, at)) score += 5;
    if (rule.tier === "STANDARD") score += 1;
    score += rule.priority;
    return { rule, score, timeMatches: rule.tier === "STANDARD" || ruleMatchesTime(rule, at) };
  });

  const eligible = scored.filter((s) => s.timeMatches);
  const pool = eligible.length > 0 ? eligible : scored;
  pool.sort((a, b) => b.score - a.score);
  return pool[0]?.rule ?? null;
}

export function computeAmountForRule(rule: PricingRuleLike, requestedMinutes: number): number {
  const price = Number(rule.price);
  if (rule.unit === "PER_GAME") {
    const games = Math.max(1, Math.ceil(requestedMinutes / Math.max(1, rule.durationMinutes)));
    return round2(price * games);
  }
  const base = rule.unit === "PER_HOUR" ? 60 : rule.unit === "PER_30_MIN" ? 30 : rule.durationMinutes;
  return round2(price * (requestedMinutes / base));
}

export function previewPrice(
  rules: PricingRuleLike[],
  gameTypeId: string,
  stationId: string | null,
  durationMinutes: number,
  at: Date = new Date(),
): { amount: number; rule: PricingRuleLike | null } {
  const rule = findApplicablePricingRuleFromList(rules, gameTypeId, stationId, at);
  if (!rule) return { amount: 0, rule: null };
  return { amount: computeAmountForRule(rule, durationMinutes), rule };
}
