import {
  AdministrationSite,
  GenderEligibility,
  Prisma,
  RecordSource,
  ScreeningDomain,
  ScreeningOutcomeStatus,
  VaccineType,
} from "@prisma/client";
import { prisma } from "../../db/prisma";
import { ApiError } from "../../middlewares/error-handler";
import { AuthContext } from "../../types/auth";
import { withAppwriteCompat } from "../../utils/compat";
import { addDays, toDate } from "../../utils/date";
import { parseJsonIfString } from "../../utils/json";
import { toSkipTake, withPagination } from "../../utils/pagination";

interface ListImmunisationsQuery {
  page: number;
  pageSize: number;
}

interface UpcomingImmunisationsQuery extends ListImmunisationsQuery {
  daysAhead: number;
}

interface CreateImmunisationInput {
  wasNormal?: boolean | null;
  outcomeStatus?: string;
  resultSummary?: string | null;
  notes?: string | null;
  source?: string;
  providerName?: string | null;
  facilityName?: string | null;
  structuredData?: unknown;
  vaccineName: string;
  vaccineType: string;
  brand?: string | null;
  batchNumber?: string | null;
  doseNumber: number;
  totalDoses: number;
  administrationSite: string;
  clinic?: string | null;
  location?: string | null;
  nextDueDate?: string | null;
  sideEffectsNone?: boolean;
  sideEffectsMild?: boolean;
  sideEffectsModerate?: boolean;
  sideEffectsSevere?: boolean;
  sideEffectsDescription?: string | null;
  isTravel?: boolean;
  travelDestination?: string | null;
  departureDate?: string | null;
}

interface UpdateImmunisationInput {
  wasNormal?: boolean | null;
  outcomeStatus?: string;
  resultSummary?: string | null;
  notes?: string | null;
  source?: string;
  providerName?: string | null;
  facilityName?: string | null;
  structuredData?: unknown;
  vaccineName?: string;
  vaccineType?: string;
  brand?: string | null;
  batchNumber?: string | null;
  doseNumber?: number;
  totalDoses?: number;
  administrationSite?: string;
  clinic?: string | null;
  location?: string | null;
  nextDueDate?: string | null;
  sideEffectsNone?: boolean;
  sideEffectsMild?: boolean;
  sideEffectsModerate?: boolean;
  sideEffectsSevere?: boolean;
  sideEffectsDescription?: string | null;
  isTravel?: boolean;
  travelDestination?: string | null;
  departureDate?: string | null;
}

const IMMUNISATION_CODE = "IMMUNISATION";
const IMMUNISATION_NAME = "Immunisation";

type ImmunisationRecord = Prisma.ScreeningRecordGetPayload<{
  include: {
    screeningDefinition: true;
    immunisationDetail: true;
  };
}>;

type ImmunisationDetailWithRecord = Prisma.ImmunisationDetailGetPayload<{
  include: {
    screeningRecord: {
      include: {
        screeningDefinition: true;
      };
    };
  };
}>;

const normalizeUpper = (value: string) =>
  value
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");

const normalizeOutcomeStatus = (value?: string): ScreeningOutcomeStatus => {
  if (!value) return ScreeningOutcomeStatus.PENDING;
  const normalized = normalizeUpper(value);

  if (normalized === ScreeningOutcomeStatus.NORMAL)
    return ScreeningOutcomeStatus.NORMAL;
  if (normalized === ScreeningOutcomeStatus.ABNORMAL)
    return ScreeningOutcomeStatus.ABNORMAL;
  if (normalized === ScreeningOutcomeStatus.INCONCLUSIVE) {
    return ScreeningOutcomeStatus.INCONCLUSIVE;
  }
  if (normalized === ScreeningOutcomeStatus.NOT_DONE)
    return ScreeningOutcomeStatus.NOT_DONE;
  return ScreeningOutcomeStatus.PENDING;
};

const normalizeRecordSource = (value?: string): RecordSource => {
  if (!value) return RecordSource.MOBILE_FORM;
  const normalized = normalizeUpper(value);

  if (normalized === RecordSource.MOBILE_IMPORT)
    return RecordSource.MOBILE_IMPORT;
  if (normalized === RecordSource.CLINICIAN) return RecordSource.CLINICIAN;
  if (normalized === RecordSource.MIGRATION) return RecordSource.MIGRATION;
  return RecordSource.MOBILE_FORM;
};

