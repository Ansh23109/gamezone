// ============================================================================
// Gaming Zone Management & Booking Software — Database Schema (Drizzle ORM)
// ============================================================================
// Relational model: User (staff) · Customer · GameType · Station ·
// PricingRule · Booking · GamingSession · Payment · Transaction
// ============================================================================

import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  numeric,
  pgEnum,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

// ----------------------------------------------------------------------------
// ENUMS
// ----------------------------------------------------------------------------

export const roleEnum = pgEnum("role", ["ADMIN", "MANAGER", "STAFF"]);

export const stationStatusEnum = pgEnum("station_status", [
  "AVAILABLE",
  "BOOKED",
  "ACTIVE",
  "MAINTENANCE",
  "OFFLINE",
]);

export const bookingStatusEnum = pgEnum("booking_status", [
  "UPCOMING",
  "CHECKED_IN",
  "ACTIVE",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
]);

export const sessionStatusEnum = pgEnum("session_status", [
  "ACTIVE",
  "PAUSED",
  "COMPLETED",
  "CANCELLED",
]);

export const paymentMethodEnum = pgEnum("payment_method", ["CASH", "UPI", "CARD", "OTHER"]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "PAID",
  "PARTIALLY_PAID",
  "PENDING",
]);

export const pricingUnitEnum = pgEnum("pricing_unit", [
  "PER_HOUR",
  "PER_30_MIN",
  "PER_GAME",
  "CUSTOM",
]);

export const pricingTierEnum = pgEnum("pricing_tier", ["STANDARD", "PEAK", "OFF_PEAK"]);

export const tenantStatusEnum = pgEnum("tenant_status", ["ACTIVE", "SUSPENDED"]);

// ----------------------------------------------------------------------------
// TENANTS (one row per client gaming center — the multi-tenant boundary)
// ----------------------------------------------------------------------------

export const tenants = pgTable("tenants", {
  id: id(),
  slug: text("slug").notNull().unique(), // "ppp" — drives public/brands/<slug>/ and subdomain resolution
  subdomain: text("subdomain").notNull().unique(), // label before .edgeweb.co, usually == slug
  displayName: text("display_name").notNull(),
  primaryColor: text("primary_color").notNull().default("#6366f1"),
  logoPath: text("logo_path"), // override; default computed from slug if null
  status: tenantStatusEnum("status").notNull().default("ACTIVE"),
  razorpayKeyId: text("razorpay_key_id"),
  razorpayKeySecretEncrypted: text("razorpay_key_secret_encrypted"),
  razorpayWebhookSecretEncrypted: text("razorpay_webhook_secret_encrypted"),
  razorpayEnabled: boolean("razorpay_enabled").notNull().default(false),
  ...timestamps,
});

// ----------------------------------------------------------------------------
// USERS (staff/operators — linked to Supabase Auth via authUserId)
// ----------------------------------------------------------------------------

export const users = pgTable(
  "users",
  {
    id: id(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id),
    authUserId: text("auth_user_id").unique(), // Supabase auth.users.id — linked by hand-appended FK in the migration
    name: text("name").notNull(),
    email: text("email"),
    role: roleEnum("role").notNull().default("STAFF"),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
  },
  (t) => [
    index("users_tenant_idx").on(t.tenantId),
    uniqueIndex("users_tenant_email_idx").on(t.tenantId, t.email),
  ],
);

// ----------------------------------------------------------------------------
// CUSTOMERS
// ----------------------------------------------------------------------------

export const customers = pgTable(
  "customers",
  {
    id: id(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id),
    name: text("name").notNull(),
    mobile: text("mobile").notNull(),
    email: text("email"),
    notes: text("notes"),
    ...timestamps,
  },
  (t) => [
    index("customers_tenant_idx").on(t.tenantId),
    index("customers_mobile_idx").on(t.mobile),
    uniqueIndex("customers_tenant_mobile_idx").on(t.tenantId, t.mobile),
  ],
);

// ----------------------------------------------------------------------------
// GAME TYPES
// ----------------------------------------------------------------------------

