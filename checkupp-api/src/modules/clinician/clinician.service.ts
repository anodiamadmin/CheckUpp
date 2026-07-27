import { ConsentStatus, Prisma, UserRole } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { ApiError } from "../../middlewares/error-handler";
import { AuthContext } from "../../types/auth";
import { toDate } from "../../utils/date";
import { toSkipTake, withPagination } from "../../utils/pagination";
import {
  type ConsentScopeInput,
  hasConsentDomain,
  normalizeConsentScopeForStorage,
  parseConsentScope,
} from "../consent/consent.scope";

interface UpsertClinicianProfileInput {
  organizationId?: string | null;
  licenseNumber?: string | null;
  specialty?: string | null;
  isActive?: boolean;
}

interface ListPatientsInput {
  page: number;
  pageSize: number;
  search?: string;
  includeInactive?: boolean;
}

interface RequestConsentInput {
  scope?: ConsentScopeInput | null;
  expiresAt?: string | null;
  requestMessage?: string | null;
}

interface RevokeConsentInput {
  reason?: string | null;
}

interface TimelineLimits {
  screeningLimit: number;
  dueItemLimit: number;
  documentLimit: number;
  feedbackLimit: number;
}

interface WorklistInput extends ListPatientsInput {
  view?: string;
  consentStatus?: string;
  attention?: string;
  sortBy?: string;
  sortDir?: "asc" | "desc";
}

interface SavedViewInput {
  name: string;
  viewType?: string;
  filters: Prisma.InputJsonValue;
  columns?: Prisma.InputJsonValue | null;
  sort?: Prisma.InputJsonValue | null;
  isDefault?: boolean;
}

interface CreateTaskInput {
  patientId: string;
  title: string;
  description?: string | null;
  category?: string | null;
  priority?: string | null;
  dueAt?: string | null;
  assignedToUserId?: string | null;
}

interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  category?: string | null;
  priority?: string | null;
  status?: string;
  dueAt?: string | null;
  assignedToUserId?: string | null;
}

interface SendMessageInput {
  patientId: string;
  body: string;
  channel?: string | null;
}

interface CreateReminderInput {
  patientId: string;
  title: string;
  description?: string | null;
  dueAt?: string | null;
  recurrence?: string | null;
}

interface UpdateReminderInput {
  title?: string;
  description?: string | null;
  dueAt?: string | null;
  recurrence?: string | null;
  status?: string;
}

interface ReviewDocumentInput {
  walletDocumentId: string;
  status: string;
  note?: string | null;
}

interface CreateCohortInput {
  name: string;
  description?: string | null;
  filters?: Prisma.InputJsonValue | null;
  patientIds?: string[];
}

const toNullOrDate = (value?: string | null): Date | null | undefined => {
  if (value === undefined) return undefined;
  return (toDate(value) as Date | null) ?? null;
};

