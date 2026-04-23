-- CreateEnum
CREATE TYPE "CurrencyCode" AS ENUM ('ARS', 'USD');

-- CreateEnum
CREATE TYPE "SaleStatus" AS ENUM ('draft', 'issued', 'partially_collected', 'collected', 'overdue', 'cancelled');

-- CreateEnum
CREATE TYPE "CollectionStatus" AS ENUM ('valid', 'voided');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('active', 'invited', 'suspended');

-- CreateEnum
CREATE TYPE "ReconciliationStatus" AS ENUM ('draft', 'closed', 'voided');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('open', 'acknowledged', 'closed');

-- CreateEnum
CREATE TYPE "ReportRunStatus" AS ENUM ('pending', 'running', 'success', 'failed');

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "legal_name" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'America/Argentina/Buenos_Aires',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "clerk_user_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "display_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memberships" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "status" "MembershipStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_modules" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,

    CONSTRAINT "app_modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permission_definitions" (
    "id" TEXT NOT NULL,
    "module_id" TEXT NOT NULL,
    "action_code" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permission_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_role_enabled_modules" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "module_id" TEXT NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_role_enabled_modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_role_permissions" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "permission_definition_id" TEXT NOT NULL,
    "is_allowed" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "legal_name" TEXT NOT NULL,
    "tax_id" TEXT,
    "display_name" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by_user_id" TEXT,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_contacts" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "role_label" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "client_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "client_id" TEXT,
    "status" "SaleStatus" NOT NULL DEFAULT 'draft',
    "invoice_date" DATE NOT NULL,
    "credit_days" INTEGER NOT NULL DEFAULT 0,
    "currency_code" "CurrencyCode" NOT NULL,
    "total_amount" DECIMAL(18,4) NOT NULL,
    "fx_rate_ars_per_unit_usd_at_issue" DECIMAL(18,8),
    "amount_ars_equivalent_at_issue" DECIMAL(18,4),
    "invoice_number" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by_user_id" TEXT,
    "updated_by_user_id" TEXT,

    CONSTRAINT "sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_lines" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "sale_id" TEXT NOT NULL,
    "line_number" INTEGER NOT NULL,
    "description" TEXT,
    "quantity" DECIMAL(18,4) NOT NULL DEFAULT 1,
    "unit_amount" DECIMAL(18,4) NOT NULL,
    "line_total_amount" DECIMAL(18,4) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "sale_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collections" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "gross_amount" DECIMAL(18,4) NOT NULL,
    "currency_code" "CurrencyCode" NOT NULL,
    "collection_date" DATE NOT NULL,
    "payment_method_code" TEXT,
    "status" "CollectionStatus" NOT NULL DEFAULT 'valid',
    "voided_at" TIMESTAMP(3),
    "void_reason" TEXT,
    "notes" TEXT,
    "fx_rate_ars_per_unit_usd_at_collection" DECIMAL(18,8),
    "amount_ars_equivalent" DECIMAL(18,4),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by_user_id" TEXT,

    CONSTRAINT "collections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collection_allocations" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "collection_id" TEXT NOT NULL,
    "sale_id" TEXT NOT NULL,
    "amount_in_collection_currency" DECIMAL(18,4) NOT NULL,
    "fx_rate_to_sale_currency" DECIMAL(18,8) NOT NULL,
    "amount_in_sale_currency" DECIMAL(18,4) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "collection_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collection_fees" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "collection_id" TEXT NOT NULL,
    "amount" DECIMAL(18,4) NOT NULL,
    "currency_code" "CurrencyCode" NOT NULL,
    "fx_rate_to_collection_currency" DECIMAL(18,8) NOT NULL,
    "description" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "collection_fees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_accounts" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bank_name" TEXT NOT NULL,
    "currency_code" "CurrencyCode" NOT NULL,
    "account_identifier_masked" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "bank_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_deposits" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "bank_account_id" TEXT NOT NULL,
    "deposit_date" DATE NOT NULL,
    "amount" DECIMAL(18,4) NOT NULL,
    "currency_code" "CurrencyCode" NOT NULL,
    "reference" TEXT,
    "fx_rate_ars_per_unit_usd_at_deposit" DECIMAL(18,8),
    "amount_ars_equivalent" DECIMAL(18,4),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by_user_id" TEXT,

    CONSTRAINT "bank_deposits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_transfers" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "from_bank_account_id" TEXT NOT NULL,
    "to_bank_account_id" TEXT NOT NULL,
    "transfer_date" DATE NOT NULL,
    "amount" DECIMAL(18,4) NOT NULL,
    "currency_code" "CurrencyCode" NOT NULL,
    "fee_amount" DECIMAL(18,4),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by_user_id" TEXT,

    CONSTRAINT "bank_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reconciliations" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "status" "ReconciliationStatus" NOT NULL DEFAULT 'draft',
    "closed_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by_user_id" TEXT,
    "closed_by_user_id" TEXT,

    CONSTRAINT "reconciliations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reconciliation_lines" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "reconciliation_id" TEXT NOT NULL,
    "collection_id" TEXT NOT NULL,
    "bank_deposit_id" TEXT NOT NULL,
    "amount_applied_from_collection" DECIMAL(18,4) NOT NULL,
    "amount_applied_to_deposit" DECIMAL(18,4) NOT NULL,
    "fx_rate_reconciliation" DECIMAL(18,8),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "reconciliation_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reconciliation_discrepancies" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "reconciliation_id" TEXT NOT NULL,
    "reconciliation_line_id" TEXT,
    "category_code" TEXT NOT NULL,
    "amount" DECIMAL(18,4) NOT NULL,
    "currency_code" "CurrencyCode" NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reconciliation_discrepancies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerts" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "status" "AlertStatus" NOT NULL DEFAULT 'open',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledged_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),
    "payload" JSONB,

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT,
    "actor_user_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payload" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "files" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "original_filename" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" BIGINT NOT NULL,
    "sha256" TEXT,
    "linked_entity_type" TEXT NOT NULL,
    "linked_entity_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "uploaded_by_user_id" TEXT,

    CONSTRAINT "files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_definitions" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "report_type" TEXT NOT NULL,
    "required_permission_definition_id" TEXT,
    "default_parameters" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by_user_id" TEXT,

    CONSTRAINT "report_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_schedules" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "report_definition_id" TEXT NOT NULL,
    "cron_expression" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "parameters_override" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by_user_id" TEXT,

    CONSTRAINT "report_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_recipients" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "report_schedule_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "report_recipients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_runs" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "report_definition_id" TEXT NOT NULL,
    "report_schedule_id" TEXT,
    "status" "ReportRunStatus" NOT NULL DEFAULT 'pending',
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),
    "error_message" TEXT,
    "output_file_id" TEXT,
    "triggered_by_user_id" TEXT,
    "idempotency_key" TEXT,

    CONSTRAINT "report_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_clerk_user_id_key" ON "users"("clerk_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "roles_code_key" ON "roles"("code");

-- CreateIndex
CREATE INDEX "memberships_organization_id_user_id_idx" ON "memberships"("organization_id", "user_id");

-- CreateIndex
CREATE INDEX "memberships_organization_id_deleted_at_idx" ON "memberships"("organization_id", "deleted_at");

-- CreateIndex
CREATE INDEX "memberships_organization_id_idx" ON "memberships"("organization_id");

-- CreateIndex
CREATE INDEX "memberships_user_id_idx" ON "memberships"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "app_modules_code_key" ON "app_modules"("code");

-- CreateIndex
CREATE INDEX "permission_definitions_module_id_idx" ON "permission_definitions"("module_id");

-- CreateIndex
CREATE UNIQUE INDEX "permission_definitions_module_id_action_code_key" ON "permission_definitions"("module_id", "action_code");

-- CreateIndex
CREATE INDEX "organization_role_enabled_modules_organization_id_idx" ON "organization_role_enabled_modules"("organization_id");

-- CreateIndex
CREATE INDEX "organization_role_enabled_modules_role_id_module_id_idx" ON "organization_role_enabled_modules"("role_id", "module_id");

-- CreateIndex
CREATE UNIQUE INDEX "organization_role_enabled_modules_organization_id_role_id_m_key" ON "organization_role_enabled_modules"("organization_id", "role_id", "module_id");

-- CreateIndex
CREATE INDEX "organization_role_permissions_organization_id_idx" ON "organization_role_permissions"("organization_id");

-- CreateIndex
CREATE INDEX "organization_role_permissions_role_id_permission_definition_idx" ON "organization_role_permissions"("role_id", "permission_definition_id");

-- CreateIndex
CREATE UNIQUE INDEX "organization_role_permissions_organization_id_role_id_permi_key" ON "organization_role_permissions"("organization_id", "role_id", "permission_definition_id");

-- CreateIndex
CREATE INDEX "clients_organization_id_deleted_at_idx" ON "clients"("organization_id", "deleted_at");

-- CreateIndex
CREATE INDEX "clients_organization_id_tax_id_idx" ON "clients"("organization_id", "tax_id");

-- CreateIndex
CREATE INDEX "client_contacts_organization_id_deleted_at_idx" ON "client_contacts"("organization_id", "deleted_at");

-- CreateIndex
CREATE INDEX "client_contacts_client_id_idx" ON "client_contacts"("client_id");

-- CreateIndex
CREATE INDEX "sales_organization_id_deleted_at_idx" ON "sales"("organization_id", "deleted_at");

-- CreateIndex
CREATE INDEX "sales_organization_id_status_idx" ON "sales"("organization_id", "status");

-- CreateIndex
CREATE INDEX "sales_organization_id_invoice_date_idx" ON "sales"("organization_id", "invoice_date");

-- CreateIndex
CREATE INDEX "sales_client_id_idx" ON "sales"("client_id");

-- CreateIndex
CREATE INDEX "sale_lines_organization_id_deleted_at_idx" ON "sale_lines"("organization_id", "deleted_at");

-- CreateIndex
CREATE INDEX "sale_lines_sale_id_line_number_idx" ON "sale_lines"("sale_id", "line_number");

-- CreateIndex
CREATE INDEX "sale_lines_sale_id_idx" ON "sale_lines"("sale_id");

-- CreateIndex
CREATE INDEX "collections_organization_id_deleted_at_idx" ON "collections"("organization_id", "deleted_at");

-- CreateIndex
CREATE INDEX "collections_organization_id_collection_date_idx" ON "collections"("organization_id", "collection_date");

-- CreateIndex
CREATE INDEX "collections_organization_id_status_idx" ON "collections"("organization_id", "status");

-- CreateIndex
CREATE INDEX "collection_allocations_organization_id_deleted_at_idx" ON "collection_allocations"("organization_id", "deleted_at");

-- CreateIndex
CREATE INDEX "collection_allocations_organization_id_collection_id_idx" ON "collection_allocations"("organization_id", "collection_id");

-- CreateIndex
CREATE INDEX "collection_allocations_collection_id_idx" ON "collection_allocations"("collection_id");

-- CreateIndex
CREATE INDEX "collection_allocations_sale_id_idx" ON "collection_allocations"("sale_id");

-- CreateIndex
CREATE INDEX "collection_fees_organization_id_deleted_at_idx" ON "collection_fees"("organization_id", "deleted_at");

-- CreateIndex
CREATE INDEX "collection_fees_collection_id_idx" ON "collection_fees"("collection_id");

-- CreateIndex
CREATE INDEX "bank_accounts_organization_id_deleted_at_idx" ON "bank_accounts"("organization_id", "deleted_at");

-- CreateIndex
CREATE INDEX "bank_deposits_organization_id_deleted_at_idx" ON "bank_deposits"("organization_id", "deleted_at");

-- CreateIndex
CREATE INDEX "bank_deposits_organization_id_deposit_date_idx" ON "bank_deposits"("organization_id", "deposit_date");

-- CreateIndex
CREATE INDEX "bank_deposits_bank_account_id_idx" ON "bank_deposits"("bank_account_id");

-- CreateIndex
CREATE INDEX "bank_transfers_organization_id_deleted_at_idx" ON "bank_transfers"("organization_id", "deleted_at");

-- CreateIndex
CREATE INDEX "bank_transfers_organization_id_transfer_date_idx" ON "bank_transfers"("organization_id", "transfer_date");

-- CreateIndex
CREATE INDEX "bank_transfers_from_bank_account_id_idx" ON "bank_transfers"("from_bank_account_id");

-- CreateIndex
CREATE INDEX "bank_transfers_to_bank_account_id_idx" ON "bank_transfers"("to_bank_account_id");

-- CreateIndex
CREATE INDEX "reconciliations_organization_id_deleted_at_idx" ON "reconciliations"("organization_id", "deleted_at");

-- CreateIndex
CREATE INDEX "reconciliations_organization_id_status_idx" ON "reconciliations"("organization_id", "status");

-- CreateIndex
CREATE INDEX "reconciliation_lines_organization_id_idx" ON "reconciliation_lines"("organization_id");

-- CreateIndex
CREATE INDEX "reconciliation_lines_reconciliation_id_idx" ON "reconciliation_lines"("reconciliation_id");

-- CreateIndex
CREATE INDEX "reconciliation_lines_collection_id_idx" ON "reconciliation_lines"("collection_id");

-- CreateIndex
CREATE INDEX "reconciliation_lines_bank_deposit_id_idx" ON "reconciliation_lines"("bank_deposit_id");

-- CreateIndex
CREATE INDEX "reconciliation_discrepancies_organization_id_idx" ON "reconciliation_discrepancies"("organization_id");

-- CreateIndex
CREATE INDEX "reconciliation_discrepancies_reconciliation_id_idx" ON "reconciliation_discrepancies"("reconciliation_id");

-- CreateIndex
CREATE INDEX "alerts_organization_id_status_idx" ON "alerts"("organization_id", "status");

-- CreateIndex
CREATE INDEX "alerts_organization_id_created_at_idx" ON "alerts"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "alerts_entity_type_entity_id_idx" ON "alerts"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_organization_id_occurred_at_idx" ON "audit_logs"("organization_id", "occurred_at");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_occurred_at_idx" ON "audit_logs"("entity_type", "entity_id", "occurred_at");

-- CreateIndex
CREATE INDEX "audit_logs_actor_user_id_idx" ON "audit_logs"("actor_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "files_storage_key_key" ON "files"("storage_key");

-- CreateIndex
CREATE INDEX "files_organization_id_deleted_at_idx" ON "files"("organization_id", "deleted_at");

-- CreateIndex
CREATE INDEX "files_linked_entity_type_linked_entity_id_idx" ON "files"("linked_entity_type", "linked_entity_id");

-- CreateIndex
CREATE INDEX "report_definitions_organization_id_deleted_at_idx" ON "report_definitions"("organization_id", "deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "report_definitions_organization_id_code_key" ON "report_definitions"("organization_id", "code");

-- CreateIndex
CREATE INDEX "report_schedules_organization_id_deleted_at_idx" ON "report_schedules"("organization_id", "deleted_at");

-- CreateIndex
CREATE INDEX "report_schedules_report_definition_id_idx" ON "report_schedules"("report_definition_id");

-- CreateIndex
CREATE INDEX "report_recipients_organization_id_deleted_at_idx" ON "report_recipients"("organization_id", "deleted_at");

-- CreateIndex
CREATE INDEX "report_recipients_report_schedule_id_idx" ON "report_recipients"("report_schedule_id");

-- CreateIndex
CREATE INDEX "report_runs_organization_id_status_idx" ON "report_runs"("organization_id", "status");

-- CreateIndex
CREATE INDEX "report_runs_report_definition_id_idx" ON "report_runs"("report_definition_id");

-- CreateIndex
CREATE INDEX "report_runs_report_schedule_id_idx" ON "report_runs"("report_schedule_id");

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permission_definitions" ADD CONSTRAINT "permission_definitions_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "app_modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_role_enabled_modules" ADD CONSTRAINT "organization_role_enabled_modules_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_role_enabled_modules" ADD CONSTRAINT "organization_role_enabled_modules_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_role_enabled_modules" ADD CONSTRAINT "organization_role_enabled_modules_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "app_modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_role_permissions" ADD CONSTRAINT "organization_role_permissions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_role_permissions" ADD CONSTRAINT "organization_role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_role_permissions" ADD CONSTRAINT "organization_role_permissions_permission_definition_id_fkey" FOREIGN KEY ("permission_definition_id") REFERENCES "permission_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_contacts" ADD CONSTRAINT "client_contacts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_contacts" ADD CONSTRAINT "client_contacts_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_updated_by_user_id_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_lines" ADD CONSTRAINT "sale_lines_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_lines" ADD CONSTRAINT "sale_lines_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collections" ADD CONSTRAINT "collections_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collections" ADD CONSTRAINT "collections_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_allocations" ADD CONSTRAINT "collection_allocations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_allocations" ADD CONSTRAINT "collection_allocations_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_allocations" ADD CONSTRAINT "collection_allocations_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_fees" ADD CONSTRAINT "collection_fees_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_fees" ADD CONSTRAINT "collection_fees_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_deposits" ADD CONSTRAINT "bank_deposits_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_deposits" ADD CONSTRAINT "bank_deposits_bank_account_id_fkey" FOREIGN KEY ("bank_account_id") REFERENCES "bank_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_deposits" ADD CONSTRAINT "bank_deposits_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_transfers" ADD CONSTRAINT "bank_transfers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_transfers" ADD CONSTRAINT "bank_transfers_from_bank_account_id_fkey" FOREIGN KEY ("from_bank_account_id") REFERENCES "bank_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_transfers" ADD CONSTRAINT "bank_transfers_to_bank_account_id_fkey" FOREIGN KEY ("to_bank_account_id") REFERENCES "bank_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_transfers" ADD CONSTRAINT "bank_transfers_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reconciliations" ADD CONSTRAINT "reconciliations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reconciliations" ADD CONSTRAINT "reconciliations_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reconciliations" ADD CONSTRAINT "reconciliations_closed_by_user_id_fkey" FOREIGN KEY ("closed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reconciliation_lines" ADD CONSTRAINT "reconciliation_lines_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reconciliation_lines" ADD CONSTRAINT "reconciliation_lines_reconciliation_id_fkey" FOREIGN KEY ("reconciliation_id") REFERENCES "reconciliations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reconciliation_lines" ADD CONSTRAINT "reconciliation_lines_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "collections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reconciliation_lines" ADD CONSTRAINT "reconciliation_lines_bank_deposit_id_fkey" FOREIGN KEY ("bank_deposit_id") REFERENCES "bank_deposits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reconciliation_discrepancies" ADD CONSTRAINT "reconciliation_discrepancies_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reconciliation_discrepancies" ADD CONSTRAINT "reconciliation_discrepancies_reconciliation_id_fkey" FOREIGN KEY ("reconciliation_id") REFERENCES "reconciliations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reconciliation_discrepancies" ADD CONSTRAINT "reconciliation_discrepancies_reconciliation_line_id_fkey" FOREIGN KEY ("reconciliation_line_id") REFERENCES "reconciliation_lines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_uploaded_by_user_id_fkey" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_definitions" ADD CONSTRAINT "report_definitions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_definitions" ADD CONSTRAINT "report_definitions_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_definitions" ADD CONSTRAINT "report_definitions_required_permission_definition_id_fkey" FOREIGN KEY ("required_permission_definition_id") REFERENCES "permission_definitions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_schedules" ADD CONSTRAINT "report_schedules_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_schedules" ADD CONSTRAINT "report_schedules_report_definition_id_fkey" FOREIGN KEY ("report_definition_id") REFERENCES "report_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_schedules" ADD CONSTRAINT "report_schedules_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_recipients" ADD CONSTRAINT "report_recipients_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_recipients" ADD CONSTRAINT "report_recipients_report_schedule_id_fkey" FOREIGN KEY ("report_schedule_id") REFERENCES "report_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_runs" ADD CONSTRAINT "report_runs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_runs" ADD CONSTRAINT "report_runs_report_definition_id_fkey" FOREIGN KEY ("report_definition_id") REFERENCES "report_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_runs" ADD CONSTRAINT "report_runs_report_schedule_id_fkey" FOREIGN KEY ("report_schedule_id") REFERENCES "report_schedules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_runs" ADD CONSTRAINT "report_runs_output_file_id_fkey" FOREIGN KEY ("output_file_id") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_runs" ADD CONSTRAINT "report_runs_triggered_by_user_id_fkey" FOREIGN KEY ("triggered_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- Hardening fuera de Prisma (ERD + comentarios al pie de `schema.prisma`)
-- Añadido manualmente: índices únicos parciales, CHECK, trigger owner.

-- 1) Membresía: un par (org, user) mientras el registro esté activo (sin soft-delete).
--    Sustituye al @@unique estricto de Prisma, permitiendo re‑invite.
CREATE UNIQUE INDEX "memberships_one_active_user_per_org"
  ON "memberships" ("organization_id", "user_id")
  WHERE "deleted_at" IS NULL;

-- 2) Client: tax_id no nulo y fila activa — sin duplicar (org, CUIT).
CREATE UNIQUE INDEX "clients_org_tax_id_active"
  ON "clients" ("organization_id", "tax_id")
  WHERE "tax_id" IS NOT NULL AND "deleted_at" IS NULL;

-- 3) Recipients: sin duplicar email por schedule en filas no borradas.
CREATE UNIQUE INDEX "report_recipients_active_schedule_email"
  ON "report_recipients" ("report_schedule_id", "email")
  WHERE "deleted_at" IS NULL;

-- 4) Líneas de venta: nº de línea por venta, solo filas no borradas lógicamente.
CREATE UNIQUE INDEX "sale_lines_active_line_number"
  ON "sale_lines" ("sale_id", "line_number")
  WHERE "deleted_at" IS NULL;

