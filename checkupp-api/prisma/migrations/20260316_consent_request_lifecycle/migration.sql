-- Rebuild consent status enum to support request lifecycle in a transaction-safe way.
CREATE TYPE "ConsentStatus_new" AS ENUM (
  'REQUESTED',
  'ACTIVE',
  'DECLINED',
  'REVOKED',
  'EXPIRED'
);

ALTER TABLE "ConsentGrant"
  ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "ConsentGrant"
  ALTER COLUMN "status" TYPE "ConsentStatus_new"
  USING ("status"::text::"ConsentStatus_new");

ALTER TYPE "ConsentStatus" RENAME TO "ConsentStatus_old";
ALTER TYPE "ConsentStatus_new" RENAME TO "ConsentStatus";
DROP TYPE "ConsentStatus_old";

-- Extend consent grant model for request/response workflow
ALTER TABLE "ConsentGrant"
  ADD COLUMN "requestedScope" JSONB,
  ADD COLUMN "requestMessage" TEXT,
  ADD COLUMN "responseReason" TEXT,
  ADD COLUMN "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "respondedAt" TIMESTAMP(3);

ALTER TABLE "ConsentGrant"
  ALTER COLUMN "status" SET DEFAULT 'REQUESTED',
  ALTER COLUMN "grantedAt" DROP DEFAULT,
  ALTER COLUMN "grantedAt" DROP NOT NULL;

-- Backfill request timestamps for legacy consent rows
UPDATE "ConsentGrant"
SET "requestedAt" = COALESCE("grantedAt", "createdAt");
