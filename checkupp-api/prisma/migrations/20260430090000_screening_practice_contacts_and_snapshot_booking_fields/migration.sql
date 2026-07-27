-- Create the practice contact table directly on clean databases.
CREATE TABLE IF NOT EXISTS "ScreeningPracticeContact" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "screeningName" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "hotdocUrl" TEXT,
    "practicePhone" TEXT,
    "practiceEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScreeningPracticeContact_pkey" PRIMARY KEY ("id")
);

-- Ensure the foreign key exists if the table was created outside migrations.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ScreeningPracticeContact_userId_fkey'
  ) THEN
    ALTER TABLE "ScreeningPracticeContact"
    ADD CONSTRAINT "ScreeningPracticeContact_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Bring older drifted versions of the table up to the final shape.
ALTER TABLE "ScreeningPracticeContact"
ADD COLUMN IF NOT EXISTS "screeningName" TEXT,
ADD COLUMN IF NOT EXISTS "isDefault" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "hotdocUrl" TEXT,
ADD COLUMN IF NOT EXISTS "practicePhone" TEXT,
ADD COLUMN IF NOT EXISTS "practiceEmail" TEXT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'ScreeningPracticeContact'
      AND column_name = 'screeningCode'
  ) THEN
    EXECUTE '
      UPDATE "ScreeningPracticeContact"
      SET "screeningName" = COALESCE("screeningName", "screeningCode")
    ';

    EXECUTE '
      ALTER TABLE "ScreeningPracticeContact"
      DROP CONSTRAINT IF EXISTS "ScreeningPracticeContact_userId_screeningCode_key"
    ';

    EXECUTE '
      ALTER TABLE "ScreeningPracticeContact"
      DROP COLUMN IF EXISTS "screeningCode"
    ';
  END IF;
END $$;

-- Create the indexes expected by the current Prisma schema.
CREATE INDEX IF NOT EXISTS "ScreeningPracticeContact_userId_idx"
ON "ScreeningPracticeContact"("userId");

CREATE INDEX IF NOT EXISTS "ScreeningPracticeContact_userId_isDefault_idx"
ON "ScreeningPracticeContact"("userId", "isDefault");

CREATE INDEX IF NOT EXISTS "ScreeningPracticeContact_userId_screeningName_idx"
ON "ScreeningPracticeContact"("userId", "screeningName");

CREATE UNIQUE INDEX IF NOT EXISTS "ScreeningPracticeContact_userId_screeningName_key"
ON "ScreeningPracticeContact"("userId", "screeningName");
