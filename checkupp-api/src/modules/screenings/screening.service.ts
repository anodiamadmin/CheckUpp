import {
  CancerResultCategory,
  CancerType,
  Gender,
  GenderEligibility,
  ImportSource,
  ImportStatus,
  PlanSource,
  Prisma,
  RecordSource,
  ScreeningPracticeContact,
  ScreeningDomain,
  ScreeningOutcomeStatus,
  ScreeningValueType,
  Severity,
} from "@prisma/client";
import { prisma } from "../../db/prisma";
import { ApiError } from "../../middlewares/error-handler";
import { AuthContext } from "../../types/auth";
import { withAppwriteCompat } from "../../utils/compat";
import { addMonths, toDate } from "../../utils/date";
import { toGender } from "../../utils/gender";
import { ensureArray, ensureObject, parseJsonIfString } from "../../utils/json";
import { toSkipTake, withPagination } from "../../utils/pagination";
import {
  DEFAULT_SCREENING_DEFINITIONS,
  LEGACY_NAME_TO_CODE,
} from "./screening.constants";

const recordInclude = {
  screeningDefinition: true,
  screeningDueItem: true,
  measurements: true,
  flags: true,
  attachments: true,
  cancerDetail: true,
  cardiovascularDetail: true,
  diabetesDetail: true,
  visionDetail: true,
  dentalDetail: true,
  mentalHealthDetail: true,
} satisfies Prisma.ScreeningRecordInclude;

type FullRecord = Prisma.ScreeningRecordGetPayload<{
  include: typeof recordInclude;
}>;

type RecordDetailsInput = {
  cancer?: Record<string, unknown>;
  cardiovascular?: Record<string, unknown>;
  diabetes?: Record<string, unknown>;
  vision?: Record<string, unknown>;
  dental?: Record<string, unknown>;
  mentalHealth?: Record<string, unknown>;
};

interface CreateRecordInput {
  screeningCode?: string;
  screeningDefinitionId?: string;
  screeningDueItemId?: string | null;
  performedAt: string;
  wasNormal?: boolean | null;
  outcomeStatus?: string;
  resultSummary?: string | null;
  notes?: string | null;
  source?: string;
  enteredByUserId?: string | null;
  providerName?: string | null;
  facilityName?: string | null;
  legacyPayloadAvailable?: boolean;
  structuredData?: unknown;
  measurements?: Array<Record<string, unknown>>;
  flags?: Array<Record<string, unknown>>;
  attachments?: Array<Record<string, unknown>>;
  details?: RecordDetailsInput;
  dueItemCompletion?: boolean;
}

interface UpsertPlanInput {
  neverScreened?: boolean;
  lastScreeningDate?: string | null;
  dataCalculated?: boolean;
  source?: string;
  intervalMonths?: number;
  recalculateDueItem?: boolean;
}

interface SnapshotInput {
  age?: number | null;
  gender?: string | null;
  calculatedScreeningDates?: unknown;
  testResults?: unknown;
  checkupDates?: unknown;
  healthResults?: unknown;
  lastScreeningDate?: string | null;
  lastCheckupDate?: string | null;
}

interface UpsertPracticeContactInput {
  screeningName?: string | null;
  isDefault?: boolean;
  hotdocUrl?: string | null;
  practicePhone?: string | null;
  practiceEmail?: string | null;
}

interface DeletePracticeContactInput {
  screeningName?: string | null;
  isDefault?: boolean;
}

interface ImportPayload {
  source: string;
  records?: Array<Record<string, unknown>>;
  cancerHistory?: Record<string, Array<Record<string, unknown>>>;
  healthHistory?: Record<string, Array<Record<string, unknown>>>;
}

const normalizeCode = (code: string): string =>
  code
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const normalizeDomain = (value?: string): ScreeningDomain | undefined => {
  if (!value) return undefined;
  return value.toUpperCase() === "HEALTH"
    ? ScreeningDomain.HEALTH
    : ScreeningDomain.CANCER;
};

const normalizePlanSource = (value?: string): PlanSource | undefined => {
  if (!value) return undefined;
  const normalized = value.trim().toUpperCase();
  if (normalized === PlanSource.CLINICIAN_OVERRIDE)
    return PlanSource.CLINICIAN_OVERRIDE;
  if (normalized === PlanSource.USER_OVERRIDE) return PlanSource.USER_OVERRIDE;
  return PlanSource.SYSTEM;
};

const normalizeOutcomeStatus = (value?: string): ScreeningOutcomeStatus => {
  if (!value) return ScreeningOutcomeStatus.PENDING;
  const normalized = value.trim().toUpperCase();

  if (normalized === ScreeningOutcomeStatus.ABNORMAL)
    return ScreeningOutcomeStatus.ABNORMAL;
  if (normalized === ScreeningOutcomeStatus.INCONCLUSIVE)
    return ScreeningOutcomeStatus.INCONCLUSIVE;
  if (normalized === ScreeningOutcomeStatus.NOT_DONE)
    return ScreeningOutcomeStatus.NOT_DONE;
  if (normalized === ScreeningOutcomeStatus.NORMAL)
    return ScreeningOutcomeStatus.NORMAL;
  return ScreeningOutcomeStatus.PENDING;
};

const normalizeRecordSource = (value?: string): RecordSource => {
  if (!value) return RecordSource.MOBILE_FORM;
  const normalized = value.trim().toUpperCase();

  if (normalized === RecordSource.CLINICIAN) return RecordSource.CLINICIAN;
  if (normalized === RecordSource.MIGRATION) return RecordSource.MIGRATION;
  if (normalized === RecordSource.MOBILE_IMPORT)
    return RecordSource.MOBILE_IMPORT;
  return RecordSource.MOBILE_FORM;
};

const normalizeImportSource = (value?: string): ImportSource => {
  if (!value) return ImportSource.LOCAL_ASYNCSTORAGE;
  const normalized = value.trim().toUpperCase();
  if (normalized === ImportSource.APPWRITE_SNAPSHOT)
    return ImportSource.APPWRITE_SNAPSHOT;
  if (normalized === ImportSource.CSV) return ImportSource.CSV;
  return ImportSource.LOCAL_ASYNCSTORAGE;
};