const normalizeVaccineType = (value: string): VaccineType => {
  const normalized = normalizeUpper(value);

  if (normalized === VaccineType.TRAVEL) return VaccineType.TRAVEL;
  if (normalized === VaccineType.OCCUPATIONAL) return VaccineType.OCCUPATIONAL;
  if (normalized === VaccineType.CATCH_UP) return VaccineType.CATCH_UP;
  if (normalized === VaccineType.BOOSTER) return VaccineType.BOOSTER;
  return VaccineType.ROUTINE;
};

const normalizeAdministrationSite = (value: string): AdministrationSite => {
  const normalized = normalizeUpper(value);

  if (normalized === AdministrationSite.RIGHT_ARM)
    return AdministrationSite.RIGHT_ARM;
  if (normalized === AdministrationSite.LEFT_THIGH)
    return AdministrationSite.LEFT_THIGH;
  if (normalized === AdministrationSite.RIGHT_THIGH)
    return AdministrationSite.RIGHT_THIGH;
  if (normalized === AdministrationSite.ORAL) return AdministrationSite.ORAL;
  if (normalized === AdministrationSite.NASAL) return AdministrationSite.NASAL;
  return AdministrationSite.LEFT_ARM;
};

const toNullableDate = (
  value: string | null | undefined,
): Date | null | undefined => {
  if (value === undefined) return undefined;
  return (toDate(value) as Date | null) ?? null;
};

const toNullableString = (
  value: string | null | undefined,
): string | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return value;
};

const toStructuredJson = (
  value: unknown,
): Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined => {
  if (value === undefined) return undefined;
  if (value === null) return Prisma.JsonNull;

  const parsed = parseJsonIfString<Prisma.InputJsonValue>(value);
  return parsed ?? Prisma.JsonNull;
};

const isDueSoon = (nextDueDate: Date | null, daysAhead: number) => {
  if (!nextDueDate) return false;

  const now = new Date();
  const soonCutoff = addDays(now, daysAhead);
  const dueMs = nextDueDate.getTime();

  return dueMs >= now.getTime() && dueMs <= soonCutoff.getTime();
};

