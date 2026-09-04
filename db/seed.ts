// ============================================================================
// Demo data seed — realistic Indian gaming-center data so the dashboard,
// calendar, reports and customer profiles all look complete immediately.
//
// Run with: npm run db:seed
// ============================================================================
import "dotenv/config";
import { db, schema } from "./index";
import { calculatePrice } from "../lib/pricing";
import { findConflictingBookings } from "../lib/availability";
import { round2 } from "../lib/format";
import { sql } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Small seeded RNG so re-running the seed produces a stable-feeling dataset.
// ---------------------------------------------------------------------------
let seed = 42;
function rand(): number {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
}
function randInt(min: number, max: number): number {
  return Math.floor(rand() * (max - min + 1)) + min;
}
function randChoice<T>(arr: T[]): T {
  return arr[randInt(0, arr.length - 1)];
}
function weightedChoice<T>(items: { value: T; weight: number }[]): T {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = rand() * total;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item.value;
  }
  return items[items.length - 1].value;
}

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
function istDateAtHour(dayOffset: number, hour: number, minute: number): Date {
  const now = new Date();
  const nowIst = new Date(now.getTime() + IST_OFFSET_MS);
  const y = nowIst.getUTCFullYear();
  const m = nowIst.getUTCMonth();
  const d = nowIst.getUTCDate();
  const targetIstUtcMs = Date.UTC(y, m, d + dayOffset, hour, minute, 0, 0);
  return new Date(targetIstUtcMs - IST_OFFSET_MS);
}

const FIRST_NAMES = [
  "Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Sai", "Reyansh", "Krishna",
  "Ishaan", "Rohan", "Kabir", "Aryan", "Dhruv", "Karthik", "Rahul", "Yash",
  "Ananya", "Diya", "Isha", "Kavya", "Meera", "Priya", "Riya", "Saanvi",
  "Sneha", "Tanvi", "Anika", "Neha", "Pooja", "Shreya", "Nikhil", "Varun",
  "Siddharth", "Aditi", "Ritika", "Aman", "Harsh", "Manav", "Om", "Zoya",
];
const LAST_NAMES = [
  "Sharma", "Verma", "Gupta", "Kumar", "Singh", "Patel", "Reddy", "Nair",
  "Iyer", "Rao", "Mehta", "Joshi", "Kapoor", "Malhotra", "Chatterjee", "Das",
  "Bose", "Pillai", "Menon", "Agarwal",
];

function randomCustomerName(): string {
  return `${randChoice(FIRST_NAMES)} ${randChoice(LAST_NAMES)}`;
}
function randomMobile(usedMobiles: Set<string>): string {
  let mobile = "";
  do {
    const prefix = randChoice(["9", "8", "7", "6"]);
    mobile = prefix + Array.from({ length: 9 }, () => randInt(0, 9)).join("");
  } while (usedMobiles.has(mobile));
  usedMobiles.add(mobile);
  return mobile;
}

