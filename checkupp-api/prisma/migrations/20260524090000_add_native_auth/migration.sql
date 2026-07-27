-- CreateEnum
CREATE TYPE "AuthVerificationCodeType" AS ENUM ('REGISTER', 'RESET');

-- AlterTable
ALTER TABLE "User"
ADD COLUMN "passwordHash" TEXT,
ADD COLUMN "emailVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "lastLoginAt" TIMESTAMP(3);

-- Existing Firebase-created accounts already proved email ownership.
UPDATE "User"
SET "emailVerified" = true
WHERE "firebaseUid" IS NOT NULL;

-- CreateTable
CREATE TABLE "AuthSession" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "accessTokenHash" TEXT NOT NULL,
  "refreshTokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "refreshExpiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthVerificationCode" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "contact" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "type" "AuthVerificationCodeType" NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AuthVerificationCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AuthSession_accessTokenHash_key" ON "AuthSession"("accessTokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "AuthSession_refreshTokenHash_key" ON "AuthSession"("refreshTokenHash");

-- CreateIndex
CREATE INDEX "AuthSession_userId_revokedAt_idx" ON "AuthSession"("userId", "revokedAt");

-- CreateIndex
CREATE INDEX "AuthSession_expiresAt_idx" ON "AuthSession"("expiresAt");

-- CreateIndex
CREATE INDEX "AuthSession_refreshExpiresAt_idx" ON "AuthSession"("refreshExpiresAt");

-- CreateIndex
CREATE INDEX "AuthVerificationCode_contact_type_expiresAt_idx" ON "AuthVerificationCode"("contact", "type", "expiresAt");

-- CreateIndex
CREATE INDEX "AuthVerificationCode_userId_type_idx" ON "AuthVerificationCode"("userId", "type");

-- AddForeignKey
ALTER TABLE "AuthSession" ADD CONSTRAINT "AuthSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthVerificationCode" ADD CONSTRAINT "AuthVerificationCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
