import Joi from "joi";

const vaccineTypeSchema = Joi.string().valid(
  "ROUTINE",
  "TRAVEL",
  "OCCUPATIONAL",
  "CATCH_UP",
  "BOOSTER",
  "routine",
  "travel",
  "occupational",
  "catch_up",
  "catch-up",
  "booster",
);

const administrationSiteSchema = Joi.string().valid(
  "LEFT_ARM",
  "RIGHT_ARM",
  "LEFT_THIGH",
  "RIGHT_THIGH",
  "ORAL",
  "NASAL",
  "left_arm",
  "right_arm",
  "left_thigh",
  "right_thigh",
  "oral",
  "nasal",
  "left-arm",
  "right-arm",
  "left-thigh",
  "right-thigh",
);

const sourceSchema = Joi.string().valid(
  "MOBILE_FORM",
  "MOBILE_IMPORT",
  "CLINICIAN",
  "MIGRATION",
  "mobile_form",
  "mobile_import",
  "clinician",
  "migration",
);

const outcomeStatusSchema = Joi.string().valid(
  "NORMAL",
  "ABNORMAL",
  "INCONCLUSIVE",
  "NOT_DONE",
  "PENDING",
  "normal",
  "abnormal",
  "inconclusive",
  "not_done",
  "pending",
);

const baseImmunisationSchema = {
  performedAt: Joi.forbidden(),
  wasNormal: Joi.boolean().allow(null),
  outcomeStatus: outcomeStatusSchema,
  resultSummary: Joi.string().max(1000).allow("", null),
  notes: Joi.string().max(10000).allow("", null),
  source: sourceSchema,
  providerName: Joi.string().max(200).allow("", null),
  facilityName: Joi.string().max(200).allow("", null),
  structuredData: Joi.alternatives()
    .try(Joi.object(), Joi.array(), Joi.string())
    .allow(null),
  vaccineName: Joi.string().min(1).max(255),
  vaccineType: vaccineTypeSchema,
  brand: Joi.string().max(255).allow("", null),
  batchNumber: Joi.string().max(100).allow("", null),
  doseNumber: Joi.number().integer().min(1),
  totalDoses: Joi.number().integer().min(1),
  administrationSite: administrationSiteSchema,
  clinic: Joi.string().max(255).allow("", null),
  location: Joi.string().max(255).allow("", null),
  nextDueDate: Joi.date().iso().allow(null),
  sideEffectsNone: Joi.boolean(),
  sideEffectsMild: Joi.boolean(),
  sideEffectsModerate: Joi.boolean(),
  sideEffectsSevere: Joi.boolean(),
  sideEffectsDescription: Joi.string().max(4000).allow("", null),
  isTravel: Joi.boolean(),
  travelDestination: Joi.string().max(255).allow("", null),
  departureDate: Joi.date().iso().allow(null),
};

const validateImmunisationBusinessRules = (
  value: Record<string, unknown>,
  helpers: Joi.CustomHelpers,
) => {
  const doseNumber =
    typeof value.doseNumber === "number" ? value.doseNumber : undefined;
  const totalDoses =
    typeof value.totalDoses === "number" ? value.totalDoses : undefined;
  const nextDueDate =
    value.nextDueDate === null || value.nextDueDate === undefined
      ? value.nextDueDate
      : new Date(String(value.nextDueDate));

  if (
    doseNumber !== undefined &&
    totalDoses !== undefined &&
    doseNumber > totalDoses
  ) {
    return helpers.error("any.invalid", {
      message: "Dose number cannot be greater than total doses.",
    });
  }

  if (
    doseNumber !== undefined &&
    totalDoses !== undefined &&
    doseNumber < totalDoses &&
    (nextDueDate === null || nextDueDate === undefined)
  ) {
    return helpers.error("any.invalid", {
      message:
        "Next due date is required when the dose series is not complete.",
    });
  }

  if (value.isTravel === true) {
    if (!value.travelDestination || !value.departureDate) {
      return helpers.error("any.invalid", {
        message:
          "Travel destination and departure date are required for travel vaccines.",
      });
    }
  }

  return value;
};

export const createImmunisationSchema = {
  body: Joi.object(baseImmunisationSchema)
    .keys({
      vaccineName: Joi.string().min(1).max(255).required(),
      vaccineType: vaccineTypeSchema.required(),
      doseNumber: Joi.number().integer().min(1).required(),
      totalDoses: Joi.number().integer().min(1).required(),
      administrationSite: administrationSiteSchema.required(),
    })
    .custom(validateImmunisationBusinessRules)
    .messages({ "any.invalid": "{#message}" })
    .required(),
};

export const listImmunisationsSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    pageSize: Joi.number().integer().min(1).max(100).default(20),
  }),
};

export const immunisationIdParamSchema = {
  params: Joi.object({
    id: Joi.string().uuid().required(),
  }),
};

export const patchImmunisationSchema = {
  body: Joi.object(baseImmunisationSchema)
    .custom(validateImmunisationBusinessRules)
    .messages({ "any.invalid": "{#message}" })
    .min(1),
};

export const upcomingImmunisationsSchema = {
  query: Joi.object({
    daysAhead: Joi.number().integer().min(1).max(365).default(30),
    page: Joi.number().integer().min(1).default(1),
    pageSize: Joi.number().integer().min(1).max(100).default(20),
  }),
};

export const immunisationSummarySchema = {
  query: Joi.object({
    daysAhead: Joi.number().integer().min(1).max(365).default(30),
  }),
};
