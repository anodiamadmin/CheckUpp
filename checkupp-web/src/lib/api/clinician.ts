import { z } from "zod";
import { apiRequest } from "@/lib/api/client";

const paginationSchema = z.object({
  page: z.number(),
  pageSize: z.number(),
  total: z.number(),
  totalPages: z.number(),
});

const userSummarySchema = z
  .object({
    id: z.string(),
    email: z.string().nullable().optional(),
    name: z.string().nullable().optional(),
    avatarUrl: z.string().nullable().optional(),
    phoneNumber: z.string().nullable().optional(),
    role: z.string(),
    gender: z.string().nullable().optional(),
    dob: z.string().nullable().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
  })
  .passthrough();

const relationshipSchema = z
  .object({
    id: z.string(),
    clinicianId: z.string(),
    patientId: z.string(),
    relationshipType: z.string(),
    isActive: z.boolean(),
    linkedAt: z.string(),
    unlinkedAt: z.string().nullable().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
  })
  .passthrough();

export const consentScopeDomainValues = [
  "screenings",
  "documents",
  "pregnancy",
  "feedback",
  "profile",
] as const;

export const consentScopeAccessLevelValues = ["READ_ONLY", "READ_WRITE"] as const;
export const consentStatusValues = [
  "REQUESTED",
  "ACTIVE",
  "DECLINED",
  "REVOKED",
  "EXPIRED",
] as const;

const consentScopeSchema = z
  .object({
    accessLevel: z.enum(consentScopeAccessLevelValues).default("READ_ONLY"),
    domains: z.array(z.enum(consentScopeDomainValues)).min(1),
    includeHistory: z.boolean().optional(),
    note: z.string().nullable().optional(),
  })
  .passthrough();

const normalizedConsentScopeSchema = z.unknown().transform((value) => {
  if (value === null || value === undefined) return null;
  const parsed = consentScopeSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
});

const consentSchema = z
  .object({
    id: z.string(),
    patientId: z.string(),
    clinicianId: z.string(),
    requestedScope: normalizedConsentScopeSchema.optional(),
    scope: normalizedConsentScopeSchema.optional(),
    requestMessage: z.string().nullable().optional(),
    responseReason: z.string().nullable().optional(),
    status: z.enum(consentStatusValues),
    requestedAt: z.string().optional(),
    grantedAt: z.string().nullable().optional(),
    respondedAt: z.string().nullable().optional(),
    revokedAt: z.string().nullable().optional(),
    expiresAt: z.string().nullable().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
  })
  .passthrough();

const screeningDefinitionSchema = z
  .object({
    id: z.string(),
    code: z.string(),
    displayName: z.string(),
    domain: z.string(),
  })
  .passthrough();

const numberLikeSchema = z.union([z.number(), z.string()]);

const screeningMeasurementSchema = z
  .object({
    id: z.string(),
    code: z.string(),
    displayName: z.string().nullable().optional(),
    valueNumber: numberLikeSchema.nullable().optional(),
    valueText: z.string().nullable().optional(),
    valueBoolean: z.boolean().nullable().optional(),
    valueDate: z.string().nullable().optional(),
    valueCode: z.string().nullable().optional(),
    valueJson: z.unknown().optional(),
    unit: z.string().nullable().optional(),
    referenceLow: numberLikeSchema.nullable().optional(),
    referenceHigh: numberLikeSchema.nullable().optional(),
    abnormalFlag: z.boolean().nullable().optional(),
    interpretation: z.string().nullable().optional(),
  })
  .passthrough();

const screeningFlagSchema = z
  .object({
    id: z.string(),
    severity: z.string(),
    code: z.string(),
    message: z.string(),
  })
  .passthrough();

const screeningAttachmentSchema = z
  .object({
    id: z.string(),
    walletDocumentId: z.string().nullable().optional(),
    objectKey: z.string().nullable().optional(),
    fileName: z.string().nullable().optional(),
    mimeType: z.string().nullable().optional(),
  })
  .passthrough();