const normalizeValueType = (value: string): ScreeningValueType => {
  const normalized = value.trim().toUpperCase();
  if (normalized === ScreeningValueType.BOOLEAN)
    return ScreeningValueType.BOOLEAN;
  if (normalized === ScreeningValueType.CODED) return ScreeningValueType.CODED;
  if (normalized === ScreeningValueType.DATE) return ScreeningValueType.DATE;
  if (normalized === ScreeningValueType.JSON) return ScreeningValueType.JSON;
  if (normalized === ScreeningValueType.NUMBER)
    return ScreeningValueType.NUMBER;
  return ScreeningValueType.TEXT;
};

const normalizeSeverity = (value: string): Severity => {
  const normalized = value.trim().toUpperCase();
  if (normalized === Severity.CRITICAL) return Severity.CRITICAL;
  if (normalized === Severity.WARNING) return Severity.WARNING;
  return Severity.INFO;
};

const normalizeCancerType = (value?: string): CancerType | undefined => {
  if (!value) return undefined;
  const normalized = value.trim().toUpperCase();

  if (normalized === CancerType.BOWEL) return CancerType.BOWEL;
  if (normalized === CancerType.BREAST) return CancerType.BREAST;
  if (normalized === CancerType.CERVICAL) return CancerType.CERVICAL;
  if (normalized === CancerType.LUNG) return CancerType.LUNG;
  if (normalized === CancerType.PROSTATE) return CancerType.PROSTATE;
  if (normalized === CancerType.SKIN) return CancerType.SKIN;
  if (normalized === CancerType.OTHER) return CancerType.OTHER;

  return undefined;
};

const normalizeCancerResultCategory = (
  value?: string,
): CancerResultCategory | undefined => {
  if (!value) return undefined;
  const normalized = value.trim().toUpperCase();

  if (normalized === CancerResultCategory.ABNORMAL)
    return CancerResultCategory.ABNORMAL;
  if (normalized === CancerResultCategory.INADEQUATE)
    return CancerResultCategory.INADEQUATE;
  if (normalized === CancerResultCategory.INDETERMINATE)
    return CancerResultCategory.INDETERMINATE;
  if (normalized === CancerResultCategory.NEGATIVE)
    return CancerResultCategory.NEGATIVE;
  if (normalized === CancerResultCategory.POSITIVE)
    return CancerResultCategory.POSITIVE;

  return undefined;
};

const toNullableDate = (value: unknown): Date | null | undefined => {
  if (value === undefined) return undefined;
  return toDate(value as string | Date | null) as Date | null;
};

const toJsonValue = (value: unknown): Prisma.InputJsonValue | undefined => {
  if (value === undefined || value === null) return undefined;

  const parsed = parseJsonIfString<Prisma.InputJsonValue>(value);
  if (parsed === null || parsed === undefined) {
    return undefined;
  }

  return parsed;
};

const calculateAge = (dob?: Date | null): number | undefined => {
  if (!dob) return undefined;

  const now = new Date();
  let age = now.getUTCFullYear() - dob.getUTCFullYear();
  const monthDiff = now.getUTCMonth() - dob.getUTCMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && now.getUTCDate() < dob.getUTCDate())
  ) {
    age -= 1;
  }

  return age >= 0 ? age : undefined;
};

const isEligibleForDefinition = (
  user: { gender: Gender; dob: Date | null },
  definition: {
    minEligibleAge: number | null;
    maxEligibleAge: number | null;
    genderEligibility: GenderEligibility;
  },
): boolean => {
  if (
    definition.genderEligibility === GenderEligibility.MALE &&
    user.gender !== Gender.MALE
  ) {
    return false;
  }

  if (
    definition.genderEligibility === GenderEligibility.FEMALE &&
    user.gender !== Gender.FEMALE
  ) {
    return false;
  }

  const age = calculateAge(user.dob);
  if (age === undefined) {
    return true;
  }

  if (definition.minEligibleAge !== null && age < definition.minEligibleAge) {
    return false;
  }

  if (definition.maxEligibleAge !== null && age > definition.maxEligibleAge) {
    return false;
  }

  return true;
};

const findDefinitionByCodeOrName = async (codeOrName: string) => {
  const byLegacy = LEGACY_NAME_TO_CODE[codeOrName.trim()];
  const normalized = normalizeCode(byLegacy ?? codeOrName);

  return prisma.screeningDefinition.findUnique({
    where: { code: normalized },
  });
};

const toDefinitionResponse = (
  definition: Prisma.ScreeningDefinitionGetPayload<Record<string, never>>,
) => ({
  ...withAppwriteCompat(definition),
  domain: definition.domain.toLowerCase(),
});

const toPlanResponse = (
  plan: Prisma.ScreeningPlanGetPayload<{
    include: {
      screeningDefinition: true;
      dueItems: {
        orderBy: { dueDate: "asc" };
        take: 5;
      };
    };
  }>,
) => ({
  ...withAppwriteCompat(plan),
  screeningCode: plan.screeningDefinition.code,
  screeningName: plan.screeningDefinition.displayName,
  domain: plan.screeningDefinition.domain.toLowerCase(),
  dueItems: plan.dueItems,
});

const toDueItemResponse = (
  dueItem: Prisma.ScreeningDueItemGetPayload<{
    include: { screeningDefinition: true };
  }>,
) => ({
  ...withAppwriteCompat(dueItem),
  screeningCode: dueItem.screeningDefinition.code,
  screeningName: dueItem.screeningDefinition.displayName,
  domain: dueItem.screeningDefinition.domain.toLowerCase(),
});

const toRecordResponse = (record: FullRecord) => ({
  ...withAppwriteCompat(record),
  screeningCode: record.screeningDefinition.code,
  screeningName: record.screeningDefinition.displayName,
  domain: record.screeningDefinition.domain.toLowerCase(),
});

const toPracticeContactResponse = (contact: ScreeningPracticeContact) => {
  const compat = withAppwriteCompat(contact);

  return {
    ...compat,
    screeningName: contact.screeningName,
    isDefault: contact.isDefault,
    hotdocUrl: contact.hotdocUrl,
    practicePhone: contact.practicePhone,
    practiceEmail: contact.practiceEmail,
  };
};

