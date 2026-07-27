-- AlterTable
ALTER TABLE "ImmunisationDetail" ADD COLUMN     "isDueSoon" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isOverdue" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "seriesCompleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "seriesCompletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "ImmunisationDetail_isOverdue_isDueSoon_nextDueDate_idx" ON "ImmunisationDetail"("isOverdue", "isDueSoon", "nextDueDate");
