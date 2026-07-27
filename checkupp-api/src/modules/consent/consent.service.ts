import { ConsentStatus, Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { ApiError } from "../../middlewares/error-handler";
import { AuthContext } from "../../types/auth";
import { toDate } from "../../utils/date";
import { toSkipTake, withPagination } from "../../utils/pagination";
import {
  consentScopeDomainValues,
  type ConsentScopeInput,
  normalizeConsentScopeForStorage,
  parseConsentScope,
} from "./consent.scope";

interface ListConsentRequestsInput {
  page: number;
  pageSize: number;
  status?: ConsentStatus;
}

interface ApproveConsentRequestInput {
  scope?: ConsentScopeInput | null;
  expiresAt?: string | null;
  responseReason?: string | null;
}

interface DeclineConsentRequestInput {
  reason?: string | null;
}

const toNullOrDate = (value?: string | null): Date | null | undefined => {
  if (value === undefined) return undefined;
  return (toDate(value) as Date | null) ?? null;
};

const toEffectiveConsent = <
  T extends {
    status: ConsentStatus;
    expiresAt: Date | null;
  },
>(
  consent: T,
) => {
  if (
    consent.status === ConsentStatus.ACTIVE &&
    consent.expiresAt &&
    consent.expiresAt.getTime() <= Date.now()
  ) {
    return {
      ...consent,
      status: ConsentStatus.EXPIRED,
    };
  }

  return consent;
};

export const listMyConsentRequests = async (
  auth: AuthContext,
  query: ListConsentRequestsInput,
) => {
  const paging = toSkipTake({ page: query.page, pageSize: query.pageSize });
  const status = query.status ?? ConsentStatus.REQUESTED;

  const where: Prisma.ConsentGrantWhereInput = {
    patientId: auth.userId,
    status,
  };

  const [items, total] = await Promise.all([
    prisma.consentGrant.findMany({
      where,
      include: {
        clinician: {
          include: {
            user: true,
            organization: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: paging.skip,
      take: paging.take,
    }),
    prisma.consentGrant.count({ where }),
  ]);

  return {
    items: items.map((item) => toEffectiveConsent(item)),
    pagination: withPagination({ page: paging.page, pageSize: paging.pageSize }, total),
  };
};

const getDefaultScopeInput = (): ConsentScopeInput => ({
  accessLevel: "READ_ONLY",
  domains: [...consentScopeDomainValues],
  includeHistory: true,
});

export const approveConsentRequest = async (
  auth: AuthContext,
  consentId: string,
  input: ApproveConsentRequestInput,
) => {
  const existing = await prisma.consentGrant.findFirst({
    where: {
      id: consentId,
      patientId: auth.userId,
      status: ConsentStatus.REQUESTED,
    },
  });

  if (!existing) {
    throw new ApiError(404, "Consent request not found");
  }

  const requestedScope = parseConsentScope(existing.requestedScope as Prisma.JsonValue | null);
  const fallbackScope: ConsentScopeInput = requestedScope
    ? {
        accessLevel: requestedScope.accessLevel,
        domains: requestedScope.domains,
        includeHistory: requestedScope.includeHistory,
        note: requestedScope.note ?? null,
      }
    : getDefaultScopeInput();

  const normalizedApprovedScope = normalizeConsentScopeForStorage(
    input.scope ?? fallbackScope,
  );

  if (!normalizedApprovedScope || normalizedApprovedScope === Prisma.JsonNull) {
    throw new ApiError(400, "At least one scope domain is required to approve consent");
  }

  const expiresAt = toNullOrDate(input.expiresAt) ?? existing.expiresAt;

  return prisma.$transaction(async (tx) => {
    await tx.consentGrant.updateMany({
      where: {
        patientId: existing.patientId,
        clinicianId: existing.clinicianId,
        status: ConsentStatus.ACTIVE,
        id: { not: existing.id },
      },
      data: {
        status: ConsentStatus.REVOKED,
        revokedAt: new Date(),
        respondedAt: new Date(),
        responseReason: "Superseded by newer consent approval",
      },
    });

    return tx.consentGrant.update({
      where: { id: existing.id },
      data: {
        status: ConsentStatus.ACTIVE,
        scope: normalizedApprovedScope,
        grantedAt: new Date(),
        respondedAt: new Date(),
        responseReason: input.responseReason?.trim() || null,
        expiresAt,
      },
    });
  });
};

export const declineConsentRequest = async (
  auth: AuthContext,
  consentId: string,
  input: DeclineConsentRequestInput = {},
) => {
  const existing = await prisma.consentGrant.findFirst({
    where: {
      id: consentId,
      patientId: auth.userId,
      status: ConsentStatus.REQUESTED,
    },
  });

  if (!existing) {
    throw new ApiError(404, "Consent request not found");
  }

  return prisma.consentGrant.update({
    where: { id: existing.id },
    data: {
      status: ConsentStatus.DECLINED,
      respondedAt: new Date(),
      responseReason: input.reason?.trim() || null,
    },
  });
};

export const revokeActiveConsentAsPatient = async (
  auth: AuthContext,
  consentId: string,
  input: DeclineConsentRequestInput = {},
) => {
  const existing = await prisma.consentGrant.findFirst({
    where: {
      id: consentId,
      patientId: auth.userId,
      status: ConsentStatus.ACTIVE,
    },
  });

  if (!existing) {
    throw new ApiError(404, "Active consent not found");
  }

  return prisma.consentGrant.update({
    where: { id: existing.id },
    data: {
      status: ConsentStatus.REVOKED,
      revokedAt: new Date(),
      respondedAt: new Date(),
      responseReason: input.reason?.trim() || null,
    },
  });
};