-- 5) Idempotencia de report runs (misma org + clave).
CREATE UNIQUE INDEX "report_runs_active_idempotency"
  ON "report_runs" ("organization_id", "idempotency_key")
  WHERE "idempotency_key" IS NOT NULL;

-- 6) Transferencia con cuentas distintas (ERD: from ≠ to).
ALTER TABLE "bank_transfers" ADD CONSTRAINT "bank_transfers_different_accounts"
  CHECK ("from_bank_account_id" <> "to_bank_account_id");

-- 7) Días de crédito (BR: ≥ 0) — mínimo explícito en capa de datos.
ALTER TABLE "sales" ADD CONSTRAINT "sales_credit_days_nonnegative"
  CHECK ("credit_days" >= 0);

-- 8) A lo sumo un **owner** activo por `organization` (misma noción: deleted_at, status=active, rol owner).
--    `roles` existe y `code` es estático; se valida vía join.
CREATE OR REPLACE FUNCTION membership_enforce_single_active_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $fn$
DECLARE
  conflict boolean;
BEGIN
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE')
     AND NEW."deleted_at" IS NULL
     AND NEW."status" = 'active' THEN
    IF EXISTS (SELECT 1 FROM "roles" r WHERE r."id" = NEW."role_id" AND r."code" = 'owner') THEN
      SELECT EXISTS (
        SELECT 1
        FROM "memberships" m
        INNER JOIN "roles" r ON r."id" = m."role_id" AND r."code" = 'owner'
        WHERE m."organization_id" = NEW."organization_id"
          AND m."deleted_at" IS NULL
          AND m."status" = 'active'
          AND m."id" IS DISTINCT FROM NEW."id"
      ) INTO conflict;
      IF conflict THEN
        RAISE EXCEPTION 'membership: a lo sumo un owner activo por organization_id';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$fn$;

CREATE TRIGGER "trg_membership_enforce_one_active_owner"
  BEFORE INSERT OR UPDATE OF "organization_id", "user_id", "role_id", "status", "deleted_at" ON "memberships"
  FOR EACH ROW
  EXECUTE PROCEDURE membership_enforce_single_active_owner();