const normalizeMeasurements = (
  measurements: Array<Record<string, unknown>> = [],
) =>
  measurements
    .filter(
      (measurement) =>
        typeof measurement.code === "string" &&
        typeof measurement.valueType === "string",
    )
    .map((measurement) => ({
      code: String(measurement.code),
      displayName: measurement.displayName
        ? String(measurement.displayName)
        : undefined,
      valueType: normalizeValueType(String(measurement.valueType)),
      valueNumber:
        typeof measurement.valueNumber === "number"
          ? new Prisma.Decimal(measurement.valueNumber)
          : undefined,
      valueText:
        measurement.valueText !== undefined
          ? String(measurement.valueText)
          : undefined,
      valueBoolean:
        typeof measurement.valueBoolean === "boolean"
          ? measurement.valueBoolean
          : undefined,
      valueDate: toNullableDate(measurement.valueDate) ?? undefined,
      valueCode:
        measurement.valueCode !== undefined
          ? String(measurement.valueCode)
          : undefined,
      valueJson: toJsonValue(measurement.valueJson),
      unit:
        measurement.unit !== undefined ? String(measurement.unit) : undefined,
      referenceLow:
        typeof measurement.referenceLow === "number"
          ? new Prisma.Decimal(measurement.referenceLow)
          : undefined,
      referenceHigh:
        typeof measurement.referenceHigh === "number"
          ? new Prisma.Decimal(measurement.referenceHigh)
          : undefined,
      abnormalFlag:
        typeof measurement.abnormalFlag === "boolean"
          ? measurement.abnormalFlag
          : undefined,
      interpretation:
        measurement.interpretation !== undefined
          ? String(measurement.interpretation)
          : undefined,
    }));

const normalizeFlags = (flags: Array<Record<string, unknown>> = []) =>
  flags
    .filter(
      (flag) =>
        typeof flag.severity === "string" &&
        typeof flag.code === "string" &&
        typeof flag.message === "string",
    )
    .map((flag) => ({
      severity: normalizeSeverity(String(flag.severity)),
      code: String(flag.code),
      message: String(flag.message),
    }));

const normalizeAttachments = (
  attachments: Array<Record<string, unknown>> = [],
) =>
  attachments.map((attachment) => ({
    walletDocumentId:
      typeof attachment.walletDocumentId === "string"
        ? attachment.walletDocumentId
        : undefined,
    objectKey: attachment.objectKey ? String(attachment.objectKey) : undefined,
    fileName: attachment.fileName ? String(attachment.fileName) : undefined,
    mimeType: attachment.mimeType ? String(attachment.mimeType) : undefined,
  }));

const createCancerDetail = async (
  tx: Prisma.TransactionClient,
  screeningRecordId: string,
  data: Record<string, unknown>,
) => {
  await tx.cancerScreeningDetail.create({
    data: {
      screeningRecordId,
      cancerType:
        normalizeCancerType(data.cancerType as string) ?? CancerType.OTHER,
      testMethod: data.testMethod ? String(data.testMethod) : undefined,
      specimenType: data.specimenType ? String(data.specimenType) : undefined,
      specimenCollectedAt:
        toNullableDate(data.specimenCollectedAt) ?? undefined,
      labName: data.labName ? String(data.labName) : undefined,
      labReference: data.labReference ? String(data.labReference) : undefined,
      resultCategory: normalizeCancerResultCategory(
        data.resultCategory as string,
      ),
      followUpRequired: Boolean(data.followUpRequired),
      followUpBy: toNullableDate(data.followUpBy) ?? undefined,
      recommendation: data.recommendation
        ? String(data.recommendation)
        : undefined,
    },
  });
};

const createCardiovascularDetail = async (
  tx: Prisma.TransactionClient,
  screeningRecordId: string,
  data: Record<string, unknown>,
) => {
  await tx.cardiovascularDetail.create({
    data: {
      screeningRecordId,
      systolicBp:
        typeof data.systolicBp === "number" ? data.systolicBp : undefined,
      diastolicBp:
        typeof data.diastolicBp === "number" ? data.diastolicBp : undefined,
      heartRate:
        typeof data.heartRate === "number" ? data.heartRate : undefined,
      ecgResult: data.ecgResult ? String(data.ecgResult) : undefined,
      ecgNotes: data.ecgNotes ? String(data.ecgNotes) : undefined,
      totalCholesterol:
        typeof data.totalCholesterol === "number"
          ? new Prisma.Decimal(data.totalCholesterol)
          : undefined,
      ldlCholesterol:
        typeof data.ldlCholesterol === "number"
          ? new Prisma.Decimal(data.ldlCholesterol)
          : undefined,
      hdlCholesterol:
        typeof data.hdlCholesterol === "number"
          ? new Prisma.Decimal(data.hdlCholesterol)
          : undefined,
      triglycerides:
        typeof data.triglycerides === "number"
          ? new Prisma.Decimal(data.triglycerides)
          : undefined,
    },
  });
};

const createDiabetesDetail = async (
  tx: Prisma.TransactionClient,
  screeningRecordId: string,
  data: Record<string, unknown>,
) => {
  await tx.diabetesDetail.create({
    data: {
      screeningRecordId,
      fastingGlucose:
        typeof data.fastingGlucose === "number"
          ? new Prisma.Decimal(data.fastingGlucose)
          : undefined,
      randomGlucose:
        typeof data.randomGlucose === "number"
          ? new Prisma.Decimal(data.randomGlucose)
          : undefined,
      postMealGlucose:
        typeof data.postMealGlucose === "number"
          ? new Prisma.Decimal(data.postMealGlucose)
          : undefined,
      hba1c:
        typeof data.hba1c === "number"
          ? new Prisma.Decimal(data.hba1c)
          : undefined,
      ketones:
        typeof data.ketones === "number"
          ? new Prisma.Decimal(data.ketones)
          : undefined,
      systolicBp:
        typeof data.systolicBp === "number" ? data.systolicBp : undefined,
      diastolicBp:
        typeof data.diastolicBp === "number" ? data.diastolicBp : undefined,
      weightKg:
        typeof data.weightKg === "number"
          ? new Prisma.Decimal(data.weightKg)
          : undefined,
      heightCm:
        typeof data.heightCm === "number"
          ? new Prisma.Decimal(data.heightCm)
          : undefined,
      bmi:
        typeof data.bmi === "number" ? new Prisma.Decimal(data.bmi) : undefined,
      notes: data.notes ? String(data.notes) : undefined,
    },
  });
};

