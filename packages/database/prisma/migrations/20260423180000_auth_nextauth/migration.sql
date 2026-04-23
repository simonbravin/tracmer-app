-- Auth.js: reemplazar identidad externa legada por email/cuentas OAuth; tablas accounts y password_reset_tokens.

ALTER TABLE "users" ADD COLUMN "name" TEXT;
ALTER TABLE "users" ADD COLUMN "email_verified" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "image" TEXT;
ALTER TABLE "users" ADD COLUMN "password_hash" TEXT;

UPDATE "users"
SET "name" = COALESCE("display_name", split_part("email", '@', 1))
WHERE "name" IS NULL;

ALTER TABLE "users" DROP COLUMN "clerk_user_id";

CREATE UNIQUE INDEX "users_email_key" ON "users" ("email");

CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_account_id" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "accounts_provider_provider_account_id_key" ON "accounts" ("provider", "provider_account_id");

CREATE INDEX "accounts_user_id_idx" ON "accounts" ("user_id");

ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "password_reset_tokens_user_id_idx" ON "password_reset_tokens" ("user_id");

ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
