import { prisma } from "../src/db/prisma";
import {
  appwriteConfig,
  createLegacyMap,
  finish,
  listAllDocuments,
  resolveUserId,
  toDateOrNull,
  withDbRetry,
} from "./_shared";

const run = async () => {
  const docs = await listAllDocuments(appwriteConfig.feedbackCollectionId);
  const existingMappings = await withDbRetry("feedback:loadExistingMaps", () =>
    prisma.legacyAppwriteMap.findMany({
      where: { collectionName: "feedback" },
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

    const entry = await withDbRetry(`feedback:create:${doc.$id}`, () =>
      prisma.feedbackEntry.create({
        data: {
          userId,
          feedback: doc.feedback ? String(doc.feedback) : "",
          rating: typeof doc.rating === "number" ? doc.rating : undefined,
          submittedAt: toDateOrNull(doc.submittedAt) ?? new Date(),
        },
      }),
    );

    await createLegacyMap("feedback", doc.$id, entry.id);
    existingDocumentIds.add(doc.$id);
    migrated += 1;
  }

  console.log(
    JSON.stringify(
      {
        collection: "feedback",
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