const screeningDueItemSchema = z
  .object({
    id: z.string(),
    dueDate: z.string(),
    eligible: z.boolean(),
    recommended: z.boolean(),
    overdue: z.boolean(),
    completed: z.boolean(),
    completedAt: z.string().nullable().optional(),
    intervalMonths: z.number().nullable().optional(),
    screeningDefinition: screeningDefinitionSchema.optional(),
  })
  .passthrough();

const screeningRecordSchema = z
  .object({
    id: z.string(),
    performedAt: z.string(),
    wasNormal: z.boolean().nullable().optional(),
    outcomeStatus: z.string(),
    resultSummary: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
    providerName: z.string().nullable().optional(),
    facilityName: z.string().nullable().optional(),
    source: z.string().optional(),
    recordedAt: z.string().optional(),
    screeningDefinition: screeningDefinitionSchema.optional(),
    measurements: z.array(screeningMeasurementSchema).default([]),
    flags: z.array(screeningFlagSchema).default([]),
    attachments: z.array(screeningAttachmentSchema).default([]),
  })
  .passthrough();

const pregnancyPlanSchema = z
  .object({
    id: z.string(),
    userId: z.string(),
    conceptionDate: z.string(),
    expectedDueDate: z.string(),
    estimatedCheckupDates: z.unknown().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
  })
  .passthrough();

const walletDocumentSchema = z
  .object({
    id: z.string(),
    userId: z.string(),
    title: z.string(),
    description: z.string().nullable().optional(),
    documentType: z.string(),
    fileType: z.string(),
    objectKey: z.string().nullable().optional(),
    publicUrl: z.string().nullable().optional(),
    externalUrl: z.string().nullable().optional(),
    mimeType: z.string().nullable().optional(),
    sizeBytes: z.number().nullable().optional(),
    createdAt: z.string().optional(),
  })
  .passthrough();

const feedbackEntrySchema = z
  .object({
    id: z.string(),
    userId: z.string(),
    feedback: z.string(),
    rating: z.number().nullable().optional(),
    submittedAt: z.string().optional(),
    createdAt: z.string().optional(),
  })
  .passthrough();

const cancerSnapshotSchema = z
  .object({
    id: z.string(),
    userId: z.string(),
    age: z.number().nullable().optional(),
    gender: z.string().nullable().optional(),
    calculatedScreeningDates: z.unknown().nullable().optional(),
    testResults: z.unknown().nullable().optional(),
    lastScreeningDate: z.string().nullable().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
  })
  .passthrough();

const healthSnapshotSchema = z
  .object({
    id: z.string(),
    userId: z.string(),
    age: z.number().nullable().optional(),
    gender: z.string().nullable().optional(),
    checkupDates: z.unknown().nullable().optional(),
    healthResults: z.unknown().nullable().optional(),
    lastCheckupDate: z.string().nullable().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
  })
  .passthrough();

export const clinicianProfileSchema = z
  .object({
    id: z.string(),
    userId: z.string(),
    organizationId: z.string().nullable().optional(),
    licenseNumber: z.string().nullable().optional(),
    specialty: z.string().nullable().optional(),
    isActive: z.boolean(),
    user: userSummarySchema,
    organization: z
      .object({
        id: z.string(),
        name: z.string().nullable().optional(),
      })
      .passthrough()
      .nullable()
      .optional(),
  })
  .passthrough();

const clinicianPatientListItemSchema = z
  .object({
    id: z.string(),
    name: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    avatarUrl: z.string().nullable().optional(),
    phoneNumber: z.string().nullable().optional(),
    gender: z.string().nullable().optional(),
    dob: z.string().nullable().optional(),
    relationshipType: z.string().optional(),
    linkedAt: z.string().optional(),
    isActive: z.boolean().optional(),
    consent: consentSchema.nullable().optional(),
  })
  .passthrough();

