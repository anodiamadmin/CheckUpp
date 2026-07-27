-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('PATIENT', 'CLINICIAN', 'ADMIN');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'PREFER_NOT_TO_SAY', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "GenderEligibility" AS ENUM ('ALL', 'MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "ScreeningDomain" AS ENUM ('CANCER', 'HEALTH');

-- CreateEnum
CREATE TYPE "PlanSource" AS ENUM ('SYSTEM', 'USER_OVERRIDE', 'CLINICIAN_OVERRIDE');

-- CreateEnum
CREATE TYPE "ScreeningOutcomeStatus" AS ENUM ('NORMAL', 'ABNORMAL', 'INCONCLUSIVE', 'NOT_DONE', 'PENDING');

-- CreateEnum
CREATE TYPE "RecordSource" AS ENUM ('MOBILE_FORM', 'MOBILE_IMPORT', 'CLINICIAN', 'MIGRATION');

-- CreateEnum
CREATE TYPE "ScreeningValueType" AS ENUM ('NUMBER', 'TEXT', 'BOOLEAN', 'DATE', 'CODED', 'JSON');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ImportSource" AS ENUM ('LOCAL_ASYNCSTORAGE', 'APPWRITE_SNAPSHOT', 'CSV');

-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "FileType" AS ENUM ('FILE', 'IMAGE', 'LINK');

-- CreateEnum
CREATE TYPE "ConsentStatus" AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "CancerType" AS ENUM ('CERVICAL', 'BREAST', 'BOWEL', 'PROSTATE', 'LUNG', 'SKIN', 'OTHER');

-- CreateEnum
CREATE TYPE "CancerResultCategory" AS ENUM ('NEGATIVE', 'POSITIVE', 'ABNORMAL', 'INADEQUATE', 'INDETERMINATE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "firebaseUid" TEXT,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'PATIENT',
    "name" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "phoneNumber" TEXT,
    "gender" "Gender" NOT NULL DEFAULT 'UNKNOWN',
    "dob" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicianProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT,
    "licenseNumber" TEXT,
    "specialty" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClinicianProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientLink" (
    "id" TEXT NOT NULL,
    "clinicianId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "relationshipType" TEXT NOT NULL DEFAULT 'PRIMARY',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unlinkedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentGrant" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "clinicianId" TEXT NOT NULL,
    "scope" JSONB,
    "status" "ConsentStatus" NOT NULL DEFAULT 'ACTIVE',
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsentGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScreeningDefinition" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "domain" "ScreeningDomain" NOT NULL,
    "defaultIntervalMonths" INTEGER,
    "minEligibleAge" INTEGER,
    "maxEligibleAge" INTEGER,
    "genderEligibility" "GenderEligibility" NOT NULL DEFAULT 'ALL',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "guidelineVersion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScreeningDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScreeningPlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "screeningDefinitionId" TEXT NOT NULL,
    "neverScreened" BOOLEAN NOT NULL DEFAULT false,
    "lastScreeningDate" TIMESTAMP(3),
    "dataCalculated" BOOLEAN NOT NULL DEFAULT false,
    "source" "PlanSource" NOT NULL DEFAULT 'SYSTEM',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScreeningPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScreeningDueItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "screeningDefinitionId" TEXT NOT NULL,
    "screeningPlanId" TEXT,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "eligible" BOOLEAN NOT NULL DEFAULT true,
    "recommended" BOOLEAN NOT NULL DEFAULT false,
    "overdue" BOOLEAN NOT NULL DEFAULT false,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "intervalMonths" INTEGER,
    "calculationRunId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScreeningDueItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScreeningRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "screeningDefinitionId" TEXT NOT NULL,
    "screeningDueItemId" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "performedAt" TIMESTAMP(3) NOT NULL,
    "wasNormal" BOOLEAN,
    "outcomeStatus" "ScreeningOutcomeStatus" NOT NULL DEFAULT 'PENDING',
    "resultSummary" TEXT,
    "notes" TEXT,
    "source" "RecordSource" NOT NULL DEFAULT 'MOBILE_FORM',
    "enteredByUserId" TEXT,
    "providerName" TEXT,
    "facilityName" TEXT,
    "legacyPayloadAvailable" BOOLEAN NOT NULL DEFAULT true,
    "structuredData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScreeningRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScreeningMeasurement" (
    "id" TEXT NOT NULL,
    "screeningRecordId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "displayName" TEXT,
    "valueType" "ScreeningValueType" NOT NULL,
    "valueNumber" DECIMAL(12,4),
    "valueText" TEXT,
    "valueBoolean" BOOLEAN,
    "valueDate" TIMESTAMP(3),
    "valueCode" TEXT,
    "valueJson" JSONB,
    "unit" TEXT,
    "referenceLow" DECIMAL(12,4),
    "referenceHigh" DECIMAL(12,4),
    "abnormalFlag" BOOLEAN,
    "interpretation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScreeningMeasurement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScreeningFlag" (
    "id" TEXT NOT NULL,
    "screeningRecordId" TEXT NOT NULL,
    "severity" "Severity" NOT NULL,
    "code" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScreeningFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScreeningAttachment" (
    "id" TEXT NOT NULL,
    "screeningRecordId" TEXT NOT NULL,
    "walletDocumentId" TEXT,
    "objectKey" TEXT,
    "fileName" TEXT,
    "mimeType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScreeningAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScreeningImportBatch" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "source" "ImportSource" NOT NULL,
    "status" "ImportStatus" NOT NULL DEFAULT 'RUNNING',
    "recordsAttempted" INTEGER NOT NULL DEFAULT 0,
    "recordsImported" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScreeningImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CancerScreeningDetail" (
    "screeningRecordId" TEXT NOT NULL,
    "cancerType" "CancerType" NOT NULL,
    "testMethod" TEXT,
    "specimenType" TEXT,
    "specimenCollectedAt" TIMESTAMP(3),
    "labName" TEXT,
    "labReference" TEXT,
    "resultCategory" "CancerResultCategory",
    "followUpRequired" BOOLEAN NOT NULL DEFAULT false,
    "followUpBy" TIMESTAMP(3),
    "recommendation" TEXT,

    CONSTRAINT "CancerScreeningDetail_pkey" PRIMARY KEY ("screeningRecordId")
);

-- CreateTable
CREATE TABLE "CardiovascularDetail" (
    "screeningRecordId" TEXT NOT NULL,
    "systolicBp" INTEGER,
    "diastolicBp" INTEGER,
    "heartRate" INTEGER,
    "ecgResult" TEXT,
    "ecgNotes" TEXT,
    "totalCholesterol" DECIMAL(8,2),
    "ldlCholesterol" DECIMAL(8,2),
    "hdlCholesterol" DECIMAL(8,2),
    "triglycerides" DECIMAL(8,2),

    CONSTRAINT "CardiovascularDetail_pkey" PRIMARY KEY ("screeningRecordId")
);

-- CreateTable
CREATE TABLE "DiabetesDetail" (
    "screeningRecordId" TEXT NOT NULL,
    "fastingGlucose" DECIMAL(8,2),
    "randomGlucose" DECIMAL(8,2),
    "postMealGlucose" DECIMAL(8,2),
    "hba1c" DECIMAL(5,2),
    "ketones" DECIMAL(8,2),
    "systolicBp" INTEGER,
    "diastolicBp" INTEGER,
    "weightKg" DECIMAL(8,2),
    "heightCm" DECIMAL(8,2),
    "bmi" DECIMAL(8,2),
    "notes" TEXT,

    CONSTRAINT "DiabetesDetail_pkey" PRIMARY KEY ("screeningRecordId")
);

-- CreateTable
CREATE TABLE "VisionDetail" (
    "screeningRecordId" TEXT NOT NULL,
    "rightEyeAcuity" TEXT,
    "leftEyeAcuity" TEXT,
    "bothEyesAcuity" TEXT,
    "colorVisionResult" TEXT,
    "colorVisionDetails" TEXT,
    "peripheralVisionResult" TEXT,
    "peripheralVisionDetails" TEXT,
    "rightEyePressure" DECIMAL(8,2),
    "leftEyePressure" DECIMAL(8,2),
    "blurredVision" BOOLEAN NOT NULL DEFAULT false,
    "eyeStrain" BOOLEAN NOT NULL DEFAULT false,
    "headaches" BOOLEAN NOT NULL DEFAULT false,
    "dryEyes" BOOLEAN NOT NULL DEFAULT false,
    "nightVision" BOOLEAN NOT NULL DEFAULT false,
    "doubleVision" BOOLEAN NOT NULL DEFAULT false,
    "glassesOrContacts" TEXT,
    "notes" TEXT,

    CONSTRAINT "VisionDetail_pkey" PRIMARY KEY ("screeningRecordId")
);

-- CreateTable
CREATE TABLE "DentalDetail" (
    "screeningRecordId" TEXT NOT NULL,
    "brushingFrequency" TEXT,
    "flossingFrequency" TEXT,
    "mouthwashUse" BOOLEAN NOT NULL DEFAULT false,
    "cavities" INTEGER,
    "fillings" INTEGER,
    "missingTeeth" INTEGER,
    "crowns" INTEGER,
    "implants" INTEGER,
    "gumBleeding" BOOLEAN NOT NULL DEFAULT false,
    "gumSwelling" BOOLEAN NOT NULL DEFAULT false,
    "gumRecession" BOOLEAN NOT NULL DEFAULT false,
    "gumSensitivity" BOOLEAN NOT NULL DEFAULT false,
    "toothache" BOOLEAN NOT NULL DEFAULT false,
    "jawPain" BOOLEAN NOT NULL DEFAULT false,
    "badBreath" BOOLEAN NOT NULL DEFAULT false,
    "dryMouth" BOOLEAN NOT NULL DEFAULT false,
    "grinding" BOOLEAN NOT NULL DEFAULT false,
    "toothSensitivity" BOOLEAN NOT NULL DEFAULT false,
    "lastCleaning" TIMESTAMP(3),
    "lastXray" TIMESTAMP(3),
    "orthodontics" TEXT,
    "smokingStatus" TEXT,
    "notes" TEXT,

    CONSTRAINT "DentalDetail_pkey" PRIMARY KEY ("screeningRecordId")
);

-- CreateTable
CREATE TABLE "MentalHealthDetail" (
    "screeningRecordId" TEXT NOT NULL,
    "k10Score" INTEGER,
    "k10Level" TEXT,
    "dass21DepressionScore" INTEGER,
    "dass21DepressionLevel" TEXT,
    "dass21AnxietyScore" INTEGER,
    "dass21AnxietyLevel" TEXT,
    "dass21StressScore" INTEGER,
    "dass21StressLevel" TEXT,
    "sleepHours" DECIMAL(5,2),
    "sleepQuality" TEXT,
    "difficultyFalling" BOOLEAN NOT NULL DEFAULT false,
    "frequentWaking" BOOLEAN NOT NULL DEFAULT false,
    "exerciseFrequency" TEXT,
    "socialSupport" TEXT,
    "workStress" TEXT,
    "substanceUse" BOOLEAN NOT NULL DEFAULT false,
    "persistentSadness" BOOLEAN NOT NULL DEFAULT false,
    "lossOfInterest" BOOLEAN NOT NULL DEFAULT false,
    "anxiousFeelings" BOOLEAN NOT NULL DEFAULT false,
    "irritability" BOOLEAN NOT NULL DEFAULT false,
    "concentrationProblems" BOOLEAN NOT NULL DEFAULT false,
    "fatigueOrLowEnergy" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,

    CONSTRAINT "MentalHealthDetail_pkey" PRIMARY KEY ("screeningRecordId")
);

-- CreateTable
CREATE TABLE "PregnancyPlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "conceptionDate" TIMESTAMP(3) NOT NULL,
    "expectedDueDate" TIMESTAMP(3) NOT NULL,
    "estimatedCheckupDates" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PregnancyPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletDocument" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "documentType" TEXT NOT NULL,
    "fileType" "FileType" NOT NULL,
    "objectKey" TEXT,
    "publicUrl" TEXT,
    "externalUrl" TEXT,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "legacyAppwriteStorageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WalletDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeedbackEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "feedback" TEXT NOT NULL,
    "rating" INTEGER,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeedbackEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CancerScreeningSnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "age" INTEGER,
    "gender" "Gender",
    "calculatedScreeningDates" JSONB,
    "testResults" JSONB,
    "lastScreeningDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CancerScreeningSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HealthScreeningSnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "age" INTEGER,
    "gender" "Gender",
    "checkupDates" JSONB,
    "healthResults" JSONB,
    "lastCheckupDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HealthScreeningSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT,
    "status" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegacyAppwriteMap" (
    "id" TEXT NOT NULL,
    "collectionName" TEXT NOT NULL,
    "appwriteDocumentId" TEXT NOT NULL,
    "newRecordId" TEXT NOT NULL,
    "migratedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LegacyAppwriteMap_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_firebaseUid_key" ON "User"("firebaseUid");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "ClinicianProfile_userId_key" ON "ClinicianProfile"("userId");

-- CreateIndex
CREATE INDEX "ClinicianProfile_organizationId_idx" ON "ClinicianProfile"("organizationId");

-- CreateIndex
CREATE INDEX "PatientLink_patientId_isActive_idx" ON "PatientLink"("patientId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "PatientLink_clinicianId_patientId_key" ON "PatientLink"("clinicianId", "patientId");

-- CreateIndex
CREATE INDEX "ConsentGrant_patientId_status_idx" ON "ConsentGrant"("patientId", "status");

-- CreateIndex
CREATE INDEX "ConsentGrant_clinicianId_status_idx" ON "ConsentGrant"("clinicianId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ScreeningDefinition_code_key" ON "ScreeningDefinition"("code");

-- CreateIndex
CREATE INDEX "ScreeningPlan_userId_idx" ON "ScreeningPlan"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ScreeningPlan_userId_screeningDefinitionId_key" ON "ScreeningPlan"("userId", "screeningDefinitionId");

-- CreateIndex
CREATE INDEX "ScreeningDueItem_userId_completed_dueDate_idx" ON "ScreeningDueItem"("userId", "completed", "dueDate");

-- CreateIndex
CREATE INDEX "ScreeningDueItem_screeningDefinitionId_dueDate_idx" ON "ScreeningDueItem"("screeningDefinitionId", "dueDate");

-- CreateIndex
CREATE INDEX "ScreeningRecord_userId_performedAt_idx" ON "ScreeningRecord"("userId", "performedAt");

-- CreateIndex
CREATE INDEX "ScreeningRecord_userId_screeningDefinitionId_performedAt_idx" ON "ScreeningRecord"("userId", "screeningDefinitionId", "performedAt");

-- CreateIndex
CREATE INDEX "ScreeningRecord_source_createdAt_idx" ON "ScreeningRecord"("source", "createdAt");

-- CreateIndex
CREATE INDEX "ScreeningMeasurement_screeningRecordId_code_idx" ON "ScreeningMeasurement"("screeningRecordId", "code");

-- CreateIndex
CREATE INDEX "ScreeningMeasurement_code_valueNumber_idx" ON "ScreeningMeasurement"("code", "valueNumber");

-- CreateIndex
CREATE INDEX "ScreeningMeasurement_code_valueDate_idx" ON "ScreeningMeasurement"("code", "valueDate");

-- CreateIndex
CREATE INDEX "ScreeningFlag_screeningRecordId_severity_idx" ON "ScreeningFlag"("screeningRecordId", "severity");

-- CreateIndex
CREATE INDEX "ScreeningImportBatch_userId_startedAt_idx" ON "ScreeningImportBatch"("userId", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PregnancyPlan_userId_key" ON "PregnancyPlan"("userId");

-- CreateIndex
CREATE INDEX "WalletDocument_userId_createdAt_idx" ON "WalletDocument"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "FeedbackEntry_userId_submittedAt_idx" ON "FeedbackEntry"("userId", "submittedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CancerScreeningSnapshot_userId_key" ON "CancerScreeningSnapshot"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "HealthScreeningSnapshot_userId_key" ON "HealthScreeningSnapshot"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_resourceType_resourceId_idx" ON "AuditLog"("resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "AuditLog_actorUserId_createdAt_idx" ON "AuditLog"("actorUserId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "LegacyAppwriteMap_collectionName_appwriteDocumentId_key" ON "LegacyAppwriteMap"("collectionName", "appwriteDocumentId");

-- AddForeignKey
ALTER TABLE "ClinicianProfile" ADD CONSTRAINT "ClinicianProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicianProfile" ADD CONSTRAINT "ClinicianProfile_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientLink" ADD CONSTRAINT "PatientLink_clinicianId_fkey" FOREIGN KEY ("clinicianId") REFERENCES "ClinicianProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientLink" ADD CONSTRAINT "PatientLink_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentGrant" ADD CONSTRAINT "ConsentGrant_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentGrant" ADD CONSTRAINT "ConsentGrant_clinicianId_fkey" FOREIGN KEY ("clinicianId") REFERENCES "ClinicianProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScreeningPlan" ADD CONSTRAINT "ScreeningPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScreeningPlan" ADD CONSTRAINT "ScreeningPlan_screeningDefinitionId_fkey" FOREIGN KEY ("screeningDefinitionId") REFERENCES "ScreeningDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScreeningDueItem" ADD CONSTRAINT "ScreeningDueItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScreeningDueItem" ADD CONSTRAINT "ScreeningDueItem_screeningDefinitionId_fkey" FOREIGN KEY ("screeningDefinitionId") REFERENCES "ScreeningDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScreeningDueItem" ADD CONSTRAINT "ScreeningDueItem_screeningPlanId_fkey" FOREIGN KEY ("screeningPlanId") REFERENCES "ScreeningPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScreeningRecord" ADD CONSTRAINT "ScreeningRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScreeningRecord" ADD CONSTRAINT "ScreeningRecord_screeningDefinitionId_fkey" FOREIGN KEY ("screeningDefinitionId") REFERENCES "ScreeningDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScreeningRecord" ADD CONSTRAINT "ScreeningRecord_screeningDueItemId_fkey" FOREIGN KEY ("screeningDueItemId") REFERENCES "ScreeningDueItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScreeningRecord" ADD CONSTRAINT "ScreeningRecord_enteredByUserId_fkey" FOREIGN KEY ("enteredByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScreeningMeasurement" ADD CONSTRAINT "ScreeningMeasurement_screeningRecordId_fkey" FOREIGN KEY ("screeningRecordId") REFERENCES "ScreeningRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScreeningFlag" ADD CONSTRAINT "ScreeningFlag_screeningRecordId_fkey" FOREIGN KEY ("screeningRecordId") REFERENCES "ScreeningRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScreeningAttachment" ADD CONSTRAINT "ScreeningAttachment_screeningRecordId_fkey" FOREIGN KEY ("screeningRecordId") REFERENCES "ScreeningRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScreeningAttachment" ADD CONSTRAINT "ScreeningAttachment_walletDocumentId_fkey" FOREIGN KEY ("walletDocumentId") REFERENCES "WalletDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScreeningImportBatch" ADD CONSTRAINT "ScreeningImportBatch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CancerScreeningDetail" ADD CONSTRAINT "CancerScreeningDetail_screeningRecordId_fkey" FOREIGN KEY ("screeningRecordId") REFERENCES "ScreeningRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardiovascularDetail" ADD CONSTRAINT "CardiovascularDetail_screeningRecordId_fkey" FOREIGN KEY ("screeningRecordId") REFERENCES "ScreeningRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiabetesDetail" ADD CONSTRAINT "DiabetesDetail_screeningRecordId_fkey" FOREIGN KEY ("screeningRecordId") REFERENCES "ScreeningRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisionDetail" ADD CONSTRAINT "VisionDetail_screeningRecordId_fkey" FOREIGN KEY ("screeningRecordId") REFERENCES "ScreeningRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DentalDetail" ADD CONSTRAINT "DentalDetail_screeningRecordId_fkey" FOREIGN KEY ("screeningRecordId") REFERENCES "ScreeningRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentalHealthDetail" ADD CONSTRAINT "MentalHealthDetail_screeningRecordId_fkey" FOREIGN KEY ("screeningRecordId") REFERENCES "ScreeningRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PregnancyPlan" ADD CONSTRAINT "PregnancyPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletDocument" ADD CONSTRAINT "WalletDocument_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedbackEntry" ADD CONSTRAINT "FeedbackEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CancerScreeningSnapshot" ADD CONSTRAINT "CancerScreeningSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthScreeningSnapshot" ADD CONSTRAINT "HealthScreeningSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

