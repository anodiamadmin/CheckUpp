import Joi from "joi";
import { consentScopeDomainValues } from "../consent/consent.scope";

const consentScopeSchema = Joi.object({
  accessLevel: Joi.string().valid("READ_ONLY", "READ_WRITE").default("READ_ONLY"),
  domains: Joi.array()
    .items(Joi.string().valid(...consentScopeDomainValues))
    .min(1)
    .unique()
    .required(),
  includeHistory: Joi.boolean().default(true),
  note: Joi.string().max(500).allow("", null).optional(),
});

export const upsertClinicianProfileSchema = {
  body: Joi.object({
    organizationId: Joi.string().uuid().allow(null).optional(),
    licenseNumber: Joi.string().max(120).allow("", null).optional(),
    specialty: Joi.string().max(120).allow("", null).optional(),
    isActive: Joi.boolean().optional(),
  }).min(1),
};

export const listClinicianPatientsSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    pageSize: Joi.number().integer().min(1).max(100).default(20),
    search: Joi.string().allow("", null).optional(),
    includeInactive: Joi.boolean().default(false),
  }),
};

export const patientIdParamSchema = {
  params: Joi.object({
    patientId: Joi.string().uuid().required(),
  }),
};

export const linkPatientSchema = {
  body: Joi.object({
    relationshipType: Joi.string().max(64).default("PRIMARY"),
  }),
};

export const linkPatientByEmailSchema = {
  body: Joi.object({
    patientEmail: Joi.string().email().required(),
    relationshipType: Joi.string().max(64).default("PRIMARY"),
  }),
};

export const requestConsentSchema = {
  body: Joi.object({
    scope: consentScopeSchema.allow(null).optional(),
    expiresAt: Joi.date().iso().allow(null).optional(),
    requestMessage: Joi.string().max(500).allow("", null).optional(),
  }).optional(),
};

export const revokeConsentSchema = {
  body: Joi.object({
    reason: Joi.string().max(500).allow("", null).optional(),
  }).optional(),
};

export const patientTimelineQuerySchema = {
  query: Joi.object({
    screeningLimit: Joi.number().integer().min(1).max(200).default(50),
    dueItemLimit: Joi.number().integer().min(1).max(200).default(50),
    documentLimit: Joi.number().integer().min(1).max(200).default(50),
    feedbackLimit: Joi.number().integer().min(1).max(200).default(20),
  }),
};

export const patientWorklistSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    pageSize: Joi.number().integer().min(1).max(100).default(25),
    search: Joi.string().trim().allow("", null).optional(),
    includeInactive: Joi.boolean().default(false),
    view: Joi.string()
      .valid("needs_attention", "overdue", "documents", "abnormal", "inactive_mobile", "all")
      .optional(),
    consentStatus: Joi.string()
      .valid("ACTIVE", "REQUESTED", "REVOKED", "DECLINED", "EXPIRED", "NONE")
      .optional(),
    attention: Joi.string().valid("needs_attention", "stable").optional(),
    sortBy: Joi.string()
      .valid("updatedAt", "name", "attention", "nextDue")
      .default("updatedAt"),
    sortDir: Joi.string().valid("asc", "desc").default("desc"),
  }),
};

export const savedViewQuerySchema = {
  query: Joi.object({
    viewType: Joi.string().trim().max(80).optional(),
  }),
};

export const savedViewSchema = {
  body: Joi.object({
    name: Joi.string().trim().min(2).max(120).required(),
    viewType: Joi.string().trim().max(80).default("PATIENT_WORKLIST"),
    filters: Joi.object().unknown(true).required(),
    columns: Joi.object().unknown(true).allow(null).optional(),
    sort: Joi.object().unknown(true).allow(null).optional(),
    isDefault: Joi.boolean().default(false),
  }),
};

export const savedViewIdParamSchema = {
  params: Joi.object({
    viewId: Joi.string().uuid().required(),
  }),
};

export const createCareTaskSchema = {
  body: Joi.object({
    patientId: Joi.string().uuid().required(),
    title: Joi.string().trim().min(2).max(200).required(),
    description: Joi.string().trim().allow("", null).optional(),
    category: Joi.string().trim().max(80).allow("", null).optional(),
    priority: Joi.string().valid("LOW", "MEDIUM", "HIGH", "URGENT").default("MEDIUM"),
    dueAt: Joi.date().iso().allow(null).optional(),
    assignedToUserId: Joi.string().uuid().allow("", null).optional(),
  }),
};

export const taskIdParamSchema = {
  params: Joi.object({
    taskId: Joi.string().uuid().required(),
  }),
};

export const updateCareTaskSchema = {
  body: Joi.object({
    title: Joi.string().trim().min(2).max(200).optional(),
    description: Joi.string().trim().allow("", null).optional(),
    category: Joi.string().trim().max(80).allow("", null).optional(),
    priority: Joi.string().valid("LOW", "MEDIUM", "HIGH", "URGENT").optional(),
    status: Joi.string()
      .valid("OPEN", "IN_PROGRESS", "BLOCKED", "DONE", "COMPLETED", "CANCELLED", "ARCHIVED")
      .optional(),
    dueAt: Joi.date().iso().allow(null).optional(),
    assignedToUserId: Joi.string().uuid().allow("", null).optional(),
  }).min(1),
};

export const sendPatientMessageSchema = {
  body: Joi.object({
    patientId: Joi.string().uuid().required(),
    body: Joi.string().trim().min(1).max(3000).required(),
    channel: Joi.string().valid("IN_APP", "EMAIL", "SMS").default("IN_APP"),
  }),
};

export const createReminderRequestSchema = {
  body: Joi.object({
    patientId: Joi.string().uuid().required(),
    title: Joi.string().trim().min(2).max(200).required(),
    description: Joi.string().trim().allow("", null).optional(),
    dueAt: Joi.date().iso().allow(null).optional(),
    recurrence: Joi.string().trim().max(80).allow("", null).optional(),
  }),
};

export const reminderIdParamSchema = {
  params: Joi.object({
    reminderId: Joi.string().uuid().required(),
  }),
};

export const updateReminderRequestSchema = {
  body: Joi.object({
    title: Joi.string().trim().min(2).max(200).optional(),
    description: Joi.string().trim().allow("", null).optional(),
    dueAt: Joi.date().iso().allow(null).optional(),
    recurrence: Joi.string().trim().max(80).allow("", null).optional(),
    status: Joi.string()
      .valid("REQUESTED", "SCHEDULED", "DONE", "COMPLETED", "CANCELLED")
      .optional(),
  }).min(1),
};

export const reviewDocumentSchema = {
  body: Joi.object({
    walletDocumentId: Joi.string().uuid().required(),
    status: Joi.string()
      .valid("PENDING", "REVIEWED", "ACCEPTED", "NEEDS_REPLACEMENT", "REJECTED")
      .required(),
    note: Joi.string().trim().allow("", null).optional(),
  }),
};

export const createCohortSchema = {
  body: Joi.object({
    name: Joi.string().trim().min(2).max(160).required(),
    description: Joi.string().trim().allow("", null).optional(),
    filters: Joi.object().unknown(true).allow(null).optional(),
    patientIds: Joi.array().items(Joi.string().uuid()).max(500).default([]),
  }),
};
