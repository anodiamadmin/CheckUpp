import { FileType } from "@prisma/client";
import { prisma } from "../src/db/prisma";
import {
  appwriteConfig,
  createLegacyMap,
  finish,
  listAllDocuments,
  resolveUserId,
  withDbRetry,
} from "./_shared";

const toFileType = (value: unknown): FileType => {
  const normalized = String(value ?? "file")
    .trim()
    .toUpperCase();
  if (normalized === FileType.IMAGE) return FileType.IMAGE;
  if (normalized === FileType.LINK) return FileType.LINK;
  return FileType.FILE;
};

const run = async () => {
  const docs = await listAllDocuments(appwriteConfig.fileCollectionId);
  const existingMappings = await withDbRetry("wallet:loadExistingMaps", () =>
    prisma.legacyAppwriteMap.findMany({
      where: { collectionName: "file" },
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

    const fileType = toFileType(doc.fileType);
    const fileUrl = doc.file ? String(doc.file) : undefined;

    const record = await withDbRetry(`wallet:create:${doc.$id}`, () =>
      prisma.walletDocument.create({
        data: {
          userId,
          title: doc.title ? String(doc.title) : "Untitled document",
          description: doc.description ? String(doc.description) : undefined,
          documentType: doc.documentType ? String(doc.documentType) : "Other",
          fileType,
          publicUrl: fileType === FileType.LINK ? fileUrl : fileUrl,
          externalUrl: fileType === FileType.LINK ? fileUrl : undefined,
          legacyAppwriteStorageId: doc.storageFileId
            ? String(doc.storageFileId)
            : undefined,
        },
      }),
    );

    await createLegacyMap("file", doc.$id, record.id);
    existingDocumentIds.add(doc.$id);
    migrated += 1;
  }

  console.log(
    JSON.stringify(
      {
        collection: "file",
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