const createVisionDetail = async (
  tx: Prisma.TransactionClient,
  screeningRecordId: string,
  data: Record<string, unknown>,
) => {
  await tx.visionDetail.create({
    data: {
      screeningRecordId,
      rightEyeAcuity: data.rightEyeAcuity
        ? String(data.rightEyeAcuity)
        : undefined,
      leftEyeAcuity: data.leftEyeAcuity
        ? String(data.leftEyeAcuity)
        : undefined,
      bothEyesAcuity: data.bothEyesAcuity
        ? String(data.bothEyesAcuity)
        : undefined,
      colorVisionResult: data.colorVisionResult
        ? String(data.colorVisionResult)
        : undefined,
      colorVisionDetails: data.colorVisionDetails
        ? String(data.colorVisionDetails)
        : undefined,
      peripheralVisionResult: data.peripheralVisionResult
        ? String(data.peripheralVisionResult)
        : undefined,
      peripheralVisionDetails: data.peripheralVisionDetails
        ? String(data.peripheralVisionDetails)
        : undefined,
      rightEyePressure:
        typeof data.rightEyePressure === "number"
          ? new Prisma.Decimal(data.rightEyePressure)
          : undefined,
      leftEyePressure:
        typeof data.leftEyePressure === "number"
          ? new Prisma.Decimal(data.leftEyePressure)
          : undefined,
      blurredVision: Boolean(data.blurredVision),
      eyeStrain: Boolean(data.eyeStrain),
      headaches: Boolean(data.headaches),
      dryEyes: Boolean(data.dryEyes),
      nightVision: Boolean(data.nightVision),
      doubleVision: Boolean(data.doubleVision),
      glassesOrContacts: data.glassesOrContacts
        ? String(data.glassesOrContacts)
        : undefined,
      notes: data.notes ? String(data.notes) : undefined,
    },
  });
};

const createDentalDetail = async (
  tx: Prisma.TransactionClient,
  screeningRecordId: string,
  data: Record<string, unknown>,
) => {
  await tx.dentalDetail.create({
    data: {
      screeningRecordId,
      brushingFrequency: data.brushingFrequency
        ? String(data.brushingFrequency)
        : undefined,
      flossingFrequency: data.flossingFrequency
        ? String(data.flossingFrequency)
        : undefined,
      mouthwashUse: Boolean(data.mouthwashUse),
      cavities: typeof data.cavities === "number" ? data.cavities : undefined,
      fillings: typeof data.fillings === "number" ? data.fillings : undefined,
      missingTeeth:
        typeof data.missingTeeth === "number" ? data.missingTeeth : undefined,
      crowns: typeof data.crowns === "number" ? data.crowns : undefined,
      implants: typeof data.implants === "number" ? data.implants : undefined,
      gumBleeding: Boolean(data.gumBleeding),
      gumSwelling: Boolean(data.gumSwelling),
      gumRecession: Boolean(data.gumRecession),
      gumSensitivity: Boolean(data.gumSensitivity),
      toothache: Boolean(data.toothache),
      jawPain: Boolean(data.jawPain),
      badBreath: Boolean(data.badBreath),
      dryMouth: Boolean(data.dryMouth),
      grinding: Boolean(data.grinding),
      toothSensitivity: Boolean(data.toothSensitivity),
      lastCleaning: toNullableDate(data.lastCleaning) ?? undefined,
      lastXray: toNullableDate(data.lastXray) ?? undefined,
      orthodontics: data.orthodontics ? String(data.orthodontics) : undefined,
      smokingStatus: data.smokingStatus
        ? String(data.smokingStatus)
        : undefined,
      notes: data.notes ? String(data.notes) : undefined,
    },
  });
};

const createMentalHealthDetail = async (
  tx: Prisma.TransactionClient,
  screeningRecordId: string,
  data: Record<string, unknown>,
) => {
  await tx.mentalHealthDetail.create({
    data: {
      screeningRecordId,
      k10Score: typeof data.k10Score === "number" ? data.k10Score : undefined,
      k10Level: data.k10Level ? String(data.k10Level) : undefined,
      dass21DepressionScore:
        typeof data.dass21DepressionScore === "number"
          ? data.dass21DepressionScore
          : undefined,
      dass21DepressionLevel: data.dass21DepressionLevel
        ? String(data.dass21DepressionLevel)
        : undefined,
      dass21AnxietyScore:
        typeof data.dass21AnxietyScore === "number"
          ? data.dass21AnxietyScore
          : undefined,
      dass21AnxietyLevel: data.dass21AnxietyLevel
        ? String(data.dass21AnxietyLevel)
        : undefined,
      dass21StressScore:
        typeof data.dass21StressScore === "number"
          ? data.dass21StressScore
          : undefined,
      dass21StressLevel: data.dass21StressLevel
        ? String(data.dass21StressLevel)
        : undefined,
      sleepHours:
        typeof data.sleepHours === "number"
          ? new Prisma.Decimal(data.sleepHours)
          : undefined,
      sleepQuality: data.sleepQuality ? String(data.sleepQuality) : undefined,
      difficultyFalling: Boolean(data.difficultyFalling),
      frequentWaking: Boolean(data.frequentWaking),
      exerciseFrequency: data.exerciseFrequency
        ? String(data.exerciseFrequency)
        : undefined,
      socialSupport: data.socialSupport
        ? String(data.socialSupport)
        : undefined,
      workStress: data.workStress ? String(data.workStress) : undefined,
      substanceUse: Boolean(data.substanceUse),
      persistentSadness: Boolean(data.persistentSadness),
      lossOfInterest: Boolean(data.lossOfInterest),
      anxiousFeelings: Boolean(data.anxiousFeelings),
      irritability: Boolean(data.irritability),
      concentrationProblems: Boolean(data.concentrationProblems),
      fatigueOrLowEnergy: Boolean(data.fatigueOrLowEnergy),
      notes: data.notes ? String(data.notes) : undefined,
    },
  });
};

