import { prisma } from "../src/db/prisma";
import {
  appwriteConfig,
  finish,
  listAllDocuments,
  withDbRetry,
} from "./_shared";

const run = async () => {
  const [
    appwriteUsers,
    appwriteFiles,
    appwriteFeedback,
    appwriteNutrition,
    appwritePregnancy,
    appwriteCancer,
  ] = await Promise.all([
    listAllDocuments(appwriteConfig.userCollectionId),
    listAllDocuments(appwriteConfig.fileCollectionId),
    listAllDocuments(appwriteConfig.feedbackCollectionId),
    listAllDocuments(appwriteConfig.nutritionCollectionId),
    listAllDocuments(appwriteConfig.pregPlannerCollectionId),
    listAllDocuments(appwriteConfig.cancerScreeningCollectionId),
  ]);

  const users = await withDbRetry("verify:users", () => prisma.user.count());
  const walletDocuments = await withDbRetry("verify:walletDocuments", () =>
    prisma.walletDocument.count(),
  );
  const feedbackEntries = await withDbRetry("verify:feedbackEntries", () =>
    prisma.feedbackEntry.count(),
  );
  const healthSnapshots = await withDbRetry("verify:healthSnapshots", () =>
    prisma.healthScreeningSnapshot.count(),
  );
  const pregnancyPlans = await withDbRetry("verify:pregnancyPlans", () =>
    prisma.pregnancyPlan.count(),
  );
  const cancerSnapshots = await withDbRetry("verify:cancerSnapshots", () =>
    prisma.cancerScreeningSnapshot.count(),
  );
  const screeningDefinitions = await withDbRetry(
    "verify:screeningDefinitions",
    () => prisma.screeningDefinition.count(),
  );
  const screeningPlans = await withDbRetry("verify:screeningPlans", () =>
    prisma.screeningPlan.count(),
  );
  const screeningDueItems = await withDbRetry("verify:screeningDueItems", () =>
    prisma.screeningDueItem.count(),
  );
  const screeningRecords = await withDbRetry("verify:screeningRecords", () =>
    prisma.screeningRecord.count(),
  );
  const screeningMigrationRecords = await withDbRetry(
    "verify:screeningMigrationRecords",
    () =>
      prisma.screeningRecord.count({
        where: {
          source: "MIGRATION",
        },
      }),
  );

  const report = {
    appwrite: {
      users: appwriteUsers.length,
      files: appwriteFiles.length,
      feedback: appwriteFeedback.length,
      nutrition: appwriteNutrition.length,
      pregnancy: appwritePregnancy.length,
      cancer: appwriteCancer.length,
    },
    postgres: {
      users,
      walletDocuments,
      feedbackEntries,
      healthSnapshots,
      pregnancyPlans,
      cancerSnapshots,
      screeningDefinitions,
      screeningPlans,
      screeningDueItems,
      screeningRecords,
      screeningMigrationRecords,
    },
  };

  console.log(JSON.stringify(report, null, 2));
};

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await finish();
  });
