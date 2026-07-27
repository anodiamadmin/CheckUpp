import { Prisma } from "@prisma/client";
import { prisma } from "../src/db/prisma";
import {
  appwriteConfig,
  createLegacyMap,
  finish,
  listAllDocuments,
  parseJsonField,
  resolveUserId,
  toDateOrNull,
  withDbRetry,
} from "./_shared";

const run = async () => {
  const docs = await listAllDocuments(appwriteConfig.pregPlannerCollectionId);
  const existingMappings = await withDbRetry("pregnancy:loadExistingMaps", () =>
    prisma.legacyAppwriteMap.findMany({
      where: { collectionName: "pregnancy_planner" },
      select: { appwriteDocumentId: true },
    }),
  );
  const existingDocumentIds = new Set(
    existingMappings.map((item) => item.appwriteDocumentId),
  );

  let migrated = 0;
  let skipped = 0;

  for (const doc of docs) {
    if (existingDocumentIds.has(doc.$id)) {
      skipped += 1;
      continue;
    }

    const userId = await resolveUserId(doc.user ? String(doc.user) : undefined);
    if (!userId) {
      skipped += 1;
      continue;
    }

    const conceptionDate =
      toDateOrNull(doc.conceptionDate) ?? toDateOrNull(doc.lmpDate);
    const expectedDueDate = toDateOrNull(doc.expectedDueDate);

    if (!conceptionDate || !expectedDueDate) {
      skipped += 1;
      continue;
    }

    const estimatedCheckupDates =
      parseJsonField(doc.estimatedCheckUpDates) ?? [];

    const plan = await withDbRetry(`pregnancy:upsert:${doc.$id}`, () =>
      prisma.pregnancyPlan.upsert({
        where: { userId },
        create: {
          userId,
          conceptionDate,
          expectedDueDate,
          estimatedCheckupDates: estimatedCheckupDates as Prisma.InputJsonValue,
        },
        update: {
          conceptionDate,
          expectedDueDate,
          estimatedCheckupDates: estimatedCheckupDates as Prisma.InputJsonValue,
        },
      }),
    );

    await createLegacyMap("pregnancy_planner", doc.$id, plan.id);
    existingDocumentIds.add(doc.$id);
    migrated += 1;
  }

  console.log(
    JSON.stringify(
      {
        collection: "pregnancy_planner",
        fetched: docs.length,
        migrated,
        skipped,
      },
      null,
      2,
    ),
  );
};

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await finish();
  });
