-- CreateTable
CREATE TABLE "organization_alert_settings" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "email_enabled" BOOLEAN NOT NULL DEFAULT false,
    "email_recipients" TEXT,
    "email_alert_types" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_alert_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organization_alert_settings_organization_id_key" ON "organization_alert_settings"("organization_id");

-- AddForeignKey
ALTER TABLE "organization_alert_settings" ADD CONSTRAINT "organization_alert_settings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
