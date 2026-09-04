# GameZone — Gaming Zone Management & Booking Software

A lightweight, real-time booking and operations console for a multi-experience gaming center (PS5, PS4, Pool, Racing Simulators, Arcade). Built to replace manual booking logs and WhatsApp-based scheduling with a single fast front-desk tool.

## Stack

- **Next.js 16** (App Router, Server Actions, Turbopack) + **React 19** + **TypeScript**
- **Tailwind CSS v4** (CSS-based `@theme`, no `tailwind.config.js`)
- **PostgreSQL 16** with **Drizzle ORM** (see "Why Drizzle, not Prisma" below)
- **Recharts** for dashboard/report visualizations, **lucide-react** for icons

No authentication system is included by design (MVP scope, single front-desk team) — a lightweight "current staff" selector (stored in `localStorage`) is used purely for attributing who created a booking or ran a session, not for access control.

## Why Drizzle, not Prisma

The spec asked for Prisma. This environment's network egress does not reach `binaries.prisma.sh`, which every Prisma CLI/client invocation needs to download its query engine binary — so `prisma generate`, `prisma migrate`, and even `prisma --help` fail outright here, regardless of flags or driver-adapter settings. Rather than ship something that only works with the sandbox's specific network configuration, I switched the ORM to **Drizzle**: same relational-model-first workflow (schema-as-code, generated SQL migrations, typed query builder, relations), no native binary, works with a plain `pg` connection anywhere Postgres is reachable. The data model, migrations, and business-logic layer are unaffected by this choice — swapping back to Prisma later is a schema/query-layer port, not a redesign.

## Getting started

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up PostgreSQL** and point `DATABASE_URL` at it. Copy `.env.example` to `.env` and adjust if needed:
   ```
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/gamezone?schema=public"
   ```
   Create the database if it doesn't exist: `createdb gamezone`.

3. **Run migrations**
   ```bash
   npx drizzle-kit push
   ```
   (or `npx drizzle-kit generate && npx drizzle-kit migrate` if you prefer versioned migration files — one is already checked in under `db/migrations/`).

4. **Seed realistic demo data** (staff, 5 game types, 19 stations, pricing rules, 45 customers, ~588 historical/live/future bookings with sessions, payments and transactions):
   ```bash
   npx tsx db/seed.ts
   ```
   This is idempotent — re-running it truncates and regenerates everything, so it's safe to use whenever you want a clean demo state.

5. **Run the dev server**
   ```bash
   npm run dev
   ```
   Open http://localhost:3000.

For production: `npm run build && npm run start`.

## Project structure

```
app/                   Route segments (App Router) — one folder per nav item
  page.tsx             Dashboard
  bookings/            Booking list + timeline
  calendar/            Day/Week calendar (Calendly-style grid)
  active-sessions/     Live walk-in / checked-in session cards
  customers/           Customer list + per-customer history
  games-stations/      Game types & stations CRUD
  pricing/             Pricing rules CRUD (per-hour/30-min/per-game, peak/off-peak)
  payments/            Transactions + daily sales summary
  reports/             Analytics + CSV export
  settings/            Staff management + business info

components/            UI components, grouped by feature (bookings/, calendar/,
                        sessions/, stations/, pricing/, customers/, charts/, ui/)

lib/
  actions/             Server Actions ("use server") — all writes (create booking,
                        start/extend/end session, record payment, etc.)
  queries/             Server-side read functions used by Server Components
  pricing.ts / pricing-shared.ts   Pricing-rule resolution (server + pure logic
                        shared with client-side "live price preview")
  availability.ts      Double-booking prevention (conflict detection)
  date-range.ts         All IST (Asia/Kolkata) timezone-safe date helpers — see below
  constants.ts, format.ts, utils.ts

db/
  schema.ts            Drizzle schema — all tables, enums, relations
  index.ts             DB client
  migrations/          Generated SQL migrations
  seed.ts               Demo data generator
```

## Data model

Nine tables: `users` (staff), `customers`, `game_types`, `stations`, `pricing_rules`, `bookings`, `gaming_sessions`, `payments`, `transactions`, wired together as:

- A **game type** (e.g. "PS5") has many **stations** (e.g. PS5-01…PS5-04) and many **pricing rules**.
- A **booking** references a customer, a game type, a station, and (once checked in) a **gaming session** and a **payment**.
- A **gaming session** tracks actual start/end/pause time and extensions — separate from the booking's *planned* time, so "actual session revenue" and "gaming hours sold" can be computed from what really happened, not just what was scheduled.
- **Pricing rules** are scoped to a game type (optionally a specific station), with a unit (`PER_HOUR` / `PER_30_MIN` / `PER_GAME` / `CUSTOM`), a tier (`STANDARD` / `PEAK` / `OFF_PEAK`), and optional day-of-week + time-window constraints — fully admin-editable from **Pricing**, nothing is hardcoded in components.
- **Transactions** are the ledger (one row per payment event, cash/UPI/card/other) that both the **Payments** page and the daily sales summary read from.

## Business logic worth knowing about

- **Double-booking prevention** (`lib/availability.ts`): every booking create/edit checks for time-overlapping bookings on the same station before saving.
- **Automatic pricing** (`lib/pricing.ts` / `pricing-shared.ts`): given a game type, station, start time and duration, the applicable rule is resolved by specificity (station-specific beats game-type-wide) and by whether the booking's time falls inside a PEAK/OFF_PEAK window, then the price is computed from the rule's unit. This runs both server-side (on save) and client-side (for the instant price preview as staff fill out a form).
- **IST-correct time handling** (`lib/date-range.ts`): every "wall clock" time typed by staff, every calendar-day boundary, and every PEAK/OFF_PEAK window match is computed in Asia/Kolkata time via fixed-offset conversion — never via the JS `Date` object's local-timezone accessors (`getHours`, `setDate`, `new Date(y,m,d,h,m)`), which are relative to wherever the code happens to run. This matters because a production host's server clock is very often UTC; without this, every booking time and every calendar block would render 5.5 hours off from what staff typed.
- **Live session tracking** (`active-sessions`): elapsed/remaining time, pause/resume, extensions, ad-hoc extra charges, and marking payment — all update the underlying `gaming_sessions`/`bookings`/`payments` rows via Server Actions, with station status flipping between Available/Booked/Active/Maintenance automatically as sessions start and end.
- **Dashboard/report numbers are all computed from live data** (`lib/queries/dashboard.ts`, `reports.ts`) — revenue, bookings, utilization, gaming hours, and the "most popular game" are aggregated from actual `bookings`/`gaming_sessions`/`payments` rows for the selected date range, not hardcoded.

## Known limitations (intentional, for MVP scope)

- No auth/login — staff selection is a convenience dropdown, not access control.
- Single-location only (no multi-branch support).
- CSV export only for reports (no PDF).

These were explicitly out of scope for a first version per the brief ("do not over-engineer the first version") and are natural follow-ups.
