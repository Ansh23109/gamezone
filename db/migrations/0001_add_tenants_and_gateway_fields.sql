-- ============================================================================
-- Multi-tenancy migration: adds `tenants`, scopes all 9 existing tables to a
-- tenant, backfills existing production data onto a fixed "ppp" tenant row,
-- and adds Razorpay reconciliation columns. Hand-edited from the drizzle-kit
-- generated output: tenant_id columns are added NULLABLE, backfilled, THEN
-- set NOT NULL, because the generated straight-to-NOT-NULL version would
-- fail immediately against tables that already have rows. Runs inside one
-- transaction (drizzle-orm's migrator wraps all pending migrations in a
-- single `session.transaction`), so a failure anywhere rolls back everything.
-- ============================================================================

-- 1) Create tenants table.
CREATE TYPE "public"."tenant_status" AS ENUM('ACTIVE', 'SUSPENDED');--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"subdomain" text NOT NULL,
	"display_name" text NOT NULL,
	"primary_color" text DEFAULT '#6366f1' NOT NULL,
	"logo_path" text,
	"status" "tenant_status" DEFAULT 'ACTIVE' NOT NULL,
	"razorpay_key_id" text,
	"razorpay_key_secret_encrypted" text,
	"razorpay_webhook_secret_encrypted" text,
	"razorpay_enabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tenants_slug_unique" UNIQUE("slug"),
	CONSTRAINT "tenants_subdomain_unique" UNIQUE("subdomain")
);
--> statement-breakpoint

-- 2) Seed the "ppp" tenant row for the existing production data (fixed id,
-- pre-generated so it's deterministic/reviewable rather than captured
-- across statements).
INSERT INTO "tenants" ("id", "slug", "subdomain", "display_name", "status")
VALUES ('bc2e31df-ee60-4e50-8f0a-6cf01bc257c7', 'ppp', 'ppp', 'PPP Gaming Center', 'ACTIVE');
--> statement-breakpoint

-- 3) Drop the old global-uniqueness constraints that would otherwise block
-- onboarding a second tenant (e.g. two tenants both having a "PS5" game type).
ALTER TABLE "customers" DROP CONSTRAINT "customers_mobile_unique";--> statement-breakpoint
ALTER TABLE "game_types" DROP CONSTRAINT "game_types_name_unique";--> statement-breakpoint
ALTER TABLE "game_types" DROP CONSTRAINT "game_types_slug_unique";--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "users_email_unique";--> statement-breakpoint

-- 4) Add tenant_id as NULLABLE first (existing rows need a value before we
-- can require one) plus the new non-tenant columns.
ALTER TABLE "bookings" ADD COLUMN "tenant_id" text;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "tenant_id" text;--> statement-breakpoint
ALTER TABLE "game_types" ADD COLUMN "tenant_id" text;--> statement-breakpoint
ALTER TABLE "gaming_sessions" ADD COLUMN "tenant_id" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "tenant_id" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "gateway_payment_link_id" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "gateway_payment_link_url" text;--> statement-breakpoint
ALTER TABLE "pricing_rules" ADD COLUMN "tenant_id" text;--> statement-breakpoint
ALTER TABLE "stations" ADD COLUMN "tenant_id" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "tenant_id" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "gateway_provider" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "gateway_payment_id" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "tenant_id" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "auth_user_id" text;--> statement-breakpoint

-- 5) Backfill: every existing row belongs to the "ppp" tenant.
UPDATE "bookings" SET "tenant_id" = 'bc2e31df-ee60-4e50-8f0a-6cf01bc257c7';--> statement-breakpoint
UPDATE "customers" SET "tenant_id" = 'bc2e31df-ee60-4e50-8f0a-6cf01bc257c7';--> statement-breakpoint
UPDATE "game_types" SET "tenant_id" = 'bc2e31df-ee60-4e50-8f0a-6cf01bc257c7';--> statement-breakpoint
UPDATE "gaming_sessions" SET "tenant_id" = 'bc2e31df-ee60-4e50-8f0a-6cf01bc257c7';--> statement-breakpoint
UPDATE "payments" SET "tenant_id" = 'bc2e31df-ee60-4e50-8f0a-6cf01bc257c7';--> statement-breakpoint
UPDATE "pricing_rules" SET "tenant_id" = 'bc2e31df-ee60-4e50-8f0a-6cf01bc257c7';--> statement-breakpoint
UPDATE "stations" SET "tenant_id" = 'bc2e31df-ee60-4e50-8f0a-6cf01bc257c7';--> statement-breakpoint
UPDATE "transactions" SET "tenant_id" = 'bc2e31df-ee60-4e50-8f0a-6cf01bc257c7';--> statement-breakpoint
UPDATE "users" SET "tenant_id" = 'bc2e31df-ee60-4e50-8f0a-6cf01bc257c7';--> statement-breakpoint

-- 6) Now that every row has a tenant, require it.
ALTER TABLE "bookings" ALTER COLUMN "tenant_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "customers" ALTER COLUMN "tenant_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "game_types" ALTER COLUMN "tenant_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "gaming_sessions" ALTER COLUMN "tenant_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "tenant_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "pricing_rules" ALTER COLUMN "tenant_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "stations" ALTER COLUMN "tenant_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "tenant_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "tenant_id" SET NOT NULL;--> statement-breakpoint

-- 7) Foreign keys to tenants.
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_types" ADD CONSTRAINT "game_types_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gaming_sessions" ADD CONSTRAINT "gaming_sessions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pricing_rules" ADD CONSTRAINT "pricing_rules_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stations" ADD CONSTRAINT "stations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint

-- 8) Indexes, including the new composite per-tenant-uniqueness constraints
-- that replace the dropped global ones from step 3.
CREATE INDEX "bookings_tenant_idx" ON "bookings" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "customers_tenant_idx" ON "customers" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "customers_tenant_mobile_idx" ON "customers" USING btree ("tenant_id","mobile");--> statement-breakpoint
CREATE INDEX "game_types_tenant_idx" ON "game_types" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "game_types_tenant_name_idx" ON "game_types" USING btree ("tenant_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "game_types_tenant_slug_idx" ON "game_types" USING btree ("tenant_id","slug");--> statement-breakpoint
CREATE INDEX "sessions_tenant_idx" ON "gaming_sessions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "payments_tenant_idx" ON "payments" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "pricing_rules_tenant_idx" ON "pricing_rules" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "stations_tenant_idx" ON "stations" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "transactions_tenant_idx" ON "transactions" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "transactions_gateway_payment_id_idx" ON "transactions" USING btree ("gateway_payment_id");--> statement-breakpoint
CREATE INDEX "users_tenant_idx" ON "users" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_tenant_email_idx" ON "users" USING btree ("tenant_id","email");--> statement-breakpoint

-- 9) Supabase Auth linkage. No formal FK to auth.users(id): that column is
-- native `uuid` while this schema uses `text` ids by convention throughout,
-- and Postgres FK constraints require matching types on both sides (not a
-- gap — this is the common, accepted pattern for referencing Supabase's
-- managed auth.users table from app tables; integrity is enforced at the
-- application layer, since this column is only ever written with a UUID
-- string returned directly from Supabase's own Admin API).
ALTER TABLE "users" ADD CONSTRAINT "users_auth_user_id_unique" UNIQUE("auth_user_id");
