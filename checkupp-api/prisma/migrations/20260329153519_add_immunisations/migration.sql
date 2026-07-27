-- CreateEnum
CREATE TYPE "VaccineType" AS ENUM ('ROUTINE', 'TRAVEL', 'OCCUPATIONAL', 'CATCH_UP', 'BOOSTER');

-- CreateEnum
CREATE TYPE "AdministrationSite" AS ENUM ('LEFT_ARM', 'RIGHT_ARM', 'LEFT_THIGH', 'RIGHT_THIGH', 'ORAL', 'NASAL');

-- AlterEnum
ALTER TYPE "ScreeningDomain" ADD VALUE 'IMMUNISATION';

-- CreateTable
CREATE TABLE "ImmunisationDetail" (
    "screeningRecordId" TEXT NOT NULL,
    "vaccineName" TEXT NOT NULL,
    "vaccineType" "VaccineType" NOT NULL,
    "brand" TEXT,
    "batchNumber" TEXT,
    "doseNumber" INTEGER NOT NULL,
    "totalDoses" INTEGER NOT NULL,
    "administrationSite" "AdministrationSite" NOT NULL,
    "providerName" TEXT,
    "clinic" TEXT,
    "location" TEXT,
    "nextDueDate" TIMESTAMP(3),
    "sideEffectsNone" BOOLEAN NOT NULL DEFAULT true,
    "sideEffectsMild" BOOLEAN NOT NULL DEFAULT false,
    "sideEffectsModerate" BOOLEAN NOT NULL DEFAULT false,
    "sideEffectsSevere" BOOLEAN NOT NULL DEFAULT false,
    "sideEffectsDescription" TEXT,
    "isTravel" BOOLEAN NOT NULL DEFAULT false,
    "travelDestination" TEXT,
    "departureDate" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "ImmunisationDetail_pkey" PRIMARY KEY ("screeningRecordId")
);

-- CreateIndex
CREATE INDEX "ImmunisationDetail_vaccineName_nextDueDate_idx" ON "ImmunisationDetail"("vaccineName", "nextDueDate");

-- AddForeignKey
ALTER TABLE "ImmunisationDetail" ADD CONSTRAINT "ImmunisationDetail_screeningRecordId_fkey" FOREIGN KEY ("screeningRecordId") REFERENCES "ScreeningRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