const derivePersistedFlags = (nextDueDate: Date | null, daysAhead = 30) => {
  if (!nextDueDate) {
    return {
      isOverdue: false,
      isDueSoon: false,
    };
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const dueTime = nextDueDate.getTime();
  const cutoff = addDays(todayStart, daysAhead).getTime();

  return {
    isOverdue: dueTime < todayStart.getTime(),
    isDueSoon: dueTime >= todayStart.getTime() && dueTime <= cutoff,
  };
};

const assertTravelRequirements = (
  isTravel: boolean | undefined,
  destination: string | null | undefined,
  departureDate: string | null | undefined,
) => {
  if (!isTravel) return;

  if (!destination || !departureDate) {
    throw new ApiError(
      400,
      "Travel destination and departure date are required for travel vaccines.",
    );
  }
};

const toImmunisationDetailResponse = (
  detail: Prisma.ImmunisationDetailGetPayload<Record<string, never>>,
) => ({
  ...detail,
  id: detail.screeningRecordId,
  $id: detail.screeningRecordId,
});

const toImmunisationResponse = (record: ImmunisationRecord, daysAhead = 30) => {
  const detail = record.immunisationDetail;

  return {
    ...withAppwriteCompat(record),
    screeningCode: record.screeningDefinition.code,
    domain: record.screeningDefinition.domain.toLowerCase(),
    immunisation: detail ? toImmunisationDetailResponse(detail) : null,
    isOverdue: detail ? detail.isOverdue : false,
    isDueSoon: detail ? detail.isDueSoon : false,
    isDueSoonInWindow: detail
      ? isDueSoon(detail.nextDueDate, daysAhead)
      : false,
  };
};

const toImmunisationFromDetail = (
  detail: ImmunisationDetailWithRecord,
  daysAhead: number,
) => ({
  ...withAppwriteCompat(detail.screeningRecord),
  screeningCode: detail.screeningRecord.screeningDefinition.code,
  domain: detail.screeningRecord.screeningDefinition.domain.toLowerCase(),
  immunisation: toImmunisationDetailResponse(detail),
  isOverdue: detail.isOverdue,
  isDueSoon: detail.isDueSoon,
  isDueSoonInWindow: isDueSoon(detail.nextDueDate, daysAhead),
});

const getImmunisationRecord = async (auth: AuthContext, id: string) =>
  prisma.screeningRecord.findFirst({
    where: {
      id,
      userId: auth.userId,
      immunisationDetail: {
        isNot: null,
      },
    },
    include: {
      screeningDefinition: true,
      immunisationDetail: true,
    },
  });

const ensureImmunisationDefinition = async () =>
  prisma.screeningDefinition.upsert({
    where: { code: IMMUNISATION_CODE },
    create: {
      code: IMMUNISATION_CODE,
      displayName: IMMUNISATION_NAME,
      domain: ScreeningDomain.IMMUNISATION,
      defaultIntervalMonths: 12,
      minEligibleAge: 0,
      maxEligibleAge: 120,
      genderEligibility: GenderEligibility.ALL,
      isActive: true,
      guidelineVersion: "v1",
    },
    update: {
      displayName: IMMUNISATION_NAME,
      domain: ScreeningDomain.IMMUNISATION,
      genderEligibility: GenderEligibility.ALL,
      isActive: true,
    },
  });

export const createImmunisation = async (
  auth: AuthContext,
  input: CreateImmunisationInput,
) => {
  const definition = await ensureImmunisationDefinition();
  const performedAt = new Date();
  const doseNumber = input.doseNumber;
  const totalDoses = input.totalDoses;

  if (doseNumber < 1) {
    throw new ApiError(400, "doseNumber must be greater than or equal to 1");
  }

  if (totalDoses < doseNumber) {
    throw new ApiError(
      400,
      "totalDoses must be greater than or equal to doseNumber",
    );
  }

  assertTravelRequirements(
    input.isTravel,
    input.travelDestination,
    input.departureDate,
  );

  let nextDueDate = toNullableDate(input.nextDueDate);
  if (doseNumber < totalDoses) {
    if (!nextDueDate) {
      throw new ApiError(
        400,
        "Next due date is required when the dose series is not complete.",
      );
    }

    if (nextDueDate.getTime() < performedAt.getTime()) {
      throw new ApiError(
        400,
        "Next due date must be on or after the vaccination date.",
      );
    }
  } else {
    nextDueDate = null;
  }

  const derivedFlags = derivePersistedFlags(nextDueDate);
  const seriesCompleted = doseNumber >= totalDoses;

  const record = await prisma.screeningRecord.create({
    data: {
      userId: auth.userId,
      screeningDefinitionId: definition.id,
      performedAt,
      wasNormal: input.wasNormal,
      outcomeStatus: normalizeOutcomeStatus(input.outcomeStatus),
      resultSummary: toNullableString(input.resultSummary),
      notes: toNullableString(input.notes),
      source: normalizeRecordSource(input.source),
      providerName: toNullableString(input.providerName),
      facilityName: toNullableString(input.facilityName),
      structuredData: toStructuredJson(input.structuredData),
      legacyPayloadAvailable: false,
      immunisationDetail: {
        create: {
          vaccineName: input.vaccineName,
          vaccineType: normalizeVaccineType(input.vaccineType),
          brand: toNullableString(input.brand),
          batchNumber: toNullableString(input.batchNumber),
          doseNumber: input.doseNumber,
          totalDoses: input.totalDoses,
          administrationSite: normalizeAdministrationSite(
            input.administrationSite,
          ),
          providerName: toNullableString(input.providerName),
          clinic: toNullableString(input.clinic),
          location: toNullableString(input.location),
          nextDueDate,
          isOverdue: derivedFlags.isOverdue,
          isDueSoon: derivedFlags.isDueSoon,
          seriesCompleted,
          seriesCompletedAt: seriesCompleted ? performedAt : null,
          sideEffectsNone: input.sideEffectsNone ?? true,
          sideEffectsMild: input.sideEffectsMild ?? false,
          sideEffectsModerate: input.sideEffectsModerate ?? false,
          sideEffectsSevere: input.sideEffectsSevere ?? false,
          sideEffectsDescription: toNullableString(
            input.sideEffectsDescription,
          ),
          isTravel: input.isTravel ?? false,
          travelDestination: toNullableString(input.travelDestination),
          departureDate: toNullableDate(input.departureDate),
          notes: toNullableString(input.notes),
        },
      },
    },
    include: {
      screeningDefinition: true,
      immunisationDetail: true,
    },
  });

  return toImmunisationResponse(record);
};

export const listImmunisations = async (
  auth: AuthContext,
  query: ListImmunisationsQuery,
) => {
  const { page, pageSize, skip, take } = toSkipTake(query);

  const where: Prisma.ScreeningRecordWhereInput = {
    userId: auth.userId,
    immunisationDetail: {
      isNot: null,
    },
    screeningDefinition: {
      domain: ScreeningDomain.IMMUNISATION,
    },
  };

  const [items, total] = await Promise.all([
    prisma.screeningRecord.findMany({
      where,
      include: {
        screeningDefinition: true,
        immunisationDetail: true,
      },
      orderBy: [{ performedAt: "desc" }, { createdAt: "desc" }],
      skip,
      take,
    }),
    prisma.screeningRecord.count({ where }),
  ]);

  return {
    items: items.map((item) => toImmunisationResponse(item)),
    pagination: withPagination({ page, pageSize }, total),
  };
};

export const getImmunisationById = async (auth: AuthContext, id: string) => {
  const record = await getImmunisationRecord(auth, id);
  return record ? toImmunisationResponse(record) : null;
};

export const patchImmunisationById = async (
  auth: AuthContext,
  id: string,
  input: UpdateImmunisationInput,
) => {
  const existing = await getImmunisationRecord(auth, id);
  if (!existing || !existing.immunisationDetail) return null;
  const current = existing.immunisationDetail;

  const requestedDoseNumber = input.doseNumber ?? current.doseNumber;
  const requestedTotalDoses = input.totalDoses ?? current.totalDoses;
  if (requestedDoseNumber < 1) {
    throw new ApiError(400, "doseNumber must be greater than or equal to 1");
  }
  if (requestedTotalDoses < requestedDoseNumber) {
    throw new ApiError(
      400,
      "totalDoses must be greater than or equal to doseNumber",
    );
  }

  const performedAt = existing.performedAt as Date;
  const resolvedNextDueDateInput =
    input.nextDueDate !== undefined
      ? input.nextDueDate
      : current.nextDueDate
        ? current.nextDueDate.toISOString()
        : null;
  let resolvedNextDueDate = toNullableDate(resolvedNextDueDateInput) ?? null;

  if (requestedDoseNumber < requestedTotalDoses) {
    if (!resolvedNextDueDate) {
      throw new ApiError(
        400,
        "Next due date is required when the dose series is not complete.",
      );
    }

    if (resolvedNextDueDate.getTime() < performedAt.getTime()) {
      throw new ApiError(
        400,
        "Next due date must be on or after the vaccination date.",
      );
    }
  } else {
    resolvedNextDueDate = null;
  }

  const resolvedIsTravel = input.isTravel ?? current.isTravel;
  const resolvedTravelDestination =
    input.travelDestination !== undefined
      ? input.travelDestination
      : current.travelDestination;
  const resolvedDepartureDate =
    input.departureDate !== undefined
      ? input.departureDate
      : current.departureDate
        ? current.departureDate.toISOString()
        : null;

  assertTravelRequirements(
    resolvedIsTravel,
    resolvedTravelDestination,
    resolvedDepartureDate,
  );

  const derivedFlags = derivePersistedFlags(resolvedNextDueDate);
  const seriesCompleted = requestedDoseNumber >= requestedTotalDoses;
  const seriesCompletedAt = seriesCompleted
    ? (current.seriesCompletedAt ?? new Date())
    : null;

  const recordData: Prisma.ScreeningRecordUpdateInput = {
    wasNormal: input.wasNormal,
    outcomeStatus:
      input.outcomeStatus !== undefined
        ? normalizeOutcomeStatus(input.outcomeStatus)
        : undefined,
    resultSummary: toNullableString(input.resultSummary),
    notes: toNullableString(input.notes),
    source:
      input.source !== undefined
        ? normalizeRecordSource(input.source)
        : undefined,
    providerName: toNullableString(input.providerName),
    facilityName: toNullableString(input.facilityName),
    structuredData: toStructuredJson(input.structuredData),
  };

  const detailData: Prisma.ImmunisationDetailUpdateInput = {
    vaccineName: input.vaccineName,
    vaccineType:
      input.vaccineType !== undefined
        ? normalizeVaccineType(input.vaccineType)
        : undefined,
    brand: toNullableString(input.brand),
    batchNumber: toNullableString(input.batchNumber),
    doseNumber: requestedDoseNumber,
    totalDoses: requestedTotalDoses,
    administrationSite:
      input.administrationSite !== undefined
        ? normalizeAdministrationSite(input.administrationSite)
        : undefined,
    providerName: toNullableString(input.providerName),
    clinic: toNullableString(input.clinic),
    location: toNullableString(input.location),
    nextDueDate: resolvedNextDueDate,
    isOverdue: derivedFlags.isOverdue,
    isDueSoon: derivedFlags.isDueSoon,
    seriesCompleted,
    seriesCompletedAt,
    sideEffectsNone: input.sideEffectsNone,
    sideEffectsMild: input.sideEffectsMild,
    sideEffectsModerate: input.sideEffectsModerate,
    sideEffectsSevere: input.sideEffectsSevere,
    sideEffectsDescription: toNullableString(input.sideEffectsDescription),
    isTravel: input.isTravel,
    travelDestination: toNullableString(input.travelDestination),
    departureDate: toNullableDate(input.departureDate),
    notes: toNullableString(input.notes),
  };

  await prisma.$transaction([
    prisma.screeningRecord.update({
      where: { id },
      data: recordData,
    }),
    prisma.immunisationDetail.update({
      where: { screeningRecordId: id },
      data: detailData,
    }),
  ]);

  const refreshed = await getImmunisationRecord(auth, id);
  return refreshed ? toImmunisationResponse(refreshed) : null;
};

export const deleteImmunisationById = async (auth: AuthContext, id: string) => {
  const existing = await getImmunisationRecord(auth, id);
  if (!existing) return null;

  await prisma.screeningRecord.delete({ where: { id } });
  return toImmunisationResponse(existing);
};

export const listUpcomingImmunisations = async (
  auth: AuthContext,
  query: UpcomingImmunisationsQuery,
) => {
  const { page, pageSize, skip, take } = toSkipTake(query);
  const soonCutoff = addDays(new Date(), query.daysAhead);

  const where: Prisma.ImmunisationDetailWhereInput = {
    screeningRecord: {
      userId: auth.userId,
      screeningDefinition: {
        domain: ScreeningDomain.IMMUNISATION,
      },
    },
    nextDueDate: {
      not: null,
      lte: soonCutoff,
    },
  };

  const [items, total, overdueCount] = await Promise.all([
    prisma.immunisationDetail.findMany({
      where,
      include: {
        screeningRecord: {
          include: {
            screeningDefinition: true,
          },
        },
      },
      orderBy: [
        { nextDueDate: "asc" },
        { screeningRecord: { performedAt: "desc" } },
      ],
      skip,
      take,
    }),
    prisma.immunisationDetail.count({ where }),
    prisma.immunisationDetail.count({
      where: {
        ...where,
        nextDueDate: {
          not: null,
          lt: new Date(),
        },
      },
    }),
  ]);

  return {
    items: items.map((item) => toImmunisationFromDetail(item, query.daysAhead)),
    pagination: withPagination({ page, pageSize }, total),
    meta: {
      daysAhead: query.daysAhead,
      overdueCount,
      dueSoonCount: Math.max(0, total - overdueCount),
    },
  };
};

export const getImmunisationSummary = async (
  auth: AuthContext,
  daysAhead: number,
) => {
  const now = new Date();
  const soonCutoff = addDays(now, daysAhead);

  const baseWhere: Prisma.ImmunisationDetailWhereInput = {
    screeningRecord: {
      userId: auth.userId,
      screeningDefinition: {
        domain: ScreeningDomain.IMMUNISATION,
      },
    },
  };

  const [total, overdue, dueSoon, noDueDate, travel, completedDoseCandidate] =
    await Promise.all([
      prisma.immunisationDetail.count({ where: baseWhere }),
      prisma.immunisationDetail.count({
        where: {
          ...baseWhere,
          nextDueDate: {
            not: null,
            lt: now,
          },
        },
      }),
      prisma.immunisationDetail.count({
        where: {
          ...baseWhere,
          nextDueDate: {
            not: null,
            gte: now,
            lte: soonCutoff,
          },
        },
      }),
      prisma.immunisationDetail.count({
        where: {
          ...baseWhere,
          nextDueDate: null,
        },
      }),
      prisma.immunisationDetail.count({
        where: {
          ...baseWhere,
          isTravel: true,
        },
      }),
      prisma.immunisationDetail.findMany({
        where: baseWhere,
        select: {
          doseNumber: true,
          totalDoses: true,
        },
      }),
    ]);

  const completeDoses = completedDoseCandidate.filter(
    (item) => item.doseNumber >= item.totalDoses,
  ).length;

  return {
    total,
    overdue,
    dueSoon,
    upcoming: overdue + dueSoon,
    noDueDate,
    travel,
    completedDoseSeries: completeDoses,
    daysAhead,
  };
};
