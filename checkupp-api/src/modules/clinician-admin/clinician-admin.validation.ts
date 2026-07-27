import Joi from "joi";

const uuid = Joi.string().uuid().required();
const nullableString = Joi.string().trim().allow("", null);

export const listOrganizationsSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    pageSize: Joi.number().integer().min(1).max(100).default(25),
    search: Joi.string().trim().allow("").optional(),
  }),
};

export const createOrganizationSchema = {
  body: Joi.object({
    name: Joi.string().trim().min(2).max(160).required(),
    slug: Joi.string()
      .trim()
      .lowercase()
      .pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .max(100)
      .optional(),
  }),
};

export const organizationIdParamSchema = {
  params: Joi.object({
    organizationId: uuid,
  }),
};

export const updateOrganizationSchema = {
  body: Joi.object({
    name: Joi.string().trim().min(2).max(160).optional(),
    slug: Joi.string()
      .trim()
      .lowercase()
      .pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .max(100)
      .optional(),
  }).min(1),
};

export const listCliniciansSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    pageSize: Joi.number().integer().min(1).max(100).default(25),
    search: Joi.string().trim().allow("").optional(),
    organizationId: Joi.string().uuid().allow("", null).optional(),
    isActive: Joi.boolean().optional(),
  }),
};

export const createClinicianSchema = {
  body: Joi.object({
    email: Joi.string().email().lowercase().trim().required(),
    name: Joi.string().trim().min(2).max(120).required(),
    password: Joi.string().min(8).max(128).required(),
    phoneNumber: nullableString.optional(),
    organizationId: Joi.string().uuid().allow("", null).optional(),
    licenseNumber: nullableString.optional(),
    specialty: nullableString.optional(),
    isActive: Joi.boolean().default(true),
    emailVerified: Joi.boolean().default(true),
  }),
};

export const clinicianIdParamSchema = {
  params: Joi.object({
    clinicianId: uuid,
  }),
};

export const updateClinicianSchema = {
  body: Joi.object({
    name: Joi.string().trim().min(2).max(120).optional(),
    phoneNumber: nullableString.optional(),
    organizationId: Joi.string().uuid().allow("", null).optional(),
    licenseNumber: nullableString.optional(),
    specialty: nullableString.optional(),
    isActive: Joi.boolean().optional(),
    emailVerified: Joi.boolean().optional(),
  }).min(1),
};

export const listOrganizationPermissionsSchema = {
  query: Joi.object({
    organizationId: Joi.string().uuid().allow("", null).optional(),
  }),
};

export const upsertOrganizationPermissionSchema = {
  body: Joi.object({
    organizationId: Joi.string().uuid().required(),
    userEmail: Joi.string().email().lowercase().trim().required(),
    role: Joi.string().valid("ORG_ADMIN", "CLINICIAN_MANAGER", "AUDITOR").default("ORG_ADMIN"),
    scopes: Joi.object().unknown(true).allow(null).optional(),
  }),
};

export const listAuditLogsSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    pageSize: Joi.number().integer().min(1).max(100).default(50),
    resourceType: Joi.string().trim().allow("", null).optional(),
    action: Joi.string().trim().allow("", null).optional(),
  }),
};
