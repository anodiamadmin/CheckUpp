import {
  GenderEligibility,
  PlanSource,
  Prisma,
  RecordSource,
  ScreeningDomain,
  ScreeningOutcomeStatus,
} from "@prisma/client";
import { prisma } from "../src/db/prisma";
import { DEFAULT_SCREENING_DEFINITIONS, LEGACY_NAME_TO_CODE } from "../src/modules/screenings/screening.constants";
import {
  appwriteConfig,
  createLegacyMap,
  finish,
  listAllDocuments,
  parseJsonField,
  resolveUserId,
  toDateOrNull,
  toGender,
  withDbRetry,
} from "./_shared";

interface LegacyScheduleItem {
  name?: string;
  date?: string;
  completed?: boolean;
  overdue?: boolean;
  eligible?: boolean;
  recommended?: boolean;
  interval?: number;
  lastTestDate?: string;
  lastTestResult?: string;
}

interface LegacyResult {
  date?: string;
  result?: string;
}

type LegacyResultMap = Record<string, LegacyResult>;

interface ResultBucket {
  displayName: string;
  record: LegacyResult;
}

const normalizeWhitespace = (value: string) => value.replace(/\s+/g, " ").trim();

const normalizeCode = (value: string) =>
  normalizeWhitespace(value)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const normalizeNameKey = (value: string) => normalizeWhitespace(value).toLowerCase();

const NAME_ALIAS_TO_CODE: Record<string, string> = {
  ...Object.fromEntries(
    Object.entries(LEGACY_NAME_TO_CODE).map(([name, code]) => [normalizeNameKey(name), code])
  ),
  "cervical screening": "CERVICAL_CANCER",
  "vision test": "VISION_CHECK",
  "blood pressure": "CARDIOVASCULAR_HEALTH",
  "waist circumference": "CARDIOVASCULAR_HEALTH",
  weight: "CARDIOVASCULAR_HEALTH",
  cholesterol: "CARDIOVASCULAR_HEALTH",
  "blood sugar": "DIABETES_CHECK",
};

const inferDomainFromName = (name: string, fallback: ScreeningDomain) => {
  const key = normalizeNameKey(name);
  if (key.includes("cancer")) return ScreeningDomain.CANCER;
  return fallback;
};

const parseLegacyDate = (value: unknown): Date | null => {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;

  const raw = String(value).trim();
  if (!raw) return null;

  const iso = new Date(raw);
  if (!Number.isNaN(iso.getTime())) return iso;

  const cleaned = normalizeWhitespace(raw).replace(
    /\b(\d{1,2})(st|nd|rd|th)\b/gi,
    "$1"
  );
  const parsed = new Date(cleaned);
  if (!Number.isNaN(parsed.getTime())) return parsed;

  return null;
};

const toIntervalMonths = (value: unknown, fallback?: number | null) => {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.max(1, Math.round(value * 12));
  }

  if (typeof fallback === "number" && Number.isFinite(fallback) && fallback > 0) {
    return fallback;
  }

  return 12;
};

const parseSchedule = (value: unknown): LegacyScheduleItem[] => {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item) => item && typeof item === "object")
    .map((item) => {
      const raw = item as Record<string, unknown>;
      return {
        name: raw.name ? String(raw.name) : undefined,
        date: raw.date ? String(raw.date) : undefined,
        completed: typeof raw.completed === "boolean" ? raw.completed : undefined,
        overdue: typeof raw.overdue === "boolean" ? raw.overdue : undefined,
        eligible: typeof raw.eligible === "boolean" ? raw.eligible : undefined,
        recommended: typeof raw.recommended === "boolean" ? raw.recommended : undefined,
        interval: typeof raw.interval === "number" ? raw.interval : undefined,
        lastTestDate: raw.lastTestDate ? String(raw.lastTestDate) : undefined,
        lastTestResult: raw.lastTestResult ? String(raw.lastTestResult) : undefined,
      };
    })
    .filter((item) => !!item.name);
};

const parseResultMap = (value: unknown): LegacyResultMap => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const results: LegacyResultMap = {};
  for (const [name, raw] of Object.entries(value as Record<string, unknown>)) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
    const record = raw as Record<string, unknown>;
    results[name] = {
      date: record.date ? String(record.date) : undefined,
      result: record.result ? String(record.result) : undefined,
    };
  }

  return results;
};