const compactText = (value?: string | null) => {
  if (value === undefined) return undefined;
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

const patientSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  avatarUrl: true,
  phoneNumber: true,
  gender: true,
  dob: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

const isOpenTaskStatus = (status: string) =>
  !["DONE", "COMPLETED", "CANCELLED", "ARCHIVED"].includes(status.toUpperCase());

const toEffectiveConsent = <
  T extends {
    status: ConsentStatus;
    expiresAt: Date | null;
  },
>(
  consent: T | null,
) => {
  if (!consent) return null;
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

const ensureClinicianProfile = async (auth: AuthContext) => {
  const profile = await prisma.clinicianProfile.findUnique({
    where: { userId: auth.userId },
  });

  if (profile) return profile;

  if (auth.role === UserRole.ADMIN) {
    return prisma.clinicianProfile.create({
      data: {
        userId: auth.userId,
        isActive: true,
      },
    });
  }

  throw new ApiError(404, "Clinician profile not found");
};

const ensurePatient = async (patientId: string) => {
  const patient = await prisma.user.findFirst({
    where: {
      id: patientId,
      isDeleted: false,
    },
  });

  if (!patient) {
    throw new ApiError(404, "Patient not found");
  }

  return patient;
};

const ensurePatientByEmail = async (patientEmail: string) => {
  const email = patientEmail.trim().toLowerCase();

  const patient = await prisma.user.findFirst({
    where: {
      email: {
        equals: email,
        mode: "insensitive",
      },
      role: UserRole.PATIENT,
      isDeleted: false,
    },
  });

  if (!patient) {
    throw new ApiError(404, "Patient not found");
  }

  return patient;
};

const ensureActivePatientLink = async (
  clinicianId: string,
  patientId: string,
) => {
  const link = await prisma.patientLink.findFirst({
    where: {
      clinicianId,
      patientId,
      isActive: true,
    },
  });

  if (!link) {
    throw new ApiError(
      403,
      "Active patient relationship is required before requesting consent",
    );
  }

  return link;
};

const ensurePatientAccess = async (auth: AuthContext, patientId: string) => {
  const patient = await ensurePatient(patientId);

  if (auth.role === UserRole.ADMIN) {
    return {
      patient,
      clinicianProfile: null,
      link: null,
      consent: null,
    };
  }

  const clinicianProfile = await ensureClinicianProfile(auth);

  const [link, consent] = await Promise.all([
    prisma.patientLink.findFirst({
      where: {
        clinicianId: clinicianProfile.id,
        patientId,
        isActive: true,
      },
    }),
    prisma.consentGrant.findFirst({
      where: {
        clinicianId: clinicianProfile.id,
        patientId,
        status: ConsentStatus.ACTIVE,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  if (!link || !consent) {
    throw new ApiError(403, "No active patient relationship/consent");
  }

  return {
    patient,
    clinicianProfile,
    link,
    consent,
  };
};

const ensureClinicianPatientAccess = async (
  auth: AuthContext,
  patientId: string,
  requireConsent = true,
) => {
  const access = await ensurePatientAccess(auth, patientId);
  if (!requireConsent) return access;
  return access;
};

const ensureTaskAccess = async (auth: AuthContext, taskId: string) => {
  const task = await prisma.careTask.findUnique({
    where: { id: taskId },
    include: { clinician: true },
  });

  if (!task) throw new ApiError(404, "Care task not found");
  if (auth.role === UserRole.ADMIN) return task;

  const clinicianProfile = await ensureClinicianProfile(auth);
  if (task.clinicianId !== clinicianProfile.id) {
    throw new ApiError(403, "Care task access denied");
  }

  return task;
};

const ensureReminderAccess = async (auth: AuthContext, reminderId: string) => {
  const reminder = await prisma.patientReminderRequest.findUnique({
    where: { id: reminderId },
  });

  if (!reminder) throw new ApiError(404, "Reminder request not found");
  if (auth.role === UserRole.ADMIN) return reminder;

  const clinicianProfile = await ensureClinicianProfile(auth);
  if (reminder.clinicianId !== clinicianProfile.id) {
    throw new ApiError(403, "Reminder request access denied");
  }

  return reminder;
};

export const getClinicianProfile = async (auth: AuthContext) => {
  return prisma.clinicianProfile.findUnique({
    where: { userId: auth.userId },
    include: {
      user: true,
      organization: true,
    },
  });
};

export const upsertClinicianProfile = async (
  auth: AuthContext,
  input: UpsertClinicianProfileInput,
) => {
  return prisma.clinicianProfile.upsert({
    where: { userId: auth.userId },
    create: {
      userId: auth.userId,
      organizationId: input.organizationId ?? undefined,
      licenseNumber: input.licenseNumber ?? undefined,
      specialty: input.specialty ?? undefined,
      isActive: input.isActive ?? true,
    },
    update: {
      organizationId: input.organizationId ?? undefined,
      licenseNumber: input.licenseNumber ?? undefined,
      specialty: input.specialty ?? undefined,
      isActive: input.isActive,
    },
    include: {
      user: true,
      organization: true,
    },
  });
};

export const listPatients = async (auth: AuthContext, query: ListPatientsInput) => {
  const paging = toSkipTake({ page: query.page, pageSize: query.pageSize });

  if (auth.role === UserRole.ADMIN) {
    const where: Prisma.UserWhereInput = {
      role: UserRole.PATIENT,
      isDeleted: false,
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: "insensitive" } },
              { email: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip: paging.skip,
        take: paging.take,
      }),
      prisma.user.count({ where }),
    ]);

    return {
      items,
      pagination: withPagination({ page: paging.page, pageSize: paging.pageSize }, total),
    };
  }

  const clinicianProfile = await ensureClinicianProfile(auth);

  const where: Prisma.PatientLinkWhereInput = {
    clinicianId: clinicianProfile.id,
    ...(query.includeInactive ? {} : { isActive: true }),
    patient: {
      isDeleted: false,
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: "insensitive" } },
              { email: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
  };

  const [items, total] = await Promise.all([
    prisma.patientLink.findMany({
      where,
      include: {
        patient: {
          include: {
            consentsAsPatient: {
              where: {
                clinicianId: clinicianProfile.id,
              },
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      skip: paging.skip,
      take: paging.take,
    }),
    prisma.patientLink.count({ where }),
  ]);

  return {
    items: items.map((item) => ({
      id: item.patient.id,
      name: item.patient.name,
      email: item.patient.email,
      avatarUrl: item.patient.avatarUrl,
      phoneNumber: item.patient.phoneNumber,
      gender: item.patient.gender,
      dob: item.patient.dob,
      relationshipType: item.relationshipType,
      linkedAt: item.linkedAt,
      isActive: item.isActive,
      consent: toEffectiveConsent(item.patient.consentsAsPatient[0] ?? null),
    })),
    pagination: withPagination({ page: paging.page, pageSize: paging.pageSize }, total),
  };
};

const upsertPatientLink = async (
  auth: AuthContext,
  patientId: string,
  relationshipType: string,
) => {
  const clinicianProfile = await ensureClinicianProfile(auth);

  return prisma.patientLink.upsert({
    where: {
      clinicianId_patientId: {
        clinicianId: clinicianProfile.id,
        patientId,
      },
    },
    create: {
      clinicianId: clinicianProfile.id,
      patientId,
      relationshipType,
      isActive: true,
      linkedAt: new Date(),
    },
    update: {
      relationshipType,
      isActive: true,
      unlinkedAt: null,
    },
  });
};

export const linkPatient = async (
  auth: AuthContext,
  patientId: string,
  relationshipType: string,
) => {
  await ensurePatient(patientId);
  return upsertPatientLink(auth, patientId, relationshipType);
};

export const linkPatientByEmail = async (
  auth: AuthContext,
  patientEmail: string,
  relationshipType: string,
) => {
  const patient = await ensurePatientByEmail(patientEmail);
  return upsertPatientLink(auth, patient.id, relationshipType);
};

export const unlinkPatient = async (auth: AuthContext, patientId: string) => {
  const clinicianProfile = await ensureClinicianProfile(auth);

  const existing = await prisma.patientLink.findFirst({
    where: {
      clinicianId: clinicianProfile.id,
      patientId,
      isActive: true,
    },
  });

  if (!existing) {
    return null;
  }

  return prisma.patientLink.update({
    where: { id: existing.id },
    data: {
      isActive: false,
      unlinkedAt: new Date(),
    },
  });
};

export const requestConsent = async (
  auth: AuthContext,
  patientId: string,
  input: RequestConsentInput,
) => {
  await ensurePatient(patientId);
  const clinicianProfile = await ensureClinicianProfile(auth);
  await ensureActivePatientLink(clinicianProfile.id, patientId);

  const active = await prisma.consentGrant.findFirst({
    where: {
      patientId,
      clinicianId: clinicianProfile.id,
      status: ConsentStatus.ACTIVE,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    orderBy: { createdAt: "desc" },
  });

  if (active) {
    throw new ApiError(
      409,
      "Active consent already exists. Revoke active consent before sending a new request.",
    );
  }

  const pending = await prisma.consentGrant.findFirst({
    where: {
      patientId,
      clinicianId: clinicianProfile.id,
      status: ConsentStatus.REQUESTED,
    },
    orderBy: { createdAt: "desc" },
  });

  const normalizedScope = normalizeConsentScopeForStorage(input.scope);
  const requestMessage = input.requestMessage?.trim() || null;
  const expiresAt = toNullOrDate(input.expiresAt);

  if (pending) {
    const data: Prisma.ConsentGrantUpdateInput = {
      requestedAt: new Date(),
      requestMessage,
      status: ConsentStatus.REQUESTED,
      responseReason: null,
      respondedAt: null,
      revokedAt: null,
      expiresAt,
    };

    if (normalizedScope !== undefined) {
      data.requestedScope = normalizedScope;
    }

    return prisma.consentGrant.update({
      where: { id: pending.id },
      data,
    });
  }

  const data: Prisma.ConsentGrantCreateInput = {
    patient: { connect: { id: patientId } },
    clinician: { connect: { id: clinicianProfile.id } },
    status: ConsentStatus.REQUESTED,
    requestedAt: new Date(),
    requestMessage,
    expiresAt,
  };

  if (normalizedScope !== undefined) {
    data.requestedScope = normalizedScope;
  }

  return prisma.consentGrant.create({ data });
};

export const revokeConsent = async (
  auth: AuthContext,
  patientId: string,
  input: RevokeConsentInput = {},
) => {
  const clinicianProfile = await ensureClinicianProfile(auth);

  const active = await prisma.consentGrant.findFirst({
    where: {
      patientId,
      clinicianId: clinicianProfile.id,
      status: ConsentStatus.ACTIVE,
    },
    orderBy: { createdAt: "desc" },
  });

  const requested = !active
    ? await prisma.consentGrant.findFirst({
        where: {
          patientId,
          clinicianId: clinicianProfile.id,
          status: ConsentStatus.REQUESTED,
        },
        orderBy: { createdAt: "desc" },
      })
    : null;

  const target = active ?? requested;
  if (!target) return null;

  return prisma.consentGrant.update({
    where: { id: target.id },
    data: {
      status: ConsentStatus.REVOKED,
      revokedAt: new Date(),
      respondedAt: new Date(),
      responseReason: input.reason?.trim() || null,
    },
  });
};

export const getPatientTimeline = async (
  auth: AuthContext,
  patientId: string,
  limits: TimelineLimits,
) => {
  const access = await ensurePatientAccess(auth, patientId);
  const consentScope = parseConsentScope(
    access.consent?.scope as Prisma.JsonValue | null | undefined,
  );
  const includeHistory = consentScope?.includeHistory ?? true;

  const screeningRecordsTake = includeHistory ? limits.screeningLimit : 1;
  const walletDocumentsTake = includeHistory ? limits.documentLimit : 1;
  const feedbackTake = includeHistory ? limits.feedbackLimit : 1;

  const [profile, pregnancyPlan, screeningDueItems, screeningRecords, walletDocuments, feedback, cancerSnapshot, healthSnapshot, immunisations, careTasks, messages, reminderRequests] =
    await Promise.all([
      prisma.user.findUniqueOrThrow({ where: { id: patientId } }),
      hasConsentDomain(consentScope, "pregnancy")
        ? prisma.pregnancyPlan.findUnique({ where: { userId: patientId } })
        : Promise.resolve(null),
      hasConsentDomain(consentScope, "screenings")
        ? prisma.screeningDueItem.findMany({
            where: { userId: patientId },
            include: { screeningDefinition: true },
            orderBy: { dueDate: "asc" },
            take: limits.dueItemLimit,
          })
        : Promise.resolve([]),
      hasConsentDomain(consentScope, "screenings")
        ? prisma.screeningRecord.findMany({
            where: { userId: patientId },
            include: {
              screeningDefinition: true,
              measurements: true,
              flags: true,
              attachments: true,
              cancerDetail: true,
              cardiovascularDetail: true,
              diabetesDetail: true,
              visionDetail: true,
              dentalDetail: true,
              mentalHealthDetail: true,
            },
            orderBy: { performedAt: "desc" },
            take: screeningRecordsTake,
          })
        : Promise.resolve([]),
      hasConsentDomain(consentScope, "documents")
        ? prisma.walletDocument.findMany({
            where: { userId: patientId },
            orderBy: { createdAt: "desc" },
            take: walletDocumentsTake,
          })
        : Promise.resolve([]),
      hasConsentDomain(consentScope, "feedback")
        ? prisma.feedbackEntry.findMany({
            where: { userId: patientId },
            orderBy: { submittedAt: "desc" },
            take: feedbackTake,
          })
        : Promise.resolve([]),
      hasConsentDomain(consentScope, "screenings")
        ? prisma.cancerScreeningSnapshot.findUnique({ where: { userId: patientId } })
        : Promise.resolve(null),
      hasConsentDomain(consentScope, "screenings")
        ? prisma.healthScreeningSnapshot.findUnique({ where: { userId: patientId } })
        : Promise.resolve(null),
      hasConsentDomain(consentScope, "screenings")
        ? prisma.screeningRecord.findMany({
            where: {
              userId: patientId,
              immunisationDetail: { isNot: null },
            },
            include: {
              screeningDefinition: true,
              immunisationDetail: true,
            },
            orderBy: { performedAt: "desc" },
            take: limits.screeningLimit,
          })
        : Promise.resolve([]),
      prisma.careTask.findMany({
        where: {
          patientId,
          ...(access.clinicianProfile
            ? { clinicianId: access.clinicianProfile.id }
            : {}),
        },
        orderBy: [{ status: "asc" }, { dueAt: "asc" }, { createdAt: "desc" }],
        take: 50,
      }),
      prisma.patientMessage.findMany({
        where: {
          patientId,
          ...(access.clinicianProfile
            ? { clinicianId: access.clinicianProfile.id }
            : {}),
        },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
      prisma.patientReminderRequest.findMany({
        where: {
          patientId,
          ...(access.clinicianProfile
            ? { clinicianId: access.clinicianProfile.id }
            : {}),
        },
        orderBy: [{ status: "asc" }, { dueAt: "asc" }, { createdAt: "desc" }],
        take: 30,
      }),
    ]);

  const documentReviews =
    walletDocuments.length > 0
      ? await prisma.walletDocumentReview.findMany({
          where: {
            walletDocumentId: { in: walletDocuments.map((doc) => doc.id) },
            ...(access.clinicianProfile
              ? { clinicianId: access.clinicianProfile.id }
              : {}),
          },
        })
      : [];

  const patient = hasConsentDomain(consentScope, "profile")
    ? profile
    : {
        id: profile.id,
        email: null,
        role: profile.role,
        name: profile.name,
        avatarUrl: null,
        phoneNumber: null,
        gender: profile.gender,
        dob: null,
        isDeleted: profile.isDeleted,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
        firebaseUid: null,
      };

  return {
    patient,
    access: {
      relationship: access.link,
      consent: toEffectiveConsent(access.consent),
    },
    pregnancyPlan,
    screening: {
      dueItems: screeningDueItems,
      records: screeningRecords,
    },
    walletDocuments,
    documentReviews,
    feedback,
    immunisations,
    careTasks,
    messages,
    reminderRequests,
    snapshots: {
      cancer: cancerSnapshot,
      health: healthSnapshot,
    },
  };
};

const buildPatientWorklistItem = async (
  patient: Prisma.UserGetPayload<{ select: typeof patientSelect }>,
  options: {
    clinicianProfile: Awaited<ReturnType<typeof ensureClinicianProfile>> | null;
    relationship?: {
      relationshipType: string;
      isActive: boolean;
      linkedAt: Date;
      updatedAt: Date;
    } | null;
    consent?: Prisma.ConsentGrantGetPayload<Record<string, never>> | null;
  },
) => {
  const clinicianId = options.clinicianProfile?.id;
  const now = new Date();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const [
    overdueDueItems,
    nextDueItem,
    latestRecord,
    latestAbnormalRecord,
    openTasks,
    dueSoonTasks,
    documents,
    reviewedDocuments,
    openReminderRequests,
    latestMessage,
    immunisationSummary,
  ] = await Promise.all([
    prisma.screeningDueItem.count({
      where: { userId: patient.id, completed: false, overdue: true },
    }),
    prisma.screeningDueItem.findFirst({
      where: { userId: patient.id, completed: false },
      include: { screeningDefinition: true },
      orderBy: { dueDate: "asc" },
    }),
    prisma.screeningRecord.findFirst({
      where: { userId: patient.id },
      include: { screeningDefinition: true },
      orderBy: { performedAt: "desc" },
    }),
    prisma.screeningRecord.findFirst({
      where: {
        userId: patient.id,
        OR: [{ outcomeStatus: "ABNORMAL" }, { wasNormal: false }],
      },
      include: { screeningDefinition: true },
      orderBy: { performedAt: "desc" },
    }),
    clinicianId
      ? prisma.careTask.count({
          where: {
            patientId: patient.id,
            clinicianId,
            status: { in: ["OPEN", "IN_PROGRESS", "BLOCKED"] },
          },
        })
      : prisma.careTask.count({
          where: {
            patientId: patient.id,
            status: { in: ["OPEN", "IN_PROGRESS", "BLOCKED"] },
          },
        }),
    clinicianId
      ? prisma.careTask.count({
          where: {
            patientId: patient.id,
            clinicianId,
            status: { in: ["OPEN", "IN_PROGRESS", "BLOCKED"] },
            dueAt: { lte: thirtyDaysFromNow },
          },
        })
      : prisma.careTask.count({
          where: {
            patientId: patient.id,
            status: { in: ["OPEN", "IN_PROGRESS", "BLOCKED"] },
            dueAt: { lte: thirtyDaysFromNow },
          },
        }),
    prisma.walletDocument.findMany({
      where: { userId: patient.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    clinicianId
      ? prisma.walletDocumentReview.count({
          where: {
            clinicianId,
            walletDocument: { userId: patient.id },
            status: { in: ["REVIEWED", "ACCEPTED"] },
          },
        })
      : prisma.walletDocumentReview.count({
          where: {
            walletDocument: { userId: patient.id },
            status: { in: ["REVIEWED", "ACCEPTED"] },
          },
        }),
    clinicianId
      ? prisma.patientReminderRequest.count({
          where: {
            patientId: patient.id,
            clinicianId,
            status: { in: ["REQUESTED", "SCHEDULED"] },
          },
        })
      : prisma.patientReminderRequest.count({
          where: {
            patientId: patient.id,
            status: { in: ["REQUESTED", "SCHEDULED"] },
          },
        }),
    clinicianId
      ? prisma.patientMessage.findFirst({
          where: { patientId: patient.id, clinicianId },
          orderBy: { createdAt: "desc" },
        })
      : prisma.patientMessage.findFirst({
          where: { patientId: patient.id },
          orderBy: { createdAt: "desc" },
        }),
    prisma.screeningRecord.aggregate({
      where: {
        userId: patient.id,
        immunisationDetail: { isNot: null },
      },
      _count: { id: true },
      _max: { performedAt: true },
    }),
  ]);

  const consent = toEffectiveConsent(options.consent ?? null);
  const consentExpiringSoon =
    consent?.status === ConsentStatus.ACTIVE &&
    consent.expiresAt &&
    consent.expiresAt <= thirtyDaysFromNow;
  const latestActivityAt = [
    patient.updatedAt,
    options.relationship?.updatedAt,
    options.consent?.updatedAt,
    latestRecord?.updatedAt,
    documents[0]?.updatedAt,
    latestMessage?.createdAt,
  ]
    .filter(Boolean)
    .sort((a, b) => b!.getTime() - a!.getTime())[0];
  const staleMobileActivity = !latestActivityAt || latestActivityAt < ninetyDaysAgo;
  const unreviewedDocumentCount = Math.max(0, documents.length - reviewedDocuments);
  const needsAttentionReasons = [
    overdueDueItems > 0 ? "overdue_screenings" : null,
    latestAbnormalRecord ? "abnormal_result" : null,
    openTasks > 0 ? "open_tasks" : null,
    dueSoonTasks > 0 ? "tasks_due_soon" : null,
    unreviewedDocumentCount > 0 ? "documents_need_review" : null,
    openReminderRequests > 0 ? "pending_reminders" : null,
    !consent ? "missing_consent" : null,
    consentExpiringSoon ? "consent_expiring" : null,
    staleMobileActivity ? "stale_mobile_activity" : null,
  ].filter(Boolean);

  return {
    patient,
    relationship: options.relationship ?? null,
    consent,
    attention: {
      score: needsAttentionReasons.length,
      reasons: needsAttentionReasons,
      label:
        needsAttentionReasons.length === 0
          ? "Stable"
          : needsAttentionReasons.length >= 3
            ? "High attention"
            : "Needs review",
    },
    nextAction:
      openTasks > 0
        ? "Review open care tasks"
        : overdueDueItems > 0
          ? "Follow up overdue screening"
          : unreviewedDocumentCount > 0
            ? "Review uploaded document"
            : !consent
              ? "Request patient consent"
              : "Monitor",
    nextDue: nextDueItem
      ? {
          dueDate: nextDueItem.dueDate,
          label:
            nextDueItem.screeningDefinition?.displayName ??
            nextDueItem.screeningDefinition?.code ??
            "Screening",
          overdue: nextDueItem.overdue,
        }
      : null,
    latestResult: latestRecord
      ? {
          performedAt: latestRecord.performedAt,
          label:
            latestRecord.screeningDefinition?.displayName ??
            latestRecord.screeningDefinition?.code ??
            "Screening",
          outcomeStatus: latestRecord.outcomeStatus,
          wasNormal: latestRecord.wasNormal,
          summary: latestRecord.resultSummary,
        }
      : null,
    latestAbnormalResult: latestAbnormalRecord
      ? {
          performedAt: latestAbnormalRecord.performedAt,
          label:
            latestAbnormalRecord.screeningDefinition?.displayName ??
            latestAbnormalRecord.screeningDefinition?.code ??
            "Screening",
          outcomeStatus: latestAbnormalRecord.outcomeStatus,
          summary: latestAbnormalRecord.resultSummary,
        }
      : null,
    counts: {
      overdueScreenings: overdueDueItems,
      openTasks,
      tasksDueSoon: dueSoonTasks,
      documents: documents.length,
      documentsNeedReview: unreviewedDocumentCount,
      reminderRequests: openReminderRequests,
      immunisations: immunisationSummary._count.id,
    },
    immunisation: {
      totalRecords: immunisationSummary._count.id,
      lastRecordedAt: immunisationSummary._max.performedAt,
      status: immunisationSummary._count.id > 0 ? "Recorded" : "No records",
    },
    activity: {
      lastMobileActivityAt: latestActivityAt ?? null,
      staleMobileActivity,
      latestMessageAt: latestMessage?.createdAt ?? null,
    },
  };
};

export const listPatientWorklist = async (
  auth: AuthContext,
  query: WorklistInput,
) => {
  const paging = toSkipTake({ page: query.page, pageSize: query.pageSize });
  const search = query.search?.trim();
  const orderDirection = query.sortDir ?? "desc";

  if (auth.role === UserRole.ADMIN) {
    const where: Prisma.UserWhereInput = {
      role: UserRole.PATIENT,
      isDeleted: false,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [patients, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: patientSelect,
        orderBy:
          query.sortBy === "name"
            ? { name: orderDirection }
            : { updatedAt: orderDirection },
        skip: paging.skip,
        take: paging.take,
      }),
      prisma.user.count({ where }),
    ]);

    const items = await Promise.all(
      patients.map((patient) =>
        buildPatientWorklistItem(patient, {
          clinicianProfile: null,
          relationship: null,
          consent: null,
        }),
      ),
    );

    return {
      items: filterWorklistItems(items, query),
      pagination: withPagination(
        { page: paging.page, pageSize: paging.pageSize },
        total,
      ),
    };
  }

  const clinicianProfile = await ensureClinicianProfile(auth);
  const where: Prisma.PatientLinkWhereInput = {
    clinicianId: clinicianProfile.id,
    ...(query.includeInactive ? {} : { isActive: true }),
    patient: {
      isDeleted: false,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
  };

  const [links, total] = await Promise.all([
    prisma.patientLink.findMany({
      where,
      include: {
        patient: { select: patientSelect },
        clinician: true,
      },
      orderBy:
        query.sortBy === "name"
          ? { patient: { name: orderDirection } }
          : { updatedAt: orderDirection },
      skip: paging.skip,
      take: paging.take,
    }),
    prisma.patientLink.count({ where }),
  ]);

  const consents = await prisma.consentGrant.findMany({
    where: {
      clinicianId: clinicianProfile.id,
      patientId: { in: links.map((link) => link.patientId) },
    },
    orderBy: { createdAt: "desc" },
  });
  const latestConsentByPatient = new Map<string, (typeof consents)[number]>();
  consents.forEach((consent) => {
    if (!latestConsentByPatient.has(consent.patientId)) {
      latestConsentByPatient.set(consent.patientId, consent);
    }
  });

  const items = await Promise.all(
    links.map((link) =>
      buildPatientWorklistItem(link.patient, {
        clinicianProfile,
        relationship: {
          relationshipType: link.relationshipType,
          isActive: link.isActive,
          linkedAt: link.linkedAt,
          updatedAt: link.updatedAt,
        },
        consent: latestConsentByPatient.get(link.patientId) ?? null,
      }),
    ),
  );

  return {
    items: filterWorklistItems(items, query),
    pagination: withPagination(
      { page: paging.page, pageSize: paging.pageSize },
      total,
    ),
  };
};

const filterWorklistItems = (
  items: Awaited<ReturnType<typeof buildPatientWorklistItem>>[],
  query: WorklistInput,
) => {
  return items.filter((item) => {
    if (query.consentStatus) {
      const status = String(item.consent?.status ?? "NONE").toUpperCase();
      if (status !== query.consentStatus.toUpperCase()) return false;
    }

    if (query.attention === "needs_attention" && item.attention.score === 0) {
      return false;
    }
    if (query.attention === "stable" && item.attention.score > 0) {
      return false;
    }

    if (query.view === "overdue" && item.counts.overdueScreenings === 0) {
      return false;
    }
    if (query.view === "documents" && item.counts.documentsNeedReview === 0) {
      return false;
    }
    if (query.view === "abnormal" && !item.latestAbnormalResult) {
      return false;
    }
    if (query.view === "inactive_mobile" && !item.activity.staleMobileActivity) {
      return false;
    }

    return true;
  });
};

export const listSavedViews = async (auth: AuthContext, viewType?: string) => {
  const clinicianProfile = await ensureClinicianProfile(auth);
  return prisma.clinicianSavedView.findMany({
    where: {
      clinicianId: clinicianProfile.id,
      ...(viewType ? { viewType } : {}),
    },
    orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
  });
};

export const createSavedView = async (
  auth: AuthContext,
  input: SavedViewInput,
) => {
  const clinicianProfile = await ensureClinicianProfile(auth);

  return prisma.$transaction(async (tx) => {
    if (input.isDefault) {
      await tx.clinicianSavedView.updateMany({
        where: {
          clinicianId: clinicianProfile.id,
          viewType: input.viewType ?? "PATIENT_WORKLIST",
        },
        data: { isDefault: false },
      });
    }

    return tx.clinicianSavedView.create({
      data: {
        clinicianId: clinicianProfile.id,
        name: input.name.trim(),
        viewType: input.viewType ?? "PATIENT_WORKLIST",
        filters: input.filters,
        columns: input.columns ?? undefined,
        sort: input.sort ?? undefined,
        isDefault: input.isDefault ?? false,
      },
    });
  });
};

export const deleteSavedView = async (auth: AuthContext, viewId: string) => {
  const clinicianProfile = await ensureClinicianProfile(auth);
  return prisma.clinicianSavedView.delete({
    where: { id: viewId, clinicianId: clinicianProfile.id },
  });
};

export const createCareTask = async (
  auth: AuthContext,
  input: CreateTaskInput,
) => {
  const access = await ensureClinicianPatientAccess(auth, input.patientId);
  const clinicianProfile =
    access.clinicianProfile ?? (await ensureClinicianProfile(auth));

  return prisma.careTask.create({
    data: {
      patientId: input.patientId,
      clinicianId: clinicianProfile.id,
      organizationId: clinicianProfile.organizationId,
      title: input.title.trim(),
      description: compactText(input.description),
      category: compactText(input.category) ?? "GENERAL",
      priority: compactText(input.priority) ?? "MEDIUM",
      dueAt: toNullOrDate(input.dueAt),
      createdByUserId: auth.userId,
      assignedToUserId: compactText(input.assignedToUserId),
    },
  });
};

export const updateCareTask = async (
  auth: AuthContext,
  taskId: string,
  input: UpdateTaskInput,
) => {
  const task = await ensureTaskAccess(auth, taskId);
  const nextStatus = input.status?.trim().toUpperCase();
  const completedAt =
    nextStatus && ["DONE", "COMPLETED"].includes(nextStatus)
      ? new Date()
      : nextStatus && isOpenTaskStatus(nextStatus)
        ? null
        : undefined;

  return prisma.careTask.update({
    where: { id: task.id },
    data: {
      ...(input.title !== undefined ? { title: input.title.trim() } : {}),
      ...(input.description !== undefined
        ? { description: compactText(input.description) }
        : {}),
      ...(input.category !== undefined
        ? { category: compactText(input.category) ?? "GENERAL" }
        : {}),
      ...(input.priority !== undefined
        ? { priority: compactText(input.priority) ?? "MEDIUM" }
        : {}),
      ...(nextStatus ? { status: nextStatus } : {}),
      ...(input.dueAt !== undefined ? { dueAt: toNullOrDate(input.dueAt) } : {}),
      ...(input.assignedToUserId !== undefined
        ? { assignedToUserId: compactText(input.assignedToUserId) }
        : {}),
      ...(completedAt !== undefined ? { completedAt } : {}),
    },
  });
};

export const sendPatientMessage = async (
  auth: AuthContext,
  input: SendMessageInput,
) => {
  const access = await ensureClinicianPatientAccess(auth, input.patientId);
  const clinicianProfile =
    access.clinicianProfile ?? (await ensureClinicianProfile(auth));

  return prisma.patientMessage.create({
    data: {
      patientId: input.patientId,
      clinicianId: clinicianProfile.id,
      senderUserId: auth.userId,
      body: input.body.trim(),
      channel: compactText(input.channel) ?? "IN_APP",
      status: "SENT",
    },
  });
};

export const createReminderRequest = async (
  auth: AuthContext,
  input: CreateReminderInput,
) => {
  const access = await ensureClinicianPatientAccess(auth, input.patientId);
  const clinicianProfile =
    access.clinicianProfile ?? (await ensureClinicianProfile(auth));

  return prisma.patientReminderRequest.create({
    data: {
      patientId: input.patientId,
      clinicianId: clinicianProfile.id,
      title: input.title.trim(),
      description: compactText(input.description),
      dueAt: toNullOrDate(input.dueAt),
      recurrence: compactText(input.recurrence),
      status: "REQUESTED",
    },
  });
};

export const updateReminderRequest = async (
  auth: AuthContext,
  reminderId: string,
  input: UpdateReminderInput,
) => {
  const reminder = await ensureReminderAccess(auth, reminderId);
  const nextStatus = input.status?.trim().toUpperCase();
  const completedAt =
    nextStatus && ["DONE", "COMPLETED"].includes(nextStatus)
      ? new Date()
      : nextStatus && ["REQUESTED", "SCHEDULED"].includes(nextStatus)
        ? null
        : undefined;

  return prisma.patientReminderRequest.update({
    where: { id: reminder.id },
    data: {
      ...(input.title !== undefined ? { title: input.title.trim() } : {}),
      ...(input.description !== undefined
        ? { description: compactText(input.description) }
        : {}),
      ...(input.dueAt !== undefined ? { dueAt: toNullOrDate(input.dueAt) } : {}),
      ...(input.recurrence !== undefined
        ? { recurrence: compactText(input.recurrence) }
        : {}),
      ...(nextStatus ? { status: nextStatus } : {}),
      ...(completedAt !== undefined ? { completedAt } : {}),
    },
  });
};

export const reviewWalletDocument = async (
  auth: AuthContext,
  input: ReviewDocumentInput,
) => {
  const document = await prisma.walletDocument.findUnique({
    where: { id: input.walletDocumentId },
  });
  if (!document) throw new ApiError(404, "Wallet document not found");

  const access = await ensureClinicianPatientAccess(auth, document.userId);
  const clinicianProfile =
    access.clinicianProfile ?? (await ensureClinicianProfile(auth));
  const status = input.status.trim().toUpperCase();

  return prisma.walletDocumentReview.upsert({
    where: {
      walletDocumentId_clinicianId: {
        walletDocumentId: input.walletDocumentId,
        clinicianId: clinicianProfile.id,
      },
    },
    create: {
      walletDocumentId: input.walletDocumentId,
      clinicianId: clinicianProfile.id,
      status,
      note: compactText(input.note),
      reviewedAt: status === "PENDING" ? null : new Date(),
    },
    update: {
      status,
      note: compactText(input.note),
      reviewedAt: status === "PENDING" ? null : new Date(),
    },
  });
};

export const listCohorts = async (auth: AuthContext) => {
  if (auth.role === UserRole.ADMIN) {
    return prisma.patientCohort.findMany({
      include: { organization: true, _count: { select: { members: true } } },
      orderBy: { updatedAt: "desc" },
    });
  }

  const clinicianProfile = await ensureClinicianProfile(auth);
  return prisma.patientCohort.findMany({
    where: {
      OR: [
        { clinicianId: clinicianProfile.id },
        clinicianProfile.organizationId
          ? { organizationId: clinicianProfile.organizationId }
          : { id: "__never__" },
      ],
    },
    include: { organization: true, _count: { select: { members: true } } },
    orderBy: { updatedAt: "desc" },
  });
};

export const createCohort = async (
  auth: AuthContext,
  input: CreateCohortInput,
) => {
  const clinicianProfile =
    auth.role === UserRole.ADMIN ? null : await ensureClinicianProfile(auth);
  const organizationId = clinicianProfile?.organizationId ?? null;

  return prisma.patientCohort.create({
    data: {
      name: input.name.trim(),
      description: compactText(input.description),
      filters: input.filters ?? undefined,
      clinicianId: clinicianProfile?.id ?? undefined,
      organizationId: organizationId ?? undefined,
      createdByUserId: auth.userId,
      members: input.patientIds?.length
        ? {
            create: input.patientIds.map((patientId) => ({ patientId })),
          }
        : undefined,
    },
    include: { organization: true, _count: { select: { members: true } } },
  });
};