const workspaceTaskSchema = z
  .object({
    id: z.string(),
    patientId: z.string(),
    clinicianId: z.string(),
    title: z.string(),
    description: z.string().nullable().optional(),
    category: z.string().optional(),
    priority: z.string().optional(),
    status: z.string(),
    source: z.string().optional(),
    dueAt: z.string().nullable().optional(),
    completedAt: z.string().nullable().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
  })
  .passthrough();

const patientMessageSchema = z
  .object({
    id: z.string(),
    patientId: z.string(),
    clinicianId: z.string(),
    senderUserId: z.string().nullable().optional(),
    body: z.string(),
    channel: z.string().optional(),
    status: z.string(),
    readAt: z.string().nullable().optional(),
    createdAt: z.string().optional(),
  })
  .passthrough();

const reminderRequestSchema = z
  .object({
    id: z.string(),
    patientId: z.string(),
    clinicianId: z.string(),
    title: z.string(),
    description: z.string().nullable().optional(),
    dueAt: z.string().nullable().optional(),
    recurrence: z.string().nullable().optional(),
    status: z.string(),
    completedAt: z.string().nullable().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
  })
  .passthrough();

const documentReviewSchema = z
  .object({
    id: z.string(),
    walletDocumentId: z.string(),
    clinicianId: z.string(),
    status: z.string(),
    note: z.string().nullable().optional(),
    reviewedAt: z.string().nullable().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
  })
  .passthrough();

const immunisationRecordSchema = screeningRecordSchema.extend({
  immunisationDetail: z.unknown().nullable().optional(),
});

const patientWorklistItemSchema = z
  .object({
    patient: userSummarySchema,
    relationship: z
      .object({
        relationshipType: z.string(),
        isActive: z.boolean(),
        linkedAt: z.string(),
        updatedAt: z.string().optional(),
      })
      .nullable()
      .optional(),
    consent: consentSchema.nullable().optional(),
    attention: z.object({
      score: z.number(),
      reasons: z.array(z.string()).default([]),
      label: z.string(),
    }),
    nextAction: z.string(),
    nextDue: z
      .object({
        dueDate: z.string(),
        label: z.string(),
        overdue: z.boolean(),
      })
      .nullable()
      .optional(),
    latestResult: z
      .object({
        performedAt: z.string(),
        label: z.string(),
        outcomeStatus: z.string(),
        wasNormal: z.boolean().nullable().optional(),
        summary: z.string().nullable().optional(),
      })
      .nullable()
      .optional(),
    latestAbnormalResult: z
      .object({
        performedAt: z.string(),
        label: z.string(),
        outcomeStatus: z.string(),
        summary: z.string().nullable().optional(),
      })
      .nullable()
      .optional(),
    counts: z.object({
      overdueScreenings: z.number(),
      openTasks: z.number(),
      tasksDueSoon: z.number(),
      documents: z.number(),
      documentsNeedReview: z.number(),
      reminderRequests: z.number(),
      immunisations: z.number(),
    }),
    immunisation: z.object({
      totalRecords: z.number(),
      lastRecordedAt: z.string().nullable().optional(),
      status: z.string(),
    }),
    activity: z.object({
      lastMobileActivityAt: z.string().nullable().optional(),
      staleMobileActivity: z.boolean(),
      latestMessageAt: z.string().nullable().optional(),
    }),
  })
  .passthrough();

export const patientWorklistSchema = z.object({
  items: z.array(patientWorklistItemSchema).default([]),
  pagination: paginationSchema,
});

const savedViewSchema = z
  .object({
    id: z.string(),
    clinicianId: z.string(),
    name: z.string(),
    viewType: z.string(),
    filters: z.unknown(),
    columns: z.unknown().nullable().optional(),
    sort: z.unknown().nullable().optional(),
    isDefault: z.boolean(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
  })
  .passthrough();

const cohortSchema = z
  .object({
    id: z.string(),
    organizationId: z.string().nullable().optional(),
    clinicianId: z.string().nullable().optional(),
    name: z.string(),
    description: z.string().nullable().optional(),
    filters: z.unknown().nullable().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    _count: z.object({ members: z.number().optional() }).optional(),
  })
  .passthrough();

export const savedViewsSchema = z.array(savedViewSchema).default([]);
export const cohortsSchema = z.array(cohortSchema).default([]);

export const clinicianPatientsSchema = z.object({
  items: z.array(clinicianPatientListItemSchema).default([]),
  pagination: paginationSchema,
});

const organizationSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    _count: z
      .object({
        clinicians: z.number().optional(),
      })
      .optional(),
  })
  .passthrough();