const toJsonValue = (value: unknown): Prisma.InputJsonValue | undefined => {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "string") return value;
  if (typeof value === "number") return value;
  if (typeof value === "boolean") return value;
  if (Array.isArray(value)) return value as Prisma.InputJsonArray;
  if (typeof value === "object") return value as Prisma.InputJsonObject;
  return String(value);
};

const inferOutcome = (result?: string): ScreeningOutcomeStatus => {
  const normalized = (result ?? "").toLowerCase();
  if (!normalized) return ScreeningOutcomeStatus.PENDING;
  if (normalized.includes("book an appointment")) return ScreeningOutcomeStatus.ABNORMAL;
  if (normalized.includes("abnormal")) return ScreeningOutcomeStatus.ABNORMAL;
  if (normalized.includes("normal") && !normalized.includes("abnormal")) {
    return ScreeningOutcomeStatus.NORMAL;
  }
  return ScreeningOutcomeStatus.INCONCLUSIVE;
};

const inferWasNormal = (outcome: ScreeningOutcomeStatus): boolean | null => {
  if (outcome === ScreeningOutcomeStatus.NORMAL) return true;
  if (outcome === ScreeningOutcomeStatus.ABNORMAL) return false;
  return null;
};

const seedDefaultDefinitions = async () => {
  for (const definition of DEFAULT_SCREENING_DEFINITIONS) {
    await withDbRetry(`screenings:seedDefinition:${definition.code}`, () =>
      prisma.screeningDefinition.upsert({
        where: { code: definition.code },
        create: {
          code: definition.code,
          displayName: definition.displayName,
          domain: definition.domain,
          defaultIntervalMonths: definition.defaultIntervalMonths,
          minEligibleAge: definition.minEligibleAge,
          maxEligibleAge: definition.maxEligibleAge,
          genderEligibility: definition.genderEligibility,
          guidelineVersion: "v1",
          isActive: true,
        },
        update: {
          displayName: definition.displayName,
          domain: definition.domain,
          defaultIntervalMonths: definition.defaultIntervalMonths,
          minEligibleAge: definition.minEligibleAge,
          maxEligibleAge: definition.maxEligibleAge,
          genderEligibility: definition.genderEligibility,
          isActive: true,
        },
      }),
    );
  }
};

const ensureDefinitionByName = async (
  rawName: string,
  fallbackDomain: ScreeningDomain,
  intervalMonths?: number
) => {
  const normalizedName = normalizeWhitespace(rawName);
  const aliasCode = NAME_ALIAS_TO_CODE[normalizeNameKey(normalizedName)];
  const domain = inferDomainFromName(normalizedName, fallbackDomain);

  if (aliasCode) {
    const existing = await withDbRetry(`screenings:findDefinition:${aliasCode}`, () =>
      prisma.screeningDefinition.findUnique({
        where: { code: aliasCode },
      }),
    );

    if (existing) {
      return existing;
    }

    const seeded = DEFAULT_SCREENING_DEFINITIONS.find((definition) => definition.code === aliasCode);

    return withDbRetry(`screenings:createDefinition:${aliasCode}`, () =>
      prisma.screeningDefinition.create({
        data: seeded
          ? {
              code: seeded.code,
              displayName: seeded.displayName,
              domain: seeded.domain,
              defaultIntervalMonths: seeded.defaultIntervalMonths,
              minEligibleAge: seeded.minEligibleAge,
              maxEligibleAge: seeded.maxEligibleAge,
              genderEligibility: seeded.genderEligibility,
              guidelineVersion: "v1",
              isActive: true,
            }
          : {
              code: aliasCode,
              displayName: normalizedName,
              domain,
              defaultIntervalMonths: intervalMonths ?? 12,
              minEligibleAge: 0,
              maxEligibleAge: 120,
              genderEligibility: GenderEligibility.ALL,
              guidelineVersion: "legacy_v0",
              isActive: true,
            },
      }),
    );
  }

  const baseCode = normalizeCode(normalizedName);
  const code = `${domain === ScreeningDomain.CANCER ? "CANCER" : "HEALTH"}_${baseCode}`;

  return withDbRetry(`screenings:upsertDefinition:${code}`, () =>
    prisma.screeningDefinition.upsert({
      where: { code },
      create: {
        code,
        displayName: normalizedName,
        domain,
        defaultIntervalMonths: intervalMonths ?? 12,
        minEligibleAge: 0,
        maxEligibleAge: 120,
        genderEligibility: GenderEligibility.ALL,
        guidelineVersion: aliasCode ? "v1" : "legacy_v0",
        isActive: true,
      },
      update: {
        displayName: normalizedName,
        domain,
        defaultIntervalMonths: intervalMonths ?? undefined,
        isActive: true,
      },
    }),
  );
};

