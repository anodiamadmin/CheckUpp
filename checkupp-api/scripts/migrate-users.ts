import { UserRole } from "@prisma/client";
import { prisma } from "../src/db/prisma";
import {
  appwriteConfig,
  createLegacyMap,
  finish,
  listAllDocuments,
  toDateOrNull,
  toGender,
  withDbRetry,
} from "./_shared";

const run = async () => {
  const docs = await listAllDocuments(appwriteConfig.userCollectionId);

  let migrated = 0;
  let skipped = 0;

  for (const doc of docs) {
    const email = doc.email ? String(doc.email).trim().toLowerCase() : null;

    if (!email) {
      skipped += 1;
      continue;
    }

    const user = await withDbRetry(`users:upsert:${email}`, () =>
      prisma.user.upsert({
        where: { email },
        create: {
          email,
          name: doc.name ? String(doc.name) : email.split("@")[0],
          avatarUrl: doc.avatar ? String(doc.avatar) : undefined,
          phoneNumber: doc.phoneNumber ? String(doc.phoneNumber) : undefined,
          gender: toGender(doc.gender),
          dob: toDateOrNull(doc.dob) ?? undefined,
          role: UserRole.PATIENT,
        },
        update: {
          name: doc.name ? String(doc.name) : undefined,
          avatarUrl: doc.avatar ? String(doc.avatar) : undefined,
          phoneNumber: doc.phoneNumber ? String(doc.phoneNumber) : undefined,
          gender: toGender(doc.gender),
          dob: toDateOrNull(doc.dob) ?? undefined,
        },
      }),
    );

    await createLegacyMap("user", doc.$id, user.id);
    migrated += 1;
  }

  console.log(
    JSON.stringify(
      {
        collection: "user",
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