const adminClinicianSchema = z
  .object({
    id: z.string(),
    userId: z.string(),
    organizationId: z.string().nullable().optional(),
    licenseNumber: z.string().nullable().optional(),
    specialty: z.string().nullable().optional(),
    isActive: z.boolean(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    user: userSummarySchema.extend({
      emailVerified: z.boolean().optional(),
      lastLoginAt: z.string().nullable().optional(),
    }),
    organization: organizationSchema.nullable().optional(),
    _count: z
      .object({
        patientLinks: z.number().optional(),
        consents: z.number().optional(),
      })
      .optional(),
  })
  .passthrough();

export const organizationsSchema = z.object({
  items: z.array(organizationSchema).default([]),
  pagination: paginationSchema,
});

export const adminCliniciansSchema = z.object({
  items: z.array(adminClinicianSchema).default([]),
  pagination: paginationSchema,
});

const organizationPermissionSchema = z
  .object({
    id: z.string(),
    organizationId: z.string(),
    userId: z.string(),
    role: z.string(),
    scopes: z.unknown().nullable().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    organization: organizationSchema.optional(),
    user: userSummarySchema.optional(),
  })
  .passthrough();

export const organizationPermissionsSchema = z.array(organizationPermissionSchema).default([]);

const auditLogSchema = z
  .object({
    id: z.string(),
    actorUserId: z.string().nullable().optional(),
    action: z.string(),
    resourceType: z.string(),
    resourceId: z.string().nullable().optional(),
    status: z.string(),
    ipAddress: z.string().nullable().optional(),
    userAgent: z.string().nullable().optional(),
    meta: z.unknown().nullable().optional(),
    createdAt: z.string(),
    actor: userSummarySchema.nullable().optional(),
  })
  .passthrough();

export const auditLogsSchema = z.object({
  items: z.array(auditLogSchema).default([]),
  pagination: paginationSchema,
});

export const patientTimelineSchema = z
  .object({
    patient: userSummarySchema,
    access: z.object({
      relationship: relationshipSchema.nullable().optional(),
      consent: consentSchema.nullable().optional(),
    }),
    pregnancyPlan: pregnancyPlanSchema.nullable().optional(),
    screening: z.object({
      dueItems: z.array(screeningDueItemSchema).default([]),
      records: z.array(screeningRecordSchema).default([]),
    }),
    walletDocuments: z.array(walletDocumentSchema).default([]),
    documentReviews: z.array(documentReviewSchema).default([]),
    feedback: z.array(feedbackEntrySchema).default([]),
    immunisations: z.array(immunisationRecordSchema).default([]),
    careTasks: z.array(workspaceTaskSchema).default([]),
    messages: z.array(patientMessageSchema).default([]),
    reminderRequests: z.array(reminderRequestSchema).default([]),
    snapshots: z.object({
      cancer: cancerSnapshotSchema.nullable().optional(),
      health: healthSnapshotSchema.nullable().optional(),
    }),
  })
  .passthrough();

export type ClinicianProfile = z.infer<typeof clinicianProfileSchema>;
export type ClinicianPatients = z.infer<typeof clinicianPatientsSchema>;
export type ClinicianPatientListItem = z.infer<typeof clinicianPatientListItemSchema>;
export type PatientTimeline = z.infer<typeof patientTimelineSchema>;
export type PatientWorklist = z.infer<typeof patientWorklistSchema>;
export type PatientWorklistItem = z.infer<typeof patientWorklistItemSchema>;
export type PatientLink = z.infer<typeof relationshipSchema>;
export type ConsentGrant = z.infer<typeof consentSchema>;
export type ConsentScope = z.infer<typeof consentScopeSchema>;
export type WorkspaceTask = z.infer<typeof workspaceTaskSchema>;
export type PatientMessage = z.infer<typeof patientMessageSchema>;
export type ReminderRequest = z.infer<typeof reminderRequestSchema>;
export type DocumentReview = z.infer<typeof documentReviewSchema>;
export type SavedView = z.infer<typeof savedViewSchema>;
export type PatientCohort = z.infer<typeof cohortSchema>;
export type Organization = z.infer<typeof organizationSchema>;
export type AdminClinician = z.infer<typeof adminClinicianSchema>;
export type OrganizationPermission = z.infer<typeof organizationPermissionSchema>;
export type AuditLog = z.infer<typeof auditLogSchema>;
export type ConsentScopeDomain = (typeof consentScopeDomainValues)[number];
export type ConsentAccessLevel = (typeof consentScopeAccessLevelValues)[number];

export interface PatientsQueryInput {
  page?: number;
  pageSize?: number;
  search?: string;
  includeInactive?: boolean;
}

export interface UpsertClinicianProfileInput {
  organizationId?: string | null;
  licenseNumber?: string | null;
  specialty?: string | null;
  isActive?: boolean;
}

export interface LinkPatientInput {
  relationshipType?: string;
}

export interface LinkPatientByEmailInput {
  patientEmail: string;
  relationshipType?: string;
}

export interface RequestConsentInput {
  scope?: ConsentScope | null;
  expiresAt?: string | null;
  requestMessage?: string | null;
}

export interface RevokeConsentInput {
  reason?: string;
}

export interface TimelineQueryInput {
  screeningLimit?: number;
  dueItemLimit?: number;
  documentLimit?: number;
  feedbackLimit?: number;
}

export interface WorklistQueryInput {
  page?: number;
  pageSize?: number;
  search?: string;
  includeInactive?: boolean;
  view?: string;
  consentStatus?: string;
  attention?: string;
  sortBy?: string;
  sortDir?: "asc" | "desc";
}

export interface CreateSavedViewInput {
  name: string;
  viewType?: string;
  filters: Record<string, unknown>;
  columns?: Record<string, unknown> | null;
  sort?: Record<string, unknown> | null;
  isDefault?: boolean;
}

export interface CreateCareTaskInput {
  patientId: string;
  title: string;
  description?: string | null;
  category?: string | null;
  priority?: string | null;
  dueAt?: string | null;
  assignedToUserId?: string | null;
}

export interface UpdateCareTaskInput {
  title?: string;
  description?: string | null;
  category?: string | null;
  priority?: string | null;
  status?: string;
  dueAt?: string | null;
  assignedToUserId?: string | null;
}

export interface SendPatientMessageInput {
  patientId: string;
  body: string;
  channel?: string;
}

export interface CreateReminderRequestInput {
  patientId: string;
  title: string;
  description?: string | null;
  dueAt?: string | null;
  recurrence?: string | null;
}

export interface UpdateReminderRequestInput {
  title?: string;
  description?: string | null;
  dueAt?: string | null;
  recurrence?: string | null;
  status?: string;
}

export interface ReviewDocumentInput {
  walletDocumentId: string;
  status: string;
  note?: string | null;
}

export interface CreateCohortInput {
  name: string;
  description?: string | null;
  filters?: Record<string, unknown> | null;
  patientIds?: string[];
}

export interface UpsertOrganizationPermissionInput {
  organizationId: string;
  userEmail: string;
  role?: string;
  scopes?: Record<string, unknown> | null;
}

export interface AuditLogsQueryInput {
  page?: number;
  pageSize?: number;
  resourceType?: string;
  action?: string;
}

export interface AdminListQueryInput {
  page?: number;
  pageSize?: number;
  search?: string;
}

export interface CliniciansAdminQueryInput extends AdminListQueryInput {
  organizationId?: string | null;
  isActive?: boolean;
}

export interface CreateOrganizationInput {
  name: string;
  slug?: string;
}

export interface UpdateOrganizationInput {
  name?: string;
  slug?: string;
}

export interface CreateClinicianInput {
  email: string;
  name: string;
  password: string;
  phoneNumber?: string | null;
  organizationId?: string | null;
  licenseNumber?: string | null;
  specialty?: string | null;
  isActive?: boolean;
  emailVerified?: boolean;
}

export interface UpdateClinicianInput {
  name?: string;
  phoneNumber?: string | null;
  organizationId?: string | null;
  licenseNumber?: string | null;
  specialty?: string | null;
  isActive?: boolean;
  emailVerified?: boolean;
}

export const getClinicianProfile = () => {
  return apiRequest("/clinician/profile", clinicianProfileSchema);
};

export const upsertClinicianProfile = (body: UpsertClinicianProfileInput) => {
  return apiRequest("/clinician/profile", clinicianProfileSchema, {
    method: "PUT",
    body,
  });
};

export const getClinicianPatients = (query: PatientsQueryInput = {}) => {
  return apiRequest("/clinician/patients", clinicianPatientsSchema, {
    query: {
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
      search: query.search,
      includeInactive: query.includeInactive ?? false,
    },
  });
};

export const linkPatient = (patientId: string, body: LinkPatientInput = {}) => {
  return apiRequest(`/clinician/patients/${patientId}/link`, relationshipSchema, {
    method: "POST",
    body: {
      relationshipType: body.relationshipType ?? "PRIMARY",
    },
  });
};

export const linkPatientByEmail = (body: LinkPatientByEmailInput) => {
  return apiRequest("/clinician/patients/link-by-email", relationshipSchema, {
    method: "POST",
    body: {
      patientEmail: body.patientEmail,
      relationshipType: body.relationshipType ?? "PRIMARY",
    },
  });
};

export const unlinkPatient = (patientId: string) => {
  return apiRequest(`/clinician/patients/${patientId}/link`, relationshipSchema, {
    method: "DELETE",
  });
};

export const requestConsent = (patientId: string, body: RequestConsentInput = {}) => {
  return apiRequest(`/clinician/patients/${patientId}/consent/request`, consentSchema, {
    method: "POST",
    body: {
      scope: body.scope,
      expiresAt: body.expiresAt ?? null,
      requestMessage: body.requestMessage ?? null,
    },
  });
};

export const grantConsent = requestConsent;

export const revokeConsent = (patientId: string, body: RevokeConsentInput = {}) => {
  return apiRequest(`/clinician/patients/${patientId}/consent/revoke`, consentSchema, {
    method: "POST",
    body: {
      reason: body.reason,
    },
  });
};

export const getPatientTimeline = (patientId: string, query: TimelineQueryInput = {}) => {
  return apiRequest(`/clinician/patients/${patientId}/timeline`, patientTimelineSchema, {
    query: {
      screeningLimit: query.screeningLimit ?? 50,
      dueItemLimit: query.dueItemLimit ?? 50,
      documentLimit: query.documentLimit ?? 50,
      feedbackLimit: query.feedbackLimit ?? 20,
    },
  });
};

export const getPatientWorklist = (query: WorklistQueryInput = {}) => {
  return apiRequest("/clinician/worklist", patientWorklistSchema, {
    query: {
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 25,
      search: query.search,
      includeInactive: query.includeInactive ?? false,
      view: query.view,
      consentStatus: query.consentStatus,
      attention: query.attention,
      sortBy: query.sortBy,
      sortDir: query.sortDir,
    },
  });
};

export const getSavedViews = (viewType = "PATIENT_WORKLIST") => {
  return apiRequest("/clinician/saved-views", savedViewsSchema, {
    query: { viewType },
  });
};

export const createSavedView = (body: CreateSavedViewInput) => {
  return apiRequest("/clinician/saved-views", savedViewSchema, {
    method: "POST",
    body,
  });
};

export const deleteSavedView = (viewId: string) => {
  return apiRequest(`/clinician/saved-views/${viewId}`, savedViewSchema, {
    method: "DELETE",
  });
};

export const createCareTask = (body: CreateCareTaskInput) => {
  return apiRequest("/clinician/tasks", workspaceTaskSchema, {
    method: "POST",
    body,
  });
};

export const updateCareTask = (taskId: string, body: UpdateCareTaskInput) => {
  return apiRequest(`/clinician/tasks/${taskId}`, workspaceTaskSchema, {
    method: "PATCH",
    body,
  });
};

export const sendPatientMessage = (body: SendPatientMessageInput) => {
  return apiRequest("/clinician/messages", patientMessageSchema, {
    method: "POST",
    body,
  });
};

export const createReminderRequest = (body: CreateReminderRequestInput) => {
  return apiRequest("/clinician/reminders", reminderRequestSchema, {
    method: "POST",
    body,
  });
};

export const updateReminderRequest = (
  reminderId: string,
  body: UpdateReminderRequestInput,
) => {
  return apiRequest(`/clinician/reminders/${reminderId}`, reminderRequestSchema, {
    method: "PATCH",
    body,
  });
};

export const reviewDocument = (body: ReviewDocumentInput) => {
  return apiRequest("/clinician/document-reviews", documentReviewSchema, {
    method: "POST",
    body,
  });
};

export const getCohorts = () => {
  return apiRequest("/clinician/cohorts", cohortsSchema);
};

export const createCohort = (body: CreateCohortInput) => {
  return apiRequest("/clinician/cohorts", cohortSchema, {
    method: "POST",
    body,
  });
};

export const getOrganizations = (query: AdminListQueryInput = {}) => {
  return apiRequest("/clinician-admin/organizations", organizationsSchema, {
    query: {
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 50,
      search: query.search,
    },
  });
};

export const createOrganization = (body: CreateOrganizationInput) => {
  return apiRequest("/clinician-admin/organizations", organizationSchema, {
    method: "POST",
    body,
  });
};

export const updateOrganization = (
  organizationId: string,
  body: UpdateOrganizationInput,
) => {
  return apiRequest(
    `/clinician-admin/organizations/${organizationId}`,
    organizationSchema,
    {
      method: "PATCH",
      body,
    },
  );
};

export const getAdminClinicians = (query: CliniciansAdminQueryInput = {}) => {
  return apiRequest("/clinician-admin/clinicians", adminCliniciansSchema, {
    query: {
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 50,
      search: query.search,
      organizationId: query.organizationId,
      isActive: query.isActive,
    },
  });
};

export const createClinician = (body: CreateClinicianInput) => {
  return apiRequest("/clinician-admin/clinicians", adminClinicianSchema, {
    method: "POST",
    body,
  });
};

export const getOrganizationPermissions = (organizationId?: string | null) => {
  return apiRequest(
    "/clinician-admin/organization-permissions",
    organizationPermissionsSchema,
    {
      query: { organizationId },
    },
  );
};

export const upsertOrganizationPermission = (
  body: UpsertOrganizationPermissionInput,
) => {
  return apiRequest(
    "/clinician-admin/organization-permissions",
    organizationPermissionSchema,
    {
      method: "POST",
      body,
    },
  );
};

export const getAuditLogs = (query: AuditLogsQueryInput = {}) => {
  return apiRequest("/clinician-admin/audit-logs", auditLogsSchema, {
    query: {
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 25,
      resourceType: query.resourceType,
      action: query.action,
    },
  });
};

export const updateClinician = (
  clinicianId: string,
  body: UpdateClinicianInput,
) => {
  return apiRequest(
    `/clinician-admin/clinicians/${clinicianId}`,
    adminClinicianSchema,
    {
      method: "PATCH",
      body,
    },
  );
};