const upsertPlan = async (
  userId: string,
  definitionId: string,
  latestScreeningDate: Date | null,
  dataCalculated: boolean
) =>
  withDbRetry(`screenings:upsertPlan:${userId}:${definitionId}`, () =>
    prisma.screeningPlan.upsert({
      where: {
        userId_screeningDefinitionId: {
          userId,
          screeningDefinitionId: definitionId,
        },
      },
      create: {
        userId,
        screeningDefinitionId: definitionId,
        neverScreened: !latestScreeningDate,
        lastScreeningDate: latestScreeningDate ?? undefined,
        dataCalculated,
        source: PlanSource.USER_OVERRIDE,
      },
      update: {
        neverScreened: !latestScreeningDate,
        lastScreeningDate: latestScreeningDate ?? undefined,
        dataCalculated,
        source: PlanSource.USER_OVERRIDE,
      },
    }),
  );

const upsertDueItem = async (input: {
  userId: string;
  definitionId: string;
  planId: string;
  dueDate: Date;
  eligible: boolean;
  recommended: boolean;
  overdue: boolean;
  completed: boolean;
  completedAt?: Date | null;
  intervalMonths: number;
}) => {
  const existing = await withDbRetry(
    `screenings:findDueItem:${input.userId}:${input.definitionId}`,
    () =>
      prisma.screeningDueItem.findFirst({
        where: {
          userId: input.userId,
          screeningDefinitionId: input.definitionId,
          screeningPlanId: input.planId,
          dueDate: input.dueDate,
        },
        select: { id: true },
      }),
  );

  if (existing) {
    return withDbRetry(`screenings:updateDueItem:${existing.id}`, () =>
      prisma.screeningDueItem.update({
        where: { id: existing.id },
        data: {
          eligible: input.eligible,
          recommended: input.recommended,
          overdue: input.overdue,
          completed: input.completed,
          completedAt: input.completedAt ?? undefined,
          intervalMonths: input.intervalMonths,
        },
      }),
    );
  }

  return withDbRetry(`screenings:createDueItem:${input.userId}:${input.definitionId}`, () =>
    prisma.screeningDueItem.create({
      data: {
        userId: input.userId,
        screeningDefinitionId: input.definitionId,
        screeningPlanId: input.planId,
        dueDate: input.dueDate,
        eligible: input.eligible,
        recommended: input.recommended,
        overdue: input.overdue,
        completed: input.completed,
        completedAt: input.completedAt ?? undefined,
        intervalMonths: input.intervalMonths,
      },
    }),
  );
};

const upsertLegacyRecord = async (input: {
  userId: string;
  definitionId: string;
  dueItemId?: string;
  performedAt: Date;
  resultSummary: string;
  sourceTag: string;
  raw: unknown;
}) => {
  const rawValue = toJsonValue(input.raw);
  const structuredData: Prisma.InputJsonObject = {
    importedFrom: input.sourceTag,
    ...(rawValue !== undefined ? { raw: rawValue } : {}),
  };

  const existing = await withDbRetry(
    `screenings:findRecord:${input.userId}:${input.definitionId}`,
    () =>
      prisma.screeningRecord.findFirst({
        where: {
          userId: input.userId,
          screeningDefinitionId: input.definitionId,
          source: RecordSource.MIGRATION,
          performedAt: input.performedAt,
          resultSummary: input.resultSummary,
        },
        select: { id: true },
      }),
  );

  if (existing) {
    return withDbRetry(`screenings:updateRecord:${existing.id}`, () =>
      prisma.screeningRecord.update({
        where: { id: existing.id },
        data: {
          screeningDueItemId: input.dueItemId ?? undefined,
        },
      }),
    );
  }

  const outcome = inferOutcome(input.resultSummary);
  const wasNormal = inferWasNormal(outcome);

  return withDbRetry(`screenings:createRecord:${input.userId}:${input.definitionId}`, () =>
    prisma.screeningRecord.create({
      data: {
        userId: input.userId,
        screeningDefinitionId: input.definitionId,
        screeningDueItemId: input.dueItemId ?? undefined,
        performedAt: input.performedAt,
        wasNormal: wasNormal ?? undefined,
        outcomeStatus: outcome,
        resultSummary: input.resultSummary,
        notes: "Migrated from Appwrite legacy screening payload",
        source: RecordSource.MIGRATION,
        enteredByUserId: input.userId,
        providerName: "Legacy Appwrite import",
        legacyPayloadAvailable: true,
        structuredData,
      },
    }),
  );
};

