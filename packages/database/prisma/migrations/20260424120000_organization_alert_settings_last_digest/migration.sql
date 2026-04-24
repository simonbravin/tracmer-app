-- Resumen de alertas por email: un envío por día (UTC) como máximo, ver `last_alert_email_digest_at`
ALTER TABLE "organization_alert_settings" ADD COLUMN "last_alert_email_digest_at" TIMESTAMP(3);
