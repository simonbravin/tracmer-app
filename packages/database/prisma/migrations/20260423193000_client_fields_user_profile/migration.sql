-- AlterTable
ALTER TABLE "clients" ADD COLUMN "address" TEXT,
ADD COLUMN "phone" TEXT,
ADD COLUMN "email" TEXT,
ADD COLUMN "website" TEXT,
ADD COLUMN "contact_name" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN "phone" TEXT,
ADD COLUMN "job_title" TEXT;