const migrateLegacyScreeningTables = async (
  userId: string,
  sourceTag: string,
  fallbackDomain: ScreeningDomain,
  scheduleRaw: unknown,
  resultsRaw: unknown,
  snapshotLastDate: Date | null
) => {
  const schedule = parseSchedule(scheduleRaw);
  const resultMap = parseResultMap(resultsRaw);

  const resultByName = new Map<string, ResultBucket>();

  for (const [name, value] of Object.entries(resultMap)) {
    resultByName.set(normalizeNameKey(name), {
      displayName: normalizeWhitespace(name),
      record: value,
    });
  }

  for (const item of schedule) {
    if (!item.name) continue;
    const key = normalizeNameKey(item.name);

    if (!resultByName.has(key) && (item.lastTestDate || item.lastTestResult)) {
      resultByName.set(key, {
        displayName: normalizeWhitespace(item.name),
        record: {
          date: item.lastTestDate,
          result: item.lastTestResult,
        },
      });
    }
  }

  for (const item of schedule) {
    if (!item.name) continue;

    const result = resultByName.get(normalizeNameKey(item.name))?.record;
    const resultDate = parseLegacyDate(result?.date);
    const dueDate = parseLegacyDate(item.date) ?? resultDate ?? snapshotLastDate ?? new Date();

    const definition = await ensureDefinitionByName(
      item.name,
      fallbackDomain,
      toIntervalMonths(item.interval)
    );

    const latestDate = resultDate ?? snapshotLastDate;
    const plan = await upsertPlan(userId, definition.id, latestDate, true);

    const intervalMonths = toIntervalMonths(item.interval, definition.defaultIntervalMonths);
    const completed = Boolean(item.completed || resultDate);
    const dueItem = await upsertDueItem({
      userId,
      definitionId: definition.id,
      planId: plan.id,
      dueDate,
      eligible: item.eligible ?? true,
      recommended: item.recommended ?? false,
      overdue: item.overdue ?? false,
      completed,
      completedAt: completed ? resultDate ?? dueDate : null,
      intervalMonths,
    });

    if (result?.date || result?.result) {
      await upsertLegacyRecord({
        userId,
        definitionId: definition.id,
        dueItemId: dueItem.id,
        performedAt: resultDate ?? dueDate,
        resultSummary: result?.result ? String(result.result) : "Legacy result imported",
        sourceTag,
        raw: {
          schedule: item,
          result,
        },
      });
      continue;
    }

    if (item.completed) {
      await upsertLegacyRecord({
        userId,
        definitionId: definition.id,
        dueItemId: dueItem.id,
        performedAt: dueDate,
        resultSummary: "Completed in legacy schedule (no detailed result captured)",
        sourceTag,
        raw: {
          schedule: item,
        },
      });
    }
  }

  for (const [nameKey, bucket] of resultByName.entries()) {
    const hasScheduleEntry = schedule.some(
      (item) => item.name && normalizeNameKey(item.name) === nameKey
    );

    if (hasScheduleEntry) continue;

    const displayName = normalizeWhitespace(bucket.displayName);
    const performedAt = parseLegacyDate(bucket.record.date) ?? snapshotLastDate ?? new Date();
    const definition = await ensureDefinitionByName(displayName, fallbackDomain);
    const plan = await upsertPlan(userId, definition.id, performedAt, true);

    await upsertLegacyRecord({
      userId,
      definitionId: definition.id,
      performedAt,
      resultSummary: bucket.record.result
        ? String(bucket.record.result)
        : "Legacy result imported",
      sourceTag,
      raw: bucket.record,
    });

    await upsertDueItem({
      userId,
      definitionId: definition.id,
      planId: plan.id,
      dueDate: performedAt,
      eligible: true,
      recommended: false,
      overdue: false,
      completed: true,
      completedAt: performedAt,
      intervalMonths: definition.defaultIntervalMonths ?? 12,
    });
  }
};