const createDetailTables = async (
  tx: Prisma.TransactionClient,
  screeningRecordId: string,
  details?: RecordDetailsInput,
) => {
  if (!details) return;

  if (details.cancer) {
    await createCancerDetail(tx, screeningRecordId, details.cancer);
  }

  if (details.cardiovascular) {
    await createCardiovascularDetail(
      tx,
      screeningRecordId,
      details.cardiovascular,
    );
  }

  if (details.diabetes) {
    await createDiabetesDetail(tx, screeningRecordId, details.diabetes);
  }

  if (details.vision) {
    await createVisionDetail(tx, screeningRecordId, details.vision);
  }

  if (details.dental) {
    await createDentalDetail(tx, screeningRecordId, details.dental);
  }

  if (details.mentalHealth) {
    await createMentalHealthDetail(tx, screeningRecordId, details.mentalHealth);
  }
};

export const seedScreeningDefinitions = async () => {
  await Promise.all(
    DEFAULT_SCREENING_DEFINITIONS.map((definition) =>
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
    ),
  );
};

export const listDefinitions = async (domain?: string) => {
  await seedScreeningDefinitions();

  const normalizedDomain = normalizeDomain(domain);

  const definitions = await prisma.screeningDefinition.findMany({
    where: {
      isActive: true,
      ...(normalizedDomain ? { domain: normalizedDomain } : {}),
    },
    orderBy: [{ domain: "asc" }, { displayName: "asc" }],
  });

  return definitions.map(toDefinitionResponse);
};

