-- AlterEnum
-- This migration updates the OperationalStatus enum to match the new schema

-- First, update existing data to use new enum values
UPDATE "Customer" SET "operationalStatus" = 'ACTIVE_WITH_PENDING_PAYMENT' 
WHERE "operationalStatus" = 'ACTIVE_WITH_DEBT';

UPDATE "Customer" SET "operationalStatus" = 'LOST' 
WHERE "operationalStatus" = 'LOST_CUSTOMER';

UPDATE "Customer" SET "operationalStatus" = 'SUSPENDED' 
WHERE "operationalStatus" = 'CANCELLED';

-- Now alter the enum type
ALTER TYPE "OperationalStatus" RENAME TO "OperationalStatus_old";

CREATE TYPE "OperationalStatus" AS ENUM (
  'ACTIVE',
  'ACTIVE_WITH_PENDING_PAYMENT',
  'PENDING_RENEWAL',
  'SUSPENDED',
  'LOST'
);

ALTER TABLE "Customer" 
  ALTER COLUMN "operationalStatus" DROP DEFAULT,
  ALTER COLUMN "operationalStatus" TYPE "OperationalStatus" 
  USING "operationalStatus"::text::"OperationalStatus";

ALTER TABLE "Customer" 
  ALTER COLUMN "operationalStatus" SET DEFAULT 'ACTIVE_WITH_PENDING_PAYMENT';

DROP TYPE "OperationalStatus_old";