const migrateHealthSnapshots = async () => {
  const docs = await listAllDocuments(appwriteConfig.nutritionCollectionId);

  let migrated = 0;
  let skipped = 0;

  for (const doc of docs) {
    const userId = await resolveUserId(doc.user ? String(doc.user) : undefined);
    if (!userId) {
      skipped += 1;
      continue;
    }

    const snapshot = await withDbRetry(`screenings:healthSnapshot:${doc.$id}`, () =>
      prisma.healthScreeningSnapshot.upsert({
        where: { userId },
        create: {
          userId,
          age: typeof doc.age === "number" ? doc.age : undefined,
          gender: toGender(doc.gender),
          checkupDates: parseJsonField(doc.checkupDates),
          healthResults: parseJsonField(doc.healthResults),
          lastCheckupDate: toDateOrNull(doc.lastCheckupDate) ?? undefined,
        },
        update: {
          age: typeof doc.age === "number" ? doc.age : undefined,
          gender: toGender(doc.gender),
          checkupDates: parseJsonField(doc.checkupDates),
          healthResults: parseJsonField(doc.healthResults),
          lastCheckupDate: toDateOrNull(doc.lastCheckupDate) ?? undefined,
        },
      }),
    );

    await migrateLegacyScreeningTables(
      userId,
      "appwrite.nutrition",
      ScreeningDomain.HEALTH,
      parseJsonField(doc.checkupDates),
      parseJsonField(doc.healthResults),
      toDateOrNull(doc.lastCheckupDate)
    );

    await createLegacyMap("nutrition", doc.$id, snapshot.id);
    migrated += 1;
  }

  return { fetched: docs.length, migrated, skipped };
};

const migrateCancerSnapshots = async () => {
  const docs = await listAllDocuments(appwriteConfig.cancerScreeningCollectionId);

  let migrated = 0;
  let skipped = 0;

  for (const doc of docs) {
    const userId = await resolveUserId(doc.user ? String(doc.user) : undefined);
    if (!userId) {
      skipped += 1;
      continue;
    }

    const snapshot = await withDbRetry(`screenings:cancerSnapshot:${doc.$id}`, () =>
      prisma.cancerScreeningSnapshot.upsert({
        where: { userId },
        create: {
          userId,
          age: typeof doc.age === "number" ? doc.age : undefined,
          gender: toGender(doc.gender),
          calculatedScreeningDates: parseJsonField(doc.calculatedScreeningDates),
          testResults: parseJsonField(doc.testResults),
          lastScreeningDate: toDateOrNull(doc.lastScreeningDate) ?? undefined,
        },
        update: {
          age: typeof doc.age === "number" ? doc.age : undefined,
          gender: toGender(doc.gender),
          calculatedScreeningDates: parseJsonField(doc.calculatedScreeningDates),
          testResults: parseJsonField(doc.testResults),
          lastScreeningDate: toDateOrNull(doc.lastScreeningDate) ?? undefined,
        },
      }),
    );

    await migrateLegacyScreeningTables(
      userId,
      "appwrite.cancer_screening",
      ScreeningDomain.CANCER,
      parseJsonField(doc.calculatedScreeningDates),
      parseJsonField(doc.testResults),
      toDateOrNull(doc.lastScreeningDate)
    );

    await createLegacyMap("cancer_screening", doc.$id, snapshot.id);
    migrated += 1;
  }

  return { fetched: docs.length, migrated, skipped };
};

const run = async () => {
  await seedDefaultDefinitions();

  const health = await migrateHealthSnapshots();
  const cancer = await migrateCancerSnapshots();

  console.log(
    JSON.stringify(
      {
        nutrition: health,
        cancer: cancer,
      },
      null,
      2
    )
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