async function main() {
  console.log("🌱 Seeding Gaming Zone database...");

  console.log("Clearing existing data...");
  await db.execute(sql`TRUNCATE TABLE
    transactions, payments, gaming_sessions, bookings,
    pricing_rules, stations, game_types, customers, users
    RESTART IDENTITY CASCADE`);

  // --------------------------------------------------------------------
  // Staff
  // --------------------------------------------------------------------
  console.log("Creating staff...");
  const staff = await db
    .insert(schema.users)
    .values([
      { name: "Rohit Malhotra", email: "rohit@gamezone.in", role: "ADMIN" },
      { name: "Ayesha Khan", email: "ayesha@gamezone.in", role: "MANAGER" },
      { name: "Vikram Singh", email: "vikram@gamezone.in", role: "STAFF" },
      { name: "Priyanka Nair", email: "priyanka@gamezone.in", role: "STAFF" },
    ])
    .returning();

  // --------------------------------------------------------------------
  // Game types
  // --------------------------------------------------------------------
  console.log("Creating game types...");
  const gameTypeDefs = [
    { name: "PS5", slug: "ps5", icon: "gamepad-2", color: "#6366f1", description: "PlayStation 5 stations", sortOrder: 1 },
    { name: "PS4", slug: "ps4", icon: "gamepad-2", color: "#8b5cf6", description: "PlayStation 4 stations", sortOrder: 2 },
    { name: "Pool", slug: "pool", icon: "circle-dot", color: "#10b981", description: "8-ball pool tables", sortOrder: 3 },
    { name: "Racing", slug: "racing", icon: "car", color: "#f59e0b", description: "Racing simulator rigs", sortOrder: 4 },
    { name: "Arcade", slug: "arcade", icon: "joystick", color: "#ec4899", description: "Arcade cabinet games", sortOrder: 5 },
  ];
  const gameTypes = await db.insert(schema.gameTypes).values(gameTypeDefs).returning();
  const gt = Object.fromEntries(gameTypes.map((g) => [g.slug, g]));

  // --------------------------------------------------------------------
  // Stations
  // --------------------------------------------------------------------
  console.log("Creating stations...");
  const stationDefs = [
    ...["01", "02", "03", "04"].map((n) => ({ name: `PS5-${n}`, gameTypeId: gt.ps5.id, location: "Zone A" })),
    ...["01", "02", "03"].map((n) => ({ name: `PS4-${n}`, gameTypeId: gt.ps4.id, location: "Zone A" })),
    ...["01", "02"].map((n) => ({ name: `Pool Table ${n}`, gameTypeId: gt.pool.id, location: "Zone B", capacity: 4 })),
    ...["01", "02"].map((n) => ({ name: `Racing Simulator ${n}`, gameTypeId: gt.racing.id, location: "Zone C" })),
    ...Array.from({ length: 8 }, (_, i) => ({
      name: `Arcade ${String(i + 1).padStart(2, "0")}`,
      gameTypeId: gt.arcade.id,
      location: "Zone D",
    })),
  ];
  const stations = await db.insert(schema.stations).values(stationDefs).returning();
  const stationsByGameType = new Map<string, typeof stations>();
  for (const s of stations) {
    const list = stationsByGameType.get(s.gameTypeId) ?? [];
    list.push(s);
    stationsByGameType.set(s.gameTypeId, list);
  }

  // --------------------------------------------------------------------
  // Pricing rules (standard + a peak-hour rule for the two busiest games)
  // --------------------------------------------------------------------
  console.log("Creating pricing rules...");
  await db.insert(schema.pricingRules).values([
    { gameTypeId: gt.ps5.id, name: "PS5 Standard", unit: "PER_HOUR", durationMinutes: 60, price: "150", tier: "STANDARD", priority: 0 },
    { gameTypeId: gt.ps5.id, name: "PS5 Peak (Fri-Sun evening)", unit: "PER_HOUR", durationMinutes: 60, price: "200", tier: "PEAK", daysOfWeek: [0, 5, 6], startTime: "18:00", endTime: "23:00", priority: 1 },
    { gameTypeId: gt.ps4.id, name: "PS4 Standard", unit: "PER_HOUR", durationMinutes: 60, price: "100", tier: "STANDARD", priority: 0 },
    { gameTypeId: gt.pool.id, name: "Pool Standard", unit: "PER_HOUR", durationMinutes: 60, price: "300", tier: "STANDARD", priority: 0 },
    { gameTypeId: gt.racing.id, name: "Racing Standard", unit: "PER_30_MIN", durationMinutes: 30, price: "200", tier: "STANDARD", priority: 0 },
    { gameTypeId: gt.racing.id, name: "Racing Peak (Fri-Sun evening)", unit: "PER_30_MIN", durationMinutes: 30, price: "250", tier: "PEAK", daysOfWeek: [0, 5, 6], startTime: "18:00", endTime: "23:00", priority: 1 },
    { gameTypeId: gt.arcade.id, name: "Arcade Standard", unit: "PER_GAME", durationMinutes: 10, price: "50", tier: "STANDARD", priority: 0 },
  ]);

  // --------------------------------------------------------------------
  // Customers
  // --------------------------------------------------------------------
  console.log("Creating customers...");
  const usedMobiles = new Set<string>();
  const customerDefs = Array.from({ length: 45 }, () => ({
    name: randomCustomerName(),
    mobile: randomMobile(usedMobiles),
  }));
  const customers = await db.insert(schema.customers).values(customerDefs).returning();

  // --------------------------------------------------------------------
  // Bookings + sessions + payments + transactions across the last 30 days,
  // today (with live active sessions), and a handful of future days.
  // --------------------------------------------------------------------
  console.log("Generating bookings, sessions & transactions (this takes a moment)...");

  const gameWeights = [
    { value: gt.ps5, weight: 35 },
    { value: gt.ps4, weight: 20 },
    { value: gt.arcade, weight: 20 },
    { value: gt.pool, weight: 15 },
    { value: gt.racing, weight: 10 },
  ];
  const paymentMethodWeights = [
    { value: "CASH" as const, weight: 45 },
    { value: "UPI" as const, weight: 40 },
    { value: "CARD" as const, weight: 15 },
  ];

  function pickDuration(gameSlug: string): number {
    if (gameSlug === "racing") return weightedChoice([{ value: 30, weight: 7 }, { value: 60, weight: 3 }]);
    if (gameSlug === "arcade") {
      const games = weightedChoice([{ value: 1, weight: 5 }, { value: 2, weight: 3 }, { value: 3, weight: 2 }]);
      return games * 10;
    }
    return weightedChoice([{ value: 60, weight: 5 }, { value: 90, weight: 3 }, { value: 120, weight: 2 }]);
  }

  let totalCreated = 0;
  const now = new Date();

  // Track today's "now" boundary in IST hours for deciding which of today's
  // slots are in the past (completed), currently happening (active), or future.
  const nowIst = new Date(now.getTime() + IST_OFFSET_MS);
  const nowIstHourRaw = nowIst.getUTCHours() + nowIst.getUTCMinutes() / 60;
  // Clamp to the business's open hours (10am-midnight IST) when picking
  // "today"'s booking times below — if the seed happens to run between
  // midnight and 10am IST, the raw current hour falls outside business
  // hours and would otherwise generate nonsensical pre-opening bookings.
  const nowIstHour = Math.min(23.9, Math.max(10, nowIstHourRaw));

  for (let dayOffset = -30; dayOffset <= 5; dayOffset++) {
    const isFuture = dayOffset > 0;
    const isToday = dayOffset === 0;
    const dow = new Date(istDateAtHour(dayOffset, 12, 0).getTime() + IST_OFFSET_MS).getUTCDay();
    const isWeekend = dow === 0 || dow === 5 || dow === 6;

    let bookingsToday: number;
    if (isFuture) bookingsToday = randInt(2, 6);
    else bookingsToday = isWeekend ? randInt(18, 28) : randInt(10, 20);

    for (let i = 0; i < bookingsToday; i++) {
      const gameType = weightedChoice(gameWeights);
      const gameStations = stationsByGameType.get(gameType.id)!;
      const durationMinutes = pickDuration(gameType.slug);

      // Pick a start hour appropriate for whether this is past/today/future.
      let hour: number;
      if (isFuture) {
        hour = randInt(10, 21);
      } else if (isToday) {
        // Bias toward "now" so we get a realistic mix of completed / active / upcoming.
        const roll = rand();
        if (roll < 0.65) hour = Math.max(10, Math.min(nowIstHour - 0.3, 10 + rand() * Math.max(0.5, nowIstHour - 10)));
        else if (roll < 0.85) hour = nowIstHour - 0.15; // about to be / currently active
        else hour = Math.min(23, nowIstHour + rand() * (23 - nowIstHour)); // later today
      } else {
        hour = 10 + rand() * 13;
      }
      const hh = Math.floor(hour);
      const mm = Math.floor((hour - hh) * 60);
      const startTime = istDateAtHour(dayOffset, hh, mm);
      const endTime = new Date(startTime.getTime() + durationMinutes * 60000);

      // Try a few stations to avoid double-booking collisions.
      let station = null;
      for (let attempt = 0; attempt < 4; attempt++) {
        const candidate = randChoice(gameStations);
        const conflicts = await findConflictingBookings({
          stationId: candidate.id,
          startTime,
          endTime,
        });
        if (conflicts.length === 0) {
          station = candidate;
          break;
        }
      }
      if (!station) continue; // skip this slot, station genuinely busy

      const customer = randChoice(customers);
      const { amount: price } = await calculatePrice({ gameTypeId: gameType.id, stationId: station.id, startTime, durationMinutes });
      const finalPrice = price > 0 ? price : durationMinutes; // guard, should never hit

      // Decide status.
      let status: (typeof schema.bookingStatusEnum.enumValues)[number];
      let sessionStatus: (typeof schema.sessionStatusEnum.enumValues)[number] | null = null;
      const isWalkIn = rand() < 0.55;

      if (isFuture) {
        status = "UPCOMING";
      } else if (isToday && endTime.getTime() > now.getTime() && startTime.getTime() <= now.getTime()) {
        status = "ACTIVE";
        sessionStatus = rand() < 0.15 ? "PAUSED" : "ACTIVE";
      } else if (isToday && startTime.getTime() > now.getTime()) {
        status = rand() < 0.3 ? "CHECKED_IN" : "UPCOMING";
      } else {
        // In the past.
        const roll = rand();
        if (roll < 0.9) {
          status = "COMPLETED";
          sessionStatus = "COMPLETED";
        } else if (roll < 0.96) {
          status = "CANCELLED";
        } else {
          status = "NO_SHOW";
        }
      }

      const [booking] = await db
        .insert(schema.bookings)
        .values({
          customerId: customer.id,
          gameTypeId: gameType.id,
          stationId: station.id,
          startTime,
          endTime,
          durationMinutes,
          price: finalPrice.toString(),
          status,
          isWalkIn,
          checkedInAt: status === "CHECKED_IN" || status === "ACTIVE" || status === "COMPLETED" ? startTime : null,
          cancelledAt: status === "CANCELLED" ? startTime : null,
          cancelReason: status === "CANCELLED" ? randChoice(["Customer changed plans", "Came in late, rebooked", "Weather"]) : null,
          createdById: randChoice(staff).id,
          createdAt: new Date(startTime.getTime() - randInt(5, 240) * 60000),
        })
        .returning();

      let session: typeof schema.gamingSessions.$inferSelect | null = null;
      if (sessionStatus) {
        const actualDurationMinutes =
          sessionStatus === "COMPLETED"
            ? Math.max(5, durationMinutes + randInt(-10, 15))
            : null;
        const actualEndTime = sessionStatus === "COMPLETED" ? new Date(startTime.getTime() + (actualDurationMinutes ?? durationMinutes) * 60000) : null;
        const extraCharges = sessionStatus === "COMPLETED" && rand() < 0.12 ? randChoice([20, 30, 50, 100]) : 0;

        const [s] = await db
          .insert(schema.gamingSessions)
          .values({
            bookingId: booking.id,
            customerId: customer.id,
            gameTypeId: gameType.id,
            stationId: station.id,
            status: sessionStatus,
            actualStartTime: startTime,
            actualEndTime,
            plannedDurationMinutes: durationMinutes,
            actualDurationMinutes,
            pausedAt: sessionStatus === "PAUSED" ? new Date(now.getTime() - randInt(1, 10) * 60000) : null,
            baseAmount: finalPrice.toString(),
            extraCharges: extraCharges.toString(),
            extraChargesNotes: extraCharges > 0 ? "Extra snacks/controller" : null,
            totalAmount: round2(finalPrice + extraCharges).toString(),
            createdById: booking.createdById,
          })
          .returning();
        session = s;
      }

      const totalAmount = session ? Number(session.totalAmount) : finalPrice;

      // Payment status distribution.
      let paymentStatus: (typeof schema.paymentStatusEnum.enumValues)[number];
      let amountPaid = 0;
      if (status === "CANCELLED" || status === "NO_SHOW") {
        paymentStatus = "PENDING";
      } else if (status === "COMPLETED") {
        const roll = rand();
        if (roll < 0.82) {
          paymentStatus = "PAID";
          amountPaid = totalAmount;
        } else if (roll < 0.93) {
          paymentStatus = "PARTIALLY_PAID";
          amountPaid = round2(totalAmount * (0.3 + rand() * 0.4));
        } else {
          paymentStatus = "PENDING";
        }
      } else if (status === "ACTIVE") {
        paymentStatus = rand() < 0.4 ? "PAID" : "PENDING";
        amountPaid = paymentStatus === "PAID" ? totalAmount : 0;
      } else {
        paymentStatus = "PENDING";
      }

      const [payment] = await db
        .insert(schema.payments)
        .values({
          bookingId: booking.id,
          sessionId: session?.id ?? null,
          customerId: customer.id,
          totalAmount: totalAmount.toString(),
          amountPaid: amountPaid.toString(),
          status: paymentStatus,
        })
        .returning();

      if (amountPaid > 0) {
        await db.insert(schema.transactions).values({
          paymentId: payment.id,
          bookingId: booking.id,
          sessionId: session?.id ?? null,
          customerId: customer.id,
          gameTypeId: gameType.id,
          stationId: station.id,
          amount: amountPaid.toString(),
          method: weightedChoice(paymentMethodWeights),
          staffId: booking.createdById,
          createdAt: session?.actualEndTime ?? endTime,
        });
      }

      if (status === "CANCELLED" || status === "COMPLETED" || status === "NO_SHOW") {
        await db.update(schema.stations).set({ status: "AVAILABLE" }).where(sql`${schema.stations.id} = ${station.id}`);
      } else if (status === "ACTIVE") {
        await db.update(schema.stations).set({ status: "ACTIVE" }).where(sql`${schema.stations.id} = ${station.id}`);
      } else if (status === "UPCOMING" || status === "CHECKED_IN") {
        // leave AVAILABLE — the booking itself represents the future hold
      }

      totalCreated++;
    }
  }

  // A couple of stations parked in maintenance to demo that state.
  const arcadeStations = stationsByGameType.get(gt.arcade.id)!;
  await db.update(schema.stations).set({ status: "MAINTENANCE", notes: "Screen flicker — technician called" }).where(sql`${schema.stations.id} = ${arcadeStations[arcadeStations.length - 1].id}`);

  console.log(`✅ Seed complete — ${totalCreated} bookings created across staff:${staff.length}, gameTypes:${gameTypes.length}, stations:${stations.length}, customers:${customers.length}`);
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