export const listPlans = async (auth: AuthContext, domain?: string) => {
  await seedScreeningDefinitions();

  const normalizedDomain = normalizeDomain(domain);

  const plans = await prisma.screeningPlan.findMany({
    where: {
      userId: auth.userId,
      ...(normalizedDomain
        ? {
            screeningDefinition: {
              domain: normalizedDomain,
            },
          }
        : {}),
    },
    include: {
      screeningDefinition: true,
      dueItems: {
        orderBy: { dueDate: "asc" },
        take: 5,
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return plans.map(toPlanResponse);
};

export const upsertPlan = async (
  auth: AuthContext,
  screeningCode: string,
  input: UpsertPlanInput,
) => {
  await seedScreeningDefinitions();

  const definition = await findDefinitionByCodeOrName(screeningCode);
  if (!definition) {
    throw new ApiError(404, `Unknown screening code: ${screeningCode}`);
  }

  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: { id: true, dob: true, gender: true },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const normalizedSource = normalizePlanSource(input.source);
  const normalizedLastDate =
    toNullableDate(input.lastScreeningDate) ?? undefined;
  const intervalMonths =
    input.intervalMonths ?? definition.defaultIntervalMonths ?? 12;

  const plan = await prisma.screeningPlan.upsert({
    where: {
      userId_screeningDefinitionId: {
        userId: auth.userId,
        screeningDefinitionId: definition.id,
      },
    },
    create: {
      userId: auth.userId,
      screeningDefinitionId: definition.id,
      neverScreened: input.neverScreened ?? false,
      lastScreeningDate: normalizedLastDate,
      dataCalculated: input.dataCalculated ?? false,
      source: normalizedSource ?? PlanSource.SYSTEM,
    },
    update: {
      neverScreened: input.neverScreened,
      lastScreeningDate: normalizedLastDate,
      dataCalculated: input.dataCalculated,
      source: normalizedSource,
    },
  });

  if (input.recalculateDueItem !== false) {
    const baseDate =
      plan.neverScreened || !plan.lastScreeningDate
        ? new Date()
        : addMonths(plan.lastScreeningDate, intervalMonths);

    const eligible = isEligibleForDefinition(user, definition);
    const overdue = baseDate.getTime() < Date.now();

    const activeDueItem = await prisma.screeningDueItem.findFirst({
      where: {
        screeningPlanId: plan.id,
        completed: false,
      },
      orderBy: { dueDate: "asc" },
    });

    if (activeDueItem) {
      await prisma.screeningDueItem.update({
        where: { id: activeDueItem.id },
        data: {
          dueDate: baseDate,
          eligible,
          recommended: eligible && overdue,
          overdue,
          intervalMonths,
        },
      });
    } else {
      await prisma.screeningDueItem.create({
        data: {
          userId: auth.userId,
          screeningDefinitionId: definition.id,
          screeningPlanId: plan.id,
          dueDate: baseDate,
          eligible,
          recommended: eligible && overdue,
          overdue,
          intervalMonths,
        },
      });
    }
  }

  const planWithRelations = await prisma.screeningPlan.findUniqueOrThrow({
    where: { id: plan.id },
    include: {
      screeningDefinition: true,
      dueItems: {
        orderBy: { dueDate: "asc" },
        take: 5,
      },
    },
  });

  return toPlanResponse(planWithRelations);
};

export const listDueItems = async (
  auth: AuthContext,
  query: {
    status: "all" | "upcoming" | "overdue" | "completed";
    domain?: string;
    screeningCode?: string;
    page: number;
    pageSize: number;
  },
) => {
  await seedScreeningDefinitions();

  const paging = toSkipTake({ page: query.page, pageSize: query.pageSize });
  const normalizedDomain = normalizeDomain(query.domain);

  const statusWhere: Prisma.ScreeningDueItemWhereInput =
    query.status === "completed"
      ? { completed: true }
      : query.status === "overdue"
        ? { completed: false, overdue: true }
        : query.status === "upcoming"
          ? { completed: false, overdue: false }
          : {};

  const resolvedCode = query.screeningCode
    ? normalizeCode(
        LEGACY_NAME_TO_CODE[query.screeningCode] ?? query.screeningCode,
      )
    : undefined;

  const where: Prisma.ScreeningDueItemWhereInput = {
    userId: auth.userId,
    ...statusWhere,
    screeningDefinition: {
      ...(normalizedDomain ? { domain: normalizedDomain } : {}),
      ...(resolvedCode ? { code: resolvedCode } : {}),
    },
  };

  const [items, total] = await Promise.all([
    prisma.screeningDueItem.findMany({
      where,
      include: { screeningDefinition: true },
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
      skip: paging.skip,
      take: paging.take,
    }),
    prisma.screeningDueItem.count({ where }),
  ]);

  return {
    items: items.map(toDueItemResponse),
    pagination: withPagination(
      { page: paging.page, pageSize: paging.pageSize },
      total,
    ),
  };
};

const toSnapshotJsonField = (
  value: unknown,
): Prisma.InputJsonValue | undefined => {
  if (value === undefined || value === null) return undefined;

  const parsed = parseJsonIfString<Prisma.InputJsonValue>(value);
  if (parsed !== null && parsed !== undefined) {
    return parsed;
  }

  return undefined;
};

const formatSnapshotField = (value: unknown) => {
  if (value === undefined || value === null) return null;
  return value;
};

const normalizeOptionalText = (value: unknown) => {
  if (value === undefined || value === null) return null;

  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
};

const normalizeOptionalUrl = (value: unknown) => normalizeOptionalText(value);

const practiceContactWhere = (
  auth: AuthContext,
  input: DeletePracticeContactInput,
) => {
  const screeningName = normalizeOptionalText(input.screeningName);

  if (input.isDefault) {
    return {
      userId: auth.userId,
      isDefault: true,
    };
  }

  return {
    userId: auth.userId,
    isDefault: false,
    screeningName: screeningName ?? "",
  };
};

export const getCancerSnapshot = async (auth: AuthContext) => {
  const snapshot = await prisma.cancerScreeningSnapshot.findUnique({
    where: { userId: auth.userId },
  });

  if (!snapshot) return null;

  const compat = withAppwriteCompat(snapshot);

  return {
    ...compat,
    user: snapshot.userId,
    calculatedScreeningDates: formatSnapshotField(
      snapshot.calculatedScreeningDates,
    ),
    testResults: formatSnapshotField(snapshot.testResults),
  };
};

export const upsertCancerSnapshot = async (
  auth: AuthContext,
  input: SnapshotInput,
) => {
  const gender = toGender(input.gender ?? undefined);

  const snapshot = await prisma.cancerScreeningSnapshot.upsert({
    where: { userId: auth.userId },
    create: {
      userId: auth.userId,
      age: input.age ?? undefined,
      gender,
      calculatedScreeningDates: toSnapshotJsonField(
        input.calculatedScreeningDates,
      ),
      testResults: toSnapshotJsonField(input.testResults),
      lastScreeningDate: toNullableDate(input.lastScreeningDate) ?? undefined,
    },
    update: {
      age: input.age ?? undefined,
      gender,
      calculatedScreeningDates: toSnapshotJsonField(
        input.calculatedScreeningDates,
      ),
      testResults: toSnapshotJsonField(input.testResults),
      lastScreeningDate: toNullableDate(input.lastScreeningDate) ?? undefined,
    },
  });

  const compat = withAppwriteCompat(snapshot);

  return {
    ...compat,
    user: snapshot.userId,
    calculatedScreeningDates: formatSnapshotField(
      snapshot.calculatedScreeningDates,
    ),
    testResults: formatSnapshotField(snapshot.testResults),
  };
};

export const deleteCancerSnapshot = async (auth: AuthContext) => {
  const existing = await prisma.cancerScreeningSnapshot.findUnique({
    where: { userId: auth.userId },
  });

  if (!existing) return null;

  await prisma.cancerScreeningSnapshot.delete({
    where: { userId: auth.userId },
  });
  return withAppwriteCompat(existing);
};

export const getHealthSnapshot = async (auth: AuthContext) => {
  const snapshot = await prisma.healthScreeningSnapshot.findUnique({
    where: { userId: auth.userId },
  });

  if (!snapshot) return null;

  const compat = withAppwriteCompat(snapshot);

  return {
    ...compat,
    user: snapshot.userId,
    checkupDates: formatSnapshotField(snapshot.checkupDates),
    healthResults: formatSnapshotField(snapshot.healthResults),
  };
};

export const upsertHealthSnapshot = async (
  auth: AuthContext,
  input: SnapshotInput,
) => {
  const gender = toGender(input.gender ?? undefined);

  const snapshot = await prisma.healthScreeningSnapshot.upsert({
    where: { userId: auth.userId },
    create: {
      userId: auth.userId,
      age: input.age ?? undefined,
      gender,
      checkupDates: toSnapshotJsonField(input.checkupDates),
      healthResults: toSnapshotJsonField(input.healthResults),
      lastCheckupDate: toNullableDate(input.lastCheckupDate) ?? undefined,
    },
    update: {
      age: input.age ?? undefined,
      gender,
      checkupDates: toSnapshotJsonField(input.checkupDates),
      healthResults: toSnapshotJsonField(input.healthResults),
      lastCheckupDate: toNullableDate(input.lastCheckupDate) ?? undefined,
    },
  });

  const compat = withAppwriteCompat(snapshot);

  return {
    ...compat,
    user: snapshot.userId,
    checkupDates: formatSnapshotField(snapshot.checkupDates),
    healthResults: formatSnapshotField(snapshot.healthResults),
  };
};

export const deleteHealthSnapshot = async (auth: AuthContext) => {
  const existing = await prisma.healthScreeningSnapshot.findUnique({
    where: { userId: auth.userId },
  });

  if (!existing) return null;

  await prisma.healthScreeningSnapshot.delete({
    where: { userId: auth.userId },
  });
  return withAppwriteCompat(existing);
};

export const listPracticeContacts = async (auth: AuthContext) => {
  const contacts = await prisma.screeningPracticeContact.findMany({
    where: { userId: auth.userId },
    orderBy: [
      { isDefault: "desc" },
      { screeningName: "asc" },
      { updatedAt: "desc" },
    ],
  });

  return contacts.map(toPracticeContactResponse);
};

export const upsertPracticeContact = async (
  auth: AuthContext,
  input: UpsertPracticeContactInput,
) => {
  const isDefault = input.isDefault === true;
  const screeningName = normalizeOptionalText(input.screeningName);
  const data = {
    screeningName: isDefault ? null : screeningName,
    isDefault,
    hotdocUrl: normalizeOptionalUrl(input.hotdocUrl),
    practicePhone: normalizeOptionalText(input.practicePhone),
    practiceEmail: normalizeOptionalText(input.practiceEmail),
  };

  const contact = await prisma.$transaction(async (tx) => {
    if (isDefault) {
      const existingDefault = await tx.screeningPracticeContact.findFirst({
        where: {
          userId: auth.userId,
          isDefault: true,
        },
        orderBy: { updatedAt: "desc" },
      });

      await tx.screeningPracticeContact.updateMany({
        where: {
          userId: auth.userId,
          isDefault: true,
          ...(existingDefault ? { NOT: { id: existingDefault.id } } : {}),
        },
        data: { isDefault: false },
      });

      if (existingDefault) {
        return tx.screeningPracticeContact.update({
          where: { id: existingDefault.id },
          data,
        });
      }

      return tx.screeningPracticeContact.create({
        data: {
          userId: auth.userId,
          ...data,
        },
      });
    }

    if (!screeningName) {
      throw new ApiError(
        400,
        "screeningName is required when isDefault is false",
      );
    }

    return tx.screeningPracticeContact.upsert({
      where: {
        userId_screeningName: {
          userId: auth.userId,
          screeningName,
        },
      },
      create: {
        userId: auth.userId,
        ...data,
      },
      update: data,
    });
  });

  return toPracticeContactResponse(contact);
};

export const deletePracticeContact = async (
  auth: AuthContext,
  input: DeletePracticeContactInput,
) => {
  const where = practiceContactWhere(auth, input);
  const contacts = await prisma.screeningPracticeContact.findMany({
    where,
    orderBy: { updatedAt: "desc" },
  });

  if (contacts.length === 0) {
    return null;
  }

  await prisma.screeningPracticeContact.deleteMany({
    where: {
      id: {
        in: contacts.map((contact) => contact.id),
      },
    },
  });

  return toPracticeContactResponse(contacts[0]);
};

const resolveDefinition = async (input: {
  screeningCode?: string;
  screeningDefinitionId?: string;
}) => {
  if (input.screeningDefinitionId) {
    return prisma.screeningDefinition.findUnique({
      where: { id: input.screeningDefinitionId },
    });
  }

  if (input.screeningCode) {
    return findDefinitionByCodeOrName(input.screeningCode);
  }

  return null;
};

export const createScreeningRecord = async (
  auth: AuthContext,
  input: CreateRecordInput,
) => {
  await seedScreeningDefinitions();

  const definition = await resolveDefinition({
    screeningCode: input.screeningCode,
    screeningDefinitionId: input.screeningDefinitionId,
  });

  if (!definition) {
    throw new ApiError(404, "Screening definition not found");
  }

  const dueItem = input.screeningDueItemId
    ? await prisma.screeningDueItem.findFirst({
        where: {
          id: input.screeningDueItemId,
          userId: auth.userId,
          screeningDefinitionId: definition.id,
        },
      })
    : null;

  const measurements = normalizeMeasurements(
    (input.measurements ?? []) as Array<Record<string, unknown>>,
  );
  const flags = normalizeFlags(
    (input.flags ?? []) as Array<Record<string, unknown>>,
  );
  const attachments = normalizeAttachments(
    (input.attachments ?? []) as Array<Record<string, unknown>>,
  );

  const created = await prisma.$transaction(async (tx) => {
    const record = await tx.screeningRecord.create({
      data: {
        userId: auth.userId,
        screeningDefinitionId: definition.id,
        screeningDueItemId: dueItem?.id,
        performedAt: toDate(input.performedAt) as Date,
        wasNormal: input.wasNormal ?? undefined,
        outcomeStatus: normalizeOutcomeStatus(input.outcomeStatus),
        resultSummary: input.resultSummary ?? undefined,
        notes: input.notes ?? undefined,
        source: normalizeRecordSource(input.source),
        enteredByUserId: input.enteredByUserId ?? auth.userId,
        providerName: input.providerName ?? undefined,
        facilityName: input.facilityName ?? undefined,
        legacyPayloadAvailable: input.legacyPayloadAvailable ?? true,
        structuredData: toJsonValue(input.structuredData),
      },
    });

    if (measurements.length > 0) {
      await tx.screeningMeasurement.createMany({
        data: measurements.map((measurement) => ({
          screeningRecordId: record.id,
          ...measurement,
        })),
      });
    }

    if (flags.length > 0) {
      await tx.screeningFlag.createMany({
        data: flags.map((flag) => ({
          screeningRecordId: record.id,
          ...flag,
        })),
      });
    }

    if (attachments.length > 0) {
      await tx.screeningAttachment.createMany({
        data: attachments.map((attachment) => ({
          screeningRecordId: record.id,
          ...attachment,
        })),
      });
    }

    await createDetailTables(tx, record.id, input.details);

    if (input.dueItemCompletion !== false && dueItem && !dueItem.completed) {
      await tx.screeningDueItem.update({
        where: { id: dueItem.id },
        data: {
          completed: true,
          completedAt: toDate(input.performedAt) as Date,
          overdue: false,
        },
      });
    }

    return tx.screeningRecord.findUniqueOrThrow({
      where: { id: record.id },
      include: recordInclude,
    });
  });

  return toRecordResponse(created);
};

export const listScreeningRecords = async (
  auth: AuthContext,
  query: {
    domain?: string;
    screeningCode?: string;
    from?: string;
    to?: string;
    page: number;
    pageSize: number;
  },
) => {
  await seedScreeningDefinitions();

  const paging = toSkipTake({ page: query.page, pageSize: query.pageSize });

  const normalizedDomain = normalizeDomain(query.domain);
  const normalizedCode = query.screeningCode
    ? normalizeCode(
        LEGACY_NAME_TO_CODE[query.screeningCode] ?? query.screeningCode,
      )
    : undefined;

  const where: Prisma.ScreeningRecordWhereInput = {
    userId: auth.userId,
    ...(query.from || query.to
      ? {
          performedAt: {
            ...(query.from ? { gte: toDate(query.from) as Date } : {}),
            ...(query.to ? { lte: toDate(query.to) as Date } : {}),
          },
        }
      : {}),
    screeningDefinition: {
      ...(normalizedDomain ? { domain: normalizedDomain } : {}),
      ...(normalizedCode ? { code: normalizedCode } : {}),
    },
  };

  const [items, total] = await Promise.all([
    prisma.screeningRecord.findMany({
      where,
      include: recordInclude,
      orderBy: [{ performedAt: "desc" }, { createdAt: "desc" }],
      skip: paging.skip,
      take: paging.take,
    }),
    prisma.screeningRecord.count({ where }),
  ]);

  return {
    items: items.map(toRecordResponse),
    pagination: withPagination(
      { page: paging.page, pageSize: paging.pageSize },
      total,
    ),
  };
};

export const getScreeningRecordById = async (
  auth: AuthContext,
  recordId: string,
) => {
  const record = await prisma.screeningRecord.findFirst({
    where: {
      id: recordId,
      userId: auth.userId,
    },
    include: recordInclude,
  });

  return record ? toRecordResponse(record) : null;
};

const inferOutcomeFromLegacyEntry = (
  entry: Record<string, unknown>,
): ScreeningOutcomeStatus => {
  if (typeof entry.wasNormal === "boolean") {
    return entry.wasNormal
      ? ScreeningOutcomeStatus.NORMAL
      : ScreeningOutcomeStatus.ABNORMAL;
  }

  return ScreeningOutcomeStatus.PENDING;
};

const resolveLegacyScreeningCode = (name: string): string | null => {
  if (LEGACY_NAME_TO_CODE[name]) {
    return LEGACY_NAME_TO_CODE[name];
  }

  const match = Object.keys(LEGACY_NAME_TO_CODE).find(
    (key) => key.trim().toLowerCase() === name.trim().toLowerCase(),
  );

  return match ? LEGACY_NAME_TO_CODE[match] : null;
};

const createLegacyHistoryImportRecords = (
  history: Record<string, Array<Record<string, unknown>>>,
  domain: ScreeningDomain,
): Array<CreateRecordInput> => {
  const records: Array<CreateRecordInput> = [];

  for (const [screeningName, entries] of Object.entries(history)) {
    const screeningCode = resolveLegacyScreeningCode(screeningName);
    if (!screeningCode) {
      continue;
    }

    entries.forEach((entry) => {
      const performedAt =
        typeof entry.date === "string" &&
        !Number.isNaN(new Date(entry.date).getTime())
          ? entry.date
          : new Date().toISOString();

      records.push({
        screeningCode,
        performedAt,
        wasNormal:
          typeof entry.wasNormal === "boolean" ? entry.wasNormal : undefined,
        outcomeStatus: inferOutcomeFromLegacyEntry(entry),
        resultSummary: entry.result
          ? String(entry.result)
          : `${screeningName} ${domain.toLowerCase()} history import`,
        notes: entry.notes ? String(entry.notes) : undefined,
        source: RecordSource.MOBILE_IMPORT,
        legacyPayloadAvailable: false,
        structuredData: {
          importedFrom: "legacy_history",
          screeningName,
          domain: domain.toLowerCase(),
          raw: entry,
        },
      });
    });
  }

  return records;
};

export const importHistory = async (
  auth: AuthContext,
  payload: ImportPayload,
) => {
  await seedScreeningDefinitions();

  const rawRecords = Array.isArray(payload.records)
    ? payload.records.map(
        (record) =>
          ({
            screeningCode:
              typeof record.screeningCode === "string"
                ? record.screeningCode
                : typeof record.screeningName === "string"
                  ? (resolveLegacyScreeningCode(String(record.screeningName)) ??
                    undefined)
                  : undefined,
            performedAt:
              typeof record.performedAt === "string"
                ? record.performedAt
                : new Date().toISOString(),
            wasNormal:
              typeof record.wasNormal === "boolean"
                ? record.wasNormal
                : undefined,
            outcomeStatus:
              typeof record.outcomeStatus === "string"
                ? record.outcomeStatus
                : inferOutcomeFromLegacyEntry(record),
            resultSummary:
              typeof record.resultSummary === "string"
                ? record.resultSummary
                : typeof record.screeningName === "string"
                  ? `${record.screeningName} imported`
                  : "Imported record",
            notes: typeof record.notes === "string" ? record.notes : undefined,
            source: RecordSource.MOBILE_IMPORT,
            legacyPayloadAvailable: false,
            structuredData: ensureObject(record.structuredData),
            measurements: ensureArray(record.measurements),
            flags: ensureArray(record.flags),
            details: ensureObject<RecordDetailsInput>(record.details),
          }) satisfies CreateRecordInput,
      )
    : [];

  const legacyCancerRecords = payload.cancerHistory
    ? createLegacyHistoryImportRecords(
        payload.cancerHistory,
        ScreeningDomain.CANCER,
      )
    : [];

  const legacyHealthRecords = payload.healthHistory
    ? createLegacyHistoryImportRecords(
        payload.healthHistory,
        ScreeningDomain.HEALTH,
      )
    : [];

  const allRecords = [
    ...rawRecords,
    ...legacyCancerRecords,
    ...legacyHealthRecords,
  ].filter((record) => !!record.screeningCode);

  const batch = await prisma.screeningImportBatch.create({
    data: {
      userId: auth.userId,
      source: normalizeImportSource(payload.source),
      status: ImportStatus.RUNNING,
      recordsAttempted: allRecords.length,
      recordsImported: 0,
      errorCount: 0,
    },
  });

  let imported = 0;
  let errors = 0;
  const errorMessages: Array<{ index: number; message: string }> = [];

  for (let i = 0; i < allRecords.length; i += 1) {
    const record = allRecords[i];

    try {
      await createScreeningRecord(auth, {
        ...record,
        source: RecordSource.MOBILE_IMPORT,
      });
      imported += 1;
    } catch (error) {
      errors += 1;
      errorMessages.push({
        index: i,
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  await prisma.screeningImportBatch.update({
    where: { id: batch.id },
    data: {
      status: errors > 0 ? ImportStatus.FAILED : ImportStatus.COMPLETED,
      recordsImported: imported,
      errorCount: errors,
      finishedAt: new Date(),
    },
  });

  return {
    batchId: batch.id,
    attempted: allRecords.length,
    imported,
    errors,
    errorMessages,
  };
};
