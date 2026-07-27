-- CreateTable
CREATE TABLE "ClinicianSavedView" (
  "id" TEXT NOT NULL,
  "clinicianId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "viewType" TEXT NOT NULL DEFAULT 'PATIENT_WORKLIST',
  "filters" JSONB NOT NULL,
  "columns" JSONB,
  "sort" JSONB,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ClinicianSavedView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CareTask" (
  "id" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "clinicianId" TEXT NOT NULL,
  "organizationId" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "category" TEXT NOT NULL DEFAULT 'GENERAL',
  "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "source" TEXT NOT NULL DEFAULT 'CLINICIAN',
  "dueAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdByUserId" TEXT,
  "assignedToUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CareTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientMessage" (
  "id" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "clinicianId" TEXT NOT NULL,
  "senderUserId" TEXT,
  "body" TEXT NOT NULL,
  "channel" TEXT NOT NULL DEFAULT 'IN_APP',
  "status" TEXT NOT NULL DEFAULT 'SENT',
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PatientMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientReminderRequest" (
  "id" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "clinicianId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "dueAt" TIMESTAMP(3),
  "recurrence" TEXT,
  "status" TEXT NOT NULL DEFAULT 'REQUESTED',
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PatientReminderRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletDocumentReview" (
  "id" TEXT NOT NULL,
  "walletDocumentId" TEXT NOT NULL,
  "clinicianId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "note" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "WalletDocumentReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientCohort" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT,
  "clinicianId" TEXT,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "filters" JSONB,
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PatientCohort_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientCohortMember" (
  "id" TEXT NOT NULL,
  "cohortId" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PatientCohortMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationUserPermission" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'ORG_ADMIN',
  "scopes" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "OrganizationUserPermission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClinicianSavedView_clinicianId_viewType_idx" ON "ClinicianSavedView"("clinicianId", "viewType");

-- CreateIndex
CREATE INDEX "CareTask_patientId_status_dueAt_idx" ON "CareTask"("patientId", "status", "dueAt");

-- CreateIndex
CREATE INDEX "CareTask_clinicianId_status_dueAt_idx" ON "CareTask"("clinicianId", "status", "dueAt");

-- CreateIndex
CREATE INDEX "CareTask_organizationId_status_idx" ON "CareTask"("organizationId", "status");

-- CreateIndex
CREATE INDEX "PatientMessage_patientId_createdAt_idx" ON "PatientMessage"("patientId", "createdAt");

-- CreateIndex
CREATE INDEX "PatientMessage_clinicianId_createdAt_idx" ON "PatientMessage"("clinicianId", "createdAt");

-- CreateIndex
CREATE INDEX "PatientReminderRequest_patientId_status_dueAt_idx" ON "PatientReminderRequest"("patientId", "status", "dueAt");

-- CreateIndex
CREATE INDEX "PatientReminderRequest_clinicianId_status_dueAt_idx" ON "PatientReminderRequest"("clinicianId", "status", "dueAt");

-- CreateIndex
CREATE UNIQUE INDEX "WalletDocumentReview_walletDocumentId_clinicianId_key" ON "WalletDocumentReview"("walletDocumentId", "clinicianId");

-- CreateIndex
CREATE INDEX "WalletDocumentReview_clinicianId_status_idx" ON "WalletDocumentReview"("clinicianId", "status");

-- CreateIndex
CREATE INDEX "PatientCohort_organizationId_idx" ON "PatientCohort"("organizationId");

-- CreateIndex
CREATE INDEX "PatientCohort_clinicianId_idx" ON "PatientCohort"("clinicianId");

-- CreateIndex
CREATE UNIQUE INDEX "PatientCohortMember_cohortId_patientId_key" ON "PatientCohortMember"("cohortId", "patientId");

-- CreateIndex
CREATE INDEX "PatientCohortMember_patientId_idx" ON "PatientCohortMember"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationUserPermission_organizationId_userId_key" ON "OrganizationUserPermission"("organizationId", "userId");

-- CreateIndex
CREATE INDEX "OrganizationUserPermission_userId_idx" ON "OrganizationUserPermission"("userId");

-- AddForeignKey
ALTER TABLE "ClinicianSavedView" ADD CONSTRAINT "ClinicianSavedView_clinicianId_fkey" FOREIGN KEY ("clinicianId") REFERENCES "ClinicianProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareTask" ADD CONSTRAINT "CareTask_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareTask" ADD CONSTRAINT "CareTask_clinicianId_fkey" FOREIGN KEY ("clinicianId") REFERENCES "ClinicianProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareTask" ADD CONSTRAINT "CareTask_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareTask" ADD CONSTRAINT "CareTask_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareTask" ADD CONSTRAINT "CareTask_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientMessage" ADD CONSTRAINT "PatientMessage_clinicianId_fkey" FOREIGN KEY ("clinicianId") REFERENCES "ClinicianProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientMessage" ADD CONSTRAINT "PatientMessage_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientReminderRequest" ADD CONSTRAINT "PatientReminderRequest_clinicianId_fkey" FOREIGN KEY ("clinicianId") REFERENCES "ClinicianProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientReminderRequest" ADD CONSTRAINT "PatientReminderRequest_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletDocumentReview" ADD CONSTRAINT "WalletDocumentReview_clinicianId_fkey" FOREIGN KEY ("clinicianId") REFERENCES "ClinicianProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletDocumentReview" ADD CONSTRAINT "WalletDocumentReview_walletDocumentId_fkey" FOREIGN KEY ("walletDocumentId") REFERENCES "WalletDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientCohort" ADD CONSTRAINT "PatientCohort_clinicianId_fkey" FOREIGN KEY ("clinicianId") REFERENCES "ClinicianProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientCohort" ADD CONSTRAINT "PatientCohort_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientCohort" ADD CONSTRAINT "PatientCohort_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientCohortMember" ADD CONSTRAINT "PatientCohortMember_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "PatientCohort"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientCohortMember" ADD CONSTRAINT "PatientCohortMember_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationUserPermission" ADD CONSTRAINT "OrganizationUserPermission_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationUserPermission" ADD CONSTRAINT "OrganizationUserPermission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