export const gameTypes = pgTable(
  "game_types",
  {
    id: id(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    icon: text("icon").default("gamepad-2"),
    color: text("color").default("#6366f1"),
    isActive: boolean("is_active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    ...timestamps,
  },
  (t) => [
    index("game_types_tenant_idx").on(t.tenantId),
    uniqueIndex("game_types_tenant_name_idx").on(t.tenantId, t.name),
    uniqueIndex("game_types_tenant_slug_idx").on(t.tenantId, t.slug),
  ],
);

// ----------------------------------------------------------------------------
// STATIONS
// ----------------------------------------------------------------------------

export const stations = pgTable(
  "stations",
  {
    id: id(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id),
    name: text("name").notNull(),
    gameTypeId: text("game_type_id")
      .notNull()
      .references(() => gameTypes.id, { onDelete: "cascade" }),
    status: stationStatusEnum("status").notNull().default("AVAILABLE"),
    location: text("location"),
    capacity: integer("capacity").notNull().default(1),
    isActive: boolean("is_active").notNull().default(true),
    notes: text("notes"),
    ...timestamps,
  },
  (t) => [index("stations_tenant_idx").on(t.tenantId), index("stations_game_type_idx").on(t.gameTypeId)],
);

// ----------------------------------------------------------------------------
// PRICING RULES
// ----------------------------------------------------------------------------

export const pricingRules = pgTable(
  "pricing_rules",
  {
    id: id(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id),
    gameTypeId: text("game_type_id")
      .notNull()
      .references(() => gameTypes.id, { onDelete: "cascade" }),
    stationId: text("station_id").references(() => stations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    unit: pricingUnitEnum("unit").notNull().default("PER_HOUR"),
    durationMinutes: integer("duration_minutes").notNull().default(60),
    price: numeric("price", { precision: 10, scale: 2 }).notNull(),
    tier: pricingTierEnum("tier").notNull().default("STANDARD"),
    daysOfWeek: integer("days_of_week").array().notNull().default([]),
    startTime: text("start_time"),
    endTime: text("end_time"),
    isActive: boolean("is_active").notNull().default(true),
    priority: integer("priority").notNull().default(0),
    ...timestamps,
  },
  (t) => [
    index("pricing_rules_tenant_idx").on(t.tenantId),
    index("pricing_rules_game_type_idx").on(t.gameTypeId),
    index("pricing_rules_station_idx").on(t.stationId),
  ],
);

// ----------------------------------------------------------------------------
// BOOKINGS
// ----------------------------------------------------------------------------

export const bookings = pgTable(
  "bookings",
  {
    id: id(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id),
    customerId: text("customer_id")
      .notNull()
      .references(() => customers.id),
    gameTypeId: text("game_type_id")
      .notNull()
      .references(() => gameTypes.id),
    stationId: text("station_id")
      .notNull()
      .references(() => stations.id),
    startTime: timestamp("start_time", { withTimezone: true }).notNull(),
    endTime: timestamp("end_time", { withTimezone: true }).notNull(),
    durationMinutes: integer("duration_minutes").notNull(),
    price: numeric("price", { precision: 10, scale: 2 }).notNull(),
    status: bookingStatusEnum("status").notNull().default("UPCOMING"),
    paymentStatus: paymentStatusEnum("payment_status").notNull().default("PENDING"),
    isWalkIn: boolean("is_walk_in").notNull().default(false),
    notes: text("notes"),
    checkedInAt: timestamp("checked_in_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    cancelReason: text("cancel_reason"),
    createdById: text("created_by_id").references(() => users.id),
    ...timestamps,
  },
  (t) => [
    index("bookings_tenant_idx").on(t.tenantId),
    index("bookings_station_time_idx").on(t.stationId, t.startTime, t.endTime),
    index("bookings_status_idx").on(t.status),
    index("bookings_start_time_idx").on(t.startTime),
  ],
);

// ----------------------------------------------------------------------------
// GAMING SESSIONS
// ----------------------------------------------------------------------------

export const gamingSessions = pgTable(
  "gaming_sessions",
  {
    id: id(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id),
    bookingId: text("booking_id")
      .notNull()
      .unique()
      .references(() => bookings.id, { onDelete: "cascade" }),
    customerId: text("customer_id")
      .notNull()
      .references(() => customers.id),
    gameTypeId: text("game_type_id")
      .notNull()
      .references(() => gameTypes.id),
    stationId: text("station_id")
      .notNull()
      .references(() => stations.id),
    status: sessionStatusEnum("status").notNull().default("ACTIVE"),
    actualStartTime: timestamp("actual_start_time", { withTimezone: true }).notNull().defaultNow(),
    actualEndTime: timestamp("actual_end_time", { withTimezone: true }),
    plannedDurationMinutes: integer("planned_duration_minutes").notNull(),
    actualDurationMinutes: integer("actual_duration_minutes"),
    pausedAt: timestamp("paused_at", { withTimezone: true }),
    totalPausedMinutes: integer("total_paused_minutes").notNull().default(0),
    baseAmount: numeric("base_amount", { precision: 10, scale: 2 }).notNull(),
    extraCharges: numeric("extra_charges", { precision: 10, scale: 2 }).notNull().default("0"),
    extraChargesNotes: text("extra_charges_notes"),
    totalAmount: numeric("total_amount", { precision: 10, scale: 2 }).notNull(),
    createdById: text("created_by_id").references(() => users.id),
    ...timestamps,
  },
  (t) => [
    index("sessions_tenant_idx").on(t.tenantId),
    index("sessions_status_idx").on(t.status),
    index("sessions_station_idx").on(t.stationId),
  ],
);

// ----------------------------------------------------------------------------
// PAYMENTS (invoice-level: total owed vs paid, one per booking/session)
// ----------------------------------------------------------------------------

export const payments = pgTable(
  "payments",
  {
    id: id(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id),
    bookingId: text("booking_id").unique().references(() => bookings.id, { onDelete: "cascade" }),
    sessionId: text("session_id").unique().references(() => gamingSessions.id, { onDelete: "cascade" }),
    customerId: text("customer_id")
      .notNull()
      .references(() => customers.id),
    totalAmount: numeric("total_amount", { precision: 10, scale: 2 }).notNull(),
    amountPaid: numeric("amount_paid", { precision: 10, scale: 2 }).notNull().default("0"),
    status: paymentStatusEnum("status").notNull().default("PENDING"),
    // Razorpay reconciliation (Phase 2) — a payment has at most one active link at a time
    gatewayPaymentLinkId: text("gateway_payment_link_id"),
    gatewayPaymentLinkUrl: text("gateway_payment_link_url"),
    ...timestamps,
  },
  (t) => [index("payments_tenant_idx").on(t.tenantId)],
);

// ----------------------------------------------------------------------------
// TRANSACTIONS (one row per actual money movement — sales ledger)
// ----------------------------------------------------------------------------

export const transactions = pgTable(
  "transactions",
  {
    id: id(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id),
    paymentId: text("payment_id")
      .notNull()
      .references(() => payments.id, { onDelete: "cascade" }),
    bookingId: text("booking_id").references(() => bookings.id),
    sessionId: text("session_id").references(() => gamingSessions.id),
    customerId: text("customer_id")
      .notNull()
      .references(() => customers.id),
    gameTypeId: text("game_type_id").references(() => gameTypes.id),
    stationId: text("station_id").references(() => stations.id),
    amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
    method: paymentMethodEnum("method").notNull().default("CASH"),
    note: text("note"),
    staffId: text("staff_id").references(() => users.id),
    // Razorpay reconciliation (Phase 2) — unique when set, the webhook idempotency key
    gatewayProvider: text("gateway_provider"),
    gatewayPaymentId: text("gateway_payment_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("transactions_tenant_idx").on(t.tenantId),
    index("transactions_created_at_idx").on(t.createdAt),
    uniqueIndex("transactions_gateway_payment_id_idx").on(t.gatewayPaymentId),
  ],
);

// ----------------------------------------------------------------------------
// RELATIONS
// ----------------------------------------------------------------------------

export const tenantsRelations = relations(tenants, ({ many }) => ({
  users: many(users),
  customers: many(customers),
  gameTypes: many(gameTypes),
  stations: many(stations),
  pricingRules: many(pricingRules),
  bookings: many(bookings),
  sessions: many(gamingSessions),
  payments: many(payments),
  transactions: many(transactions),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  tenant: one(tenants, { fields: [users.tenantId], references: [tenants.id] }),
  bookingsCreated: many(bookings),
  sessionsCreated: many(gamingSessions),
  transactions: many(transactions),
}));

export const customersRelations = relations(customers, ({ one, many }) => ({
  tenant: one(tenants, { fields: [customers.tenantId], references: [tenants.id] }),
  bookings: many(bookings),
  sessions: many(gamingSessions),
  payments: many(payments),
  transactions: many(transactions),
}));

export const gameTypesRelations = relations(gameTypes, ({ one, many }) => ({
  tenant: one(tenants, { fields: [gameTypes.tenantId], references: [tenants.id] }),
  stations: many(stations),
  pricingRules: many(pricingRules),
  bookings: many(bookings),
  sessions: many(gamingSessions),
}));

export const stationsRelations = relations(stations, ({ one, many }) => ({
  tenant: one(tenants, { fields: [stations.tenantId], references: [tenants.id] }),
  gameType: one(gameTypes, { fields: [stations.gameTypeId], references: [gameTypes.id] }),
  pricingRules: many(pricingRules),
  bookings: many(bookings),
  sessions: many(gamingSessions),
}));

export const pricingRulesRelations = relations(pricingRules, ({ one }) => ({
  tenant: one(tenants, { fields: [pricingRules.tenantId], references: [tenants.id] }),
  gameType: one(gameTypes, { fields: [pricingRules.gameTypeId], references: [gameTypes.id] }),
  station: one(stations, { fields: [pricingRules.stationId], references: [stations.id] }),
}));

export const bookingsRelations = relations(bookings, ({ one }) => ({
  tenant: one(tenants, { fields: [bookings.tenantId], references: [tenants.id] }),
  customer: one(customers, { fields: [bookings.customerId], references: [customers.id] }),
  gameType: one(gameTypes, { fields: [bookings.gameTypeId], references: [gameTypes.id] }),
  station: one(stations, { fields: [bookings.stationId], references: [stations.id] }),
  createdBy: one(users, { fields: [bookings.createdById], references: [users.id] }),
  session: one(gamingSessions, { fields: [bookings.id], references: [gamingSessions.bookingId] }),
  payment: one(payments, { fields: [bookings.id], references: [payments.bookingId] }),
}));

export const gamingSessionsRelations = relations(gamingSessions, ({ one }) => ({
  tenant: one(tenants, { fields: [gamingSessions.tenantId], references: [tenants.id] }),
  booking: one(bookings, { fields: [gamingSessions.bookingId], references: [bookings.id] }),
  customer: one(customers, { fields: [gamingSessions.customerId], references: [customers.id] }),
  gameType: one(gameTypes, { fields: [gamingSessions.gameTypeId], references: [gameTypes.id] }),
  station: one(stations, { fields: [gamingSessions.stationId], references: [stations.id] }),
  createdBy: one(users, { fields: [gamingSessions.createdById], references: [users.id] }),
  payment: one(payments, { fields: [gamingSessions.id], references: [payments.sessionId] }),
}));

export const paymentsRelations = relations(payments, ({ one, many }) => ({
  tenant: one(tenants, { fields: [payments.tenantId], references: [tenants.id] }),
  booking: one(bookings, { fields: [payments.bookingId], references: [bookings.id] }),
  session: one(gamingSessions, { fields: [payments.sessionId], references: [gamingSessions.id] }),
  customer: one(customers, { fields: [payments.customerId], references: [customers.id] }),
  transactions: many(transactions),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  tenant: one(tenants, { fields: [transactions.tenantId], references: [tenants.id] }),
  payment: one(payments, { fields: [transactions.paymentId], references: [payments.id] }),
  booking: one(bookings, { fields: [transactions.bookingId], references: [bookings.id] }),
  session: one(gamingSessions, { fields: [transactions.sessionId], references: [gamingSessions.id] }),
  customer: one(customers, { fields: [transactions.customerId], references: [customers.id] }),
  gameType: one(gameTypes, { fields: [transactions.gameTypeId], references: [gameTypes.id] }),
  station: one(stations, { fields: [transactions.stationId], references: [stations.id] }),
  staff: one(users, { fields: [transactions.staffId], references: [users.id] }),
}));
