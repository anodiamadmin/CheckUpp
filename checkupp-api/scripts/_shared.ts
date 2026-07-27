import { Gender, Prisma } from "@prisma/client";
import { Client, Databases, Models, Query } from "node-appwrite";
import { prisma } from "../src/db/prisma";

const required = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }

  return value;
};

export const appwriteConfig = {
  endpoint: required("APPWRITE_ENDPOINT"),
  projectId: required("APPWRITE_PROJECT_ID"),
  apiKey: required("APPWRITE_API_KEY"),
  databaseId: required("APPWRITE_DATABASE_ID"),
  userCollectionId: required("APPWRITE_USER_COLLECTION_ID"),
  fileCollectionId: required("APPWRITE_FILE_COLLECTION_ID"),
  feedbackCollectionId: required("APPWRITE_FEEDBACK_COLLECTION_ID"),
  nutritionCollectionId: required("APPWRITE_NUTRITION_COLLECTION_ID"),
  pregPlannerCollectionId: required("APPWRITE_PREG_PLANNER_COLLECTION_ID"),
  cancerScreeningCollectionId: required(
    "APPWRITE_CANCER_SCREENING_COLLECTION_ID",
  ),
};

const appwriteClient = new Client()
  .setEndpoint(appwriteConfig.endpoint)
  .setProject(appwriteConfig.projectId)
  .setKey(appwriteConfig.apiKey);

export const appwriteDatabases = new Databases(appwriteClient);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isRetryableDbError = (error: unknown) => {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: unknown }).code ?? "")
      : "";
  const message =
    error instanceof Error
      ? error.message.toLowerCase()
      : String(error).toLowerCase();

  if (["ETIMEDOUT", "ECONNRESET", "P1001", "P1008", "P1017"].includes(code)) {
    return true;
  }

  return (
    message.includes("timed out") ||
    message.includes("timeout") ||
    message.includes("connection") ||
    message.includes("socket")
  );
};

export const withDbRetry = async <T>(
  label: string,
  operation: () => Promise<T>,
) => {
  const maxAttempts = Number(process.env.MIGRATION_DB_MAX_ATTEMPTS ?? "8");
  const baseSleepMs = Number(process.env.MIGRATION_DB_RETRY_BASE_MS ?? "1000");
  const maxSleepMs = Number(process.env.MIGRATION_DB_RETRY_MAX_MS ?? "12000");

  let attempt = 0;

  while (true) {
    try {
      return await operation();
    } catch (error) {
      attempt += 1;

      if (!isRetryableDbError(error) || attempt >= maxAttempts) {
        throw error;
      }

      const backoff = baseSleepMs * 2 ** (attempt - 1);
      const jitter = Math.floor(Math.random() * 250);
      const waitMs = Math.min(backoff + jitter, maxSleepMs);
      const reason =
        typeof error === "object" && error !== null && "code" in error
          ? String((error as { code?: unknown }).code ?? "unknown")
          : "unknown";

      console.warn(
        `[db-retry] ${label} failed (attempt ${attempt}/${maxAttempts}, reason: ${reason}). Retrying in ${waitMs}ms...`,
      );

      await sleep(waitMs);
    }
  }
};

export const listAllDocuments = async (collectionId: string) => {
  const documents: Models.DefaultDocument[] = [];
  const pageSize = 100;
  let offset = 0;

  while (true) {
    const response = await appwriteDatabases.listDocuments(
      appwriteConfig.databaseId,
      collectionId,
      [Query.limit(pageSize), Query.offset(offset)],
    );

    documents.push(...(response.documents as Models.DefaultDocument[]));

    if (response.documents.length < pageSize) {
      break;
    }

    offset += pageSize;
  }

  return documents;
};

export const toDateOrNull = (value: unknown): Date | null => {
  if (!value) return null;

  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
};

export const parseJsonField = (
  value: unknown,
): Prisma.InputJsonValue | undefined => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value !== "string") {
    return value as Prisma.InputJsonValue;
  }

  try {
    return JSON.parse(value) as Prisma.InputJsonValue;
  } catch {
    return undefined;
  }
};

export const toGender = (value: unknown): Gender | undefined => {
  if (!value) return undefined;

  const normalized = String(value).trim().toUpperCase().replace(/[\s-]/g, "_");

  if (normalized === Gender.MALE) return Gender.MALE;
  if (normalized === Gender.FEMALE) return Gender.FEMALE;
  if (normalized === Gender.PREFER_NOT_TO_SAY) return Gender.PREFER_NOT_TO_SAY;
  if (normalized === Gender.UNKNOWN) return Gender.UNKNOWN;

  return undefined;
};

export const createLegacyMap = async (
  collectionName: string,
  appwriteDocumentId: string,
  newRecordId: string,
) => {
  await withDbRetry(
    `createLegacyMap:${collectionName}:${appwriteDocumentId}`,
    () =>
      prisma.legacyAppwriteMap.upsert({
        where: {
          collectionName_appwriteDocumentId: {
            collectionName,
            appwriteDocumentId,
          },
        },
        create: {
          collectionName,
          appwriteDocumentId,
          newRecordId,
        },
        update: {
          newRecordId,
        },
      }),
  );
};

export const resolveUserId = async (
  appwriteUserId?: string,
): Promise<string | null> => {
  if (!appwriteUserId) return null;

  const mapped = await withDbRetry(
    `resolveUserId:legacyMap:${appwriteUserId}`,
    () =>
      prisma.legacyAppwriteMap.findUnique({
        where: {
          collectionName_appwriteDocumentId: {
            collectionName: "user",
            appwriteDocumentId: appwriteUserId,
          },
        },
      }),
  );

  if (mapped) return mapped.newRecordId;

  const user = await withDbRetry(`resolveUserId:user:${appwriteUserId}`, () =>
    prisma.user.findUnique({
      where: { id: appwriteUserId },
      select: { id: true },
    }),
  );

  return user?.id ?? null;
};

export const finish = async () => {
  await prisma.$disconnect();
};
