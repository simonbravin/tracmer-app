-- CreateEnum
CREATE TYPE "TreasuryLocationKind" AS ENUM ('bank', 'cash', 'electronic_wallet');

-- CreateEnum
CREATE TYPE "GlAccountStatementRole" AS ENUM ('asset', 'liability', 'equity', 'revenue', 'expense', 'memo');

-- CreateEnum
CREATE TYPE "LedgerClassificationSource" AS ENUM ('auto', 'user');

-- CreateEnum
CREATE TYPE "LedgerEntityType" AS ENUM ('collection', 'collection_fee', 'bank_deposit', 'bank_transfer', 'sale', 'treasury_manual_movement');

-- CreateEnum
CREATE TYPE "TreasuryManualMovementDirection" AS ENUM ('inflow', 'outflow');

-- CreateTable
CREATE TABLE "treasury_locations" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "kind" "TreasuryLocationKind" NOT NULL,
    "display_name" TEXT NOT NULL,
    "currency_code" "CurrencyCode" NOT NULL,
    "provider_code" VARCHAR(64),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "treasury_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gl_accounts" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "name" TEXT NOT NULL,
    "statement_role" "GlAccountStatementRole" NOT NULL,
    "parent_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "gl_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_classifications" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "entity_type" "LedgerEntityType" NOT NULL,
    "entity_id" TEXT NOT NULL,
    "gl_account_id" TEXT NOT NULL,
    "source" "LedgerClassificationSource" NOT NULL DEFAULT 'user',
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assigned_by_user_id" TEXT,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "ledger_classifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "treasury_manual_movements" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "treasury_location_id" TEXT NOT NULL,
    "movement_date" DATE NOT NULL,
    "amount" DECIMAL(18,4) NOT NULL,
    "currency_code" "CurrencyCode" NOT NULL,
    "direction" "TreasuryManualMovementDirection" NOT NULL,
    "memo" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by_user_id" TEXT,

    CONSTRAINT "treasury_manual_movements_pkey" PRIMARY KEY ("id")
);

-- AlterTable bank_accounts: add FK column (nullable first)
ALTER TABLE "bank_accounts" ADD COLUMN "treasury_location_id" TEXT;

-- Backfill treasury location per bank account
DO $$
DECLARE
  r RECORD;
  tl_id TEXT;
BEGIN
  FOR r IN SELECT id, organization_id, name, currency_code, bank_name, is_active, deleted_at FROM bank_accounts
  LOOP
    tl_id := replace(gen_random_uuid()::text, '-', '');
    INSERT INTO treasury_locations (
      id, organization_id, kind, display_name, currency_code, provider_code, is_active, created_at, updated_at, deleted_at
    ) VALUES (
      tl_id,
      r.organization_id,
      'bank',
      r.name,
      r.currency_code,
      NULL,
      r.is_active AND r.deleted_at IS NULL,
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP,
      NULL
    );
    UPDATE bank_accounts SET treasury_location_id = tl_id WHERE id = r.id;
  END LOOP;
END $$;

ALTER TABLE "bank_accounts" ALTER COLUMN "treasury_location_id" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "bank_accounts_treasury_location_id_key" ON "bank_accounts"("treasury_location_id");

-- AddForeignKey
ALTER TABLE "treasury_locations" ADD CONSTRAINT "treasury_locations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_treasury_location_id_fkey" FOREIGN KEY ("treasury_location_id") REFERENCES "treasury_locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "gl_accounts" ADD CONSTRAINT "gl_accounts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "gl_accounts" ADD CONSTRAINT "gl_accounts_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "gl_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ledger_classifications" ADD CONSTRAINT "ledger_classifications_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ledger_classifications" ADD CONSTRAINT "ledger_classifications_gl_account_id_fkey" FOREIGN KEY ("gl_account_id") REFERENCES "gl_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ledger_classifications" ADD CONSTRAINT "ledger_classifications_assigned_by_user_id_fkey" FOREIGN KEY ("assigned_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "treasury_manual_movements" ADD CONSTRAINT "treasury_manual_movements_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "treasury_manual_movements" ADD CONSTRAINT "treasury_manual_movements_treasury_location_id_fkey" FOREIGN KEY ("treasury_location_id") REFERENCES "treasury_locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "treasury_manual_movements" ADD CONSTRAINT "treasury_manual_movements_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "treasury_locations_organization_id_deleted_at_idx" ON "treasury_locations"("organization_id", "deleted_at");

CREATE INDEX "treasury_locations_organization_id_kind_idx" ON "treasury_locations"("organization_id", "kind");

CREATE UNIQUE INDEX "gl_accounts_organization_id_code_key" ON "gl_accounts"("organization_id", "code");

CREATE INDEX "gl_accounts_organization_id_deleted_at_idx" ON "gl_accounts"("organization_id", "deleted_at");

CREATE INDEX "ledger_classifications_organization_id_entity_type_entity_id_idx" ON "ledger_classifications"("organization_id", "entity_type", "entity_id");

CREATE INDEX "ledger_classifications_organization_id_deleted_at_idx" ON "ledger_classifications"("organization_id", "deleted_at");

CREATE INDEX "treasury_manual_movements_organization_id_deleted_at_idx" ON "treasury_manual_movements"("organization_id", "deleted_at");

CREATE INDEX "treasury_manual_movements_organization_id_movement_date_idx" ON "treasury_manual_movements"("organization_id", "movement_date");

CREATE INDEX "treasury_manual_movements_treasury_location_id_idx" ON "treasury_manual_movements"("treasury_location_id");

-- Default GL account per organization (clasificación futura)
INSERT INTO "gl_accounts" (
  "id", "organization_id", "code", "name", "statement_role", "parent_id", "is_active", "created_at", "updated_at", "deleted_at"
)
SELECT
  replace(gen_random_uuid()::text, '-', ''),
  o."id",
  '0-UNCLASS',
  'Sin clasificar',
  'memo',
  NULL,
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  NULL
FROM "organizations" o;
