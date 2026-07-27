import Joi from "joi";

const domainSchema = Joi.string().valid("CANCER", "HEALTH", "cancer", "health");

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
  "pending"
);

const sourceSchema = Joi.string().valid(
  "MOBILE_FORM",
  "MOBILE_IMPORT",
  "CLINICIAN",
  "MIGRATION",
  "mobile_form",
  "mobile_import",
  "clinician",
  "migration"
);

const valueTypeSchema = Joi.string().valid(
  "NUMBER",
  "TEXT",
  "BOOLEAN",
  "DATE",
  "CODED",
  "JSON",
  "number",
  "text",
  "boolean",
  "date",
  "coded",
  "json"
);

const severitySchema = Joi.string().valid(
  "INFO",
  "WARNING",
  "CRITICAL",
  "info",
  "warning",
  "critical"
);

const measurementSchema = Joi.object({
  code: Joi.string().min(1).max(120).required(),
  displayName: Joi.string().max(255).allow("", null).optional(),
  valueType: valueTypeSchema.required(),
  valueNumber: Joi.number().optional(),
  valueText: Joi.string().max(5000).allow("", null).optional(),
  valueBoolean: Joi.boolean().optional(),
  valueDate: Joi.date().iso().allow(null).optional(),
  valueCode: Joi.string().max(255).allow("", null).optional(),
  valueJson: Joi.alternatives().try(Joi.object(), Joi.array(), Joi.string()).optional(),
  unit: Joi.string().max(64).allow("", null).optional(),
  referenceLow: Joi.number().optional(),
  referenceHigh: Joi.number().optional(),
  abnormalFlag: Joi.boolean().optional(),
  interpretation: Joi.string().max(2000).allow("", null).optional(),
});

const flagSchema = Joi.object({
  severity: severitySchema.required(),
  code: Joi.string().min(1).max(120).required(),
  message: Joi.string().min(1).max(1000).required(),
});

const attachmentSchema = Joi.object({
  walletDocumentId: Joi.string().uuid().optional(),
  objectKey: Joi.string().max(500).allow("", null).optional(),
  fileName: Joi.string().max(255).allow("", null).optional(),
  mimeType: Joi.string().max(120).allow("", null).optional(),
});

const bookingStatusSchema = Joi.string().valid("required", "started", "confirmed");

const bookingChannelSchema = Joi.string().valid("hotdoc", "phone", "email");

const screeningResultSchema = Joi.object({
  date: Joi.string().isoDate().required(),
  result: Joi.string().required(),
  bookingStatus: bookingStatusSchema.optional(),
  bookingChannel: bookingChannelSchema.optional(),
  bookingUpdatedAt: Joi.string().isoDate().optional(),
  bookingConfirmedAt: Joi.string().isoDate().optional(),
  appointmentAt: Joi.string().isoDate().optional(),
  bookedAt: Joi.string().isoDate().optional(),
  providerName: Joi.string().max(255).allow("").optional(),
  notes: Joi.string().max(2000).allow("").optional(),
});

const screeningResultsMapSchema = Joi.object().pattern(Joi.string(), screeningResultSchema);

const phoneSchema = Joi.string()
  .trim()
  .pattern(/^[0-9+()\-\s]+$/)
  .max(50)
  .allow("", null);

const practiceContactBaseSchema = Joi.object({
  screeningName: Joi.string().max(255).allow(null).optional(),
  isDefault: Joi.boolean().default(false),
  hotdocUrl: Joi.string().uri().allow("", null).optional(),
  practicePhone: phoneSchema.optional(),
  practiceEmail: Joi.string().email().allow("", null).optional(),
})
  .custom((value, helpers) => {
    const hasContactValue = [value.hotdocUrl, value.practicePhone, value.practiceEmail].some(
      (entry) => typeof entry === "string" && entry.trim().length > 0
    );

    if (!hasContactValue) {
      return helpers.error("any.required");
    }

    if (value.isDefault) {
      return value;
    }

    if (!value.screeningName || !String(value.screeningName).trim()) {
      return helpers.error("any.invalid");
    }

    return value;
  }, "screening-specific contact validation")
  .messages({
    "any.required":
      "At least one of \"hotdocUrl\", \"practicePhone\", or \"practiceEmail\" is required",
    "any.invalid": "\"screeningName\" is required when \"isDefault\" is false",
  });

export const listDefinitionsSchema = {
  query: Joi.object({
    domain: domainSchema.optional(),
  }),
};

export const listPlansSchema = {
  query: Joi.object({
    domain: domainSchema.optional(),
  }),
};

export const upsertPlanSchema = {
  params: Joi.object({
    screeningCode: Joi.string().min(1).required(),
  }),
  body: Joi.object({
    neverScreened: Joi.boolean().optional(),
    lastScreeningDate: Joi.date().iso().allow(null).optional(),
    dataCalculated: Joi.boolean().optional(),
    source: Joi.string()
      .valid(
        "SYSTEM",
        "USER_OVERRIDE",
        "CLINICIAN_OVERRIDE",
        "system",
        "user_override",
        "clinician_override"
      )
      .optional(),
    intervalMonths: Joi.number().min(0.25).max(240).optional(),
    recalculateDueItem: Joi.boolean().default(true),
  }).min(1),
};

export const dueItemsQuerySchema = {
  query: Joi.object({
    status: Joi.string().valid("all", "upcoming", "overdue", "completed").default("all"),
    domain: domainSchema.optional(),
    screeningCode: Joi.string().optional(),
    page: Joi.number().integer().min(1).default(1),
    pageSize: Joi.number().integer().min(1).max(100).default(20),
  }),
};

export const putCancerSnapshotSchema = {
  body: Joi.object({
    age: Joi.number().integer().min(0).max(130).allow(null).optional(),
    gender: Joi.string()
      .valid(
        "male",
        "female",
        "prefer not to say",
        "unknown",
        "MALE",
        "FEMALE",
        "PREFER_NOT_TO_SAY",
        "UNKNOWN"
      )
      .allow(null)
      .optional(),
    calculatedScreeningDates: Joi.alternatives()
      .try(Joi.object(), Joi.array(), Joi.string())
      .allow(null)
      .optional(),
    testResults: screeningResultsMapSchema.allow(null).optional(),
    lastScreeningDate: Joi.date().iso().allow(null).optional(),
  }).min(1),
};

export const putHealthSnapshotSchema = {
  body: Joi.object({
    age: Joi.number().integer().min(0).max(130).allow(null).optional(),
    gender: Joi.string()
      .valid(
        "male",
        "female",
        "prefer not to say",
        "unknown",
        "MALE",
        "FEMALE",
        "PREFER_NOT_TO_SAY",
        "UNKNOWN"
      )
      .allow(null)
      .optional(),
    checkupDates: Joi.alternatives().try(Joi.object(), Joi.array(), Joi.string()).allow(null).optional(),
    healthResults: screeningResultsMapSchema.allow(null).optional(),
    lastCheckupDate: Joi.date().iso().allow(null).optional(),
  }).min(1),
};

export const putPracticeContactSchema = {
  body: practiceContactBaseSchema,
};

export const deletePracticeContactSchema = {
  body: Joi.object({
    screeningName: Joi.string().max(255).allow(null).optional(),
    isDefault: Joi.boolean().default(false),
  })
    .custom((value, helpers) => {
      if (value.isDefault) {
        return value;
      }

      if (!value.screeningName || !String(value.screeningName).trim()) {
        return helpers.error("any.invalid");
      }

      return value;
    }, "contact delete target validation")
    .messages({
      "any.invalid": "\"screeningName\" is required when \"isDefault\" is false",
    }),
};

export const createScreeningRecordSchema = {
  body: Joi.object({
    screeningCode: Joi.string().optional(),
    screeningDefinitionId: Joi.string().uuid().optional(),
    screeningDueItemId: Joi.string().uuid().allow(null).optional(),
    performedAt: Joi.date().iso().required(),
    wasNormal: Joi.boolean().allow(null).optional(),
    outcomeStatus: outcomeStatusSchema.optional(),
    resultSummary: Joi.string().max(1000).allow("", null).optional(),
    notes: Joi.string().max(10000).allow("", null).optional(),
    source: sourceSchema.optional(),
    enteredByUserId: Joi.string().uuid().allow(null).optional(),
    providerName: Joi.string().max(200).allow("", null).optional(),
    facilityName: Joi.string().max(200).allow("", null).optional(),
    legacyPayloadAvailable: Joi.boolean().optional(),
    structuredData: Joi.alternatives().try(Joi.object(), Joi.array(), Joi.string()).allow(null).optional(),
    measurements: Joi.array().items(measurementSchema).default([]),
    flags: Joi.array().items(flagSchema).default([]),
    attachments: Joi.array().items(attachmentSchema).default([]),
    details: Joi.object({
      cancer: Joi.object().unknown(true).optional(),
      cardiovascular: Joi.object().unknown(true).optional(),
      diabetes: Joi.object().unknown(true).optional(),
      vision: Joi.object().unknown(true).optional(),
      dental: Joi.object().unknown(true).optional(),
      mentalHealth: Joi.object().unknown(true).optional(),
    })
      .unknown(false)
      .optional(),
    dueItemCompletion: Joi.boolean().default(true),
  })
    .or("screeningCode", "screeningDefinitionId")
    .required(),
};

export const listScreeningRecordsSchema = {
  query: Joi.object({
    domain: domainSchema.optional(),
    screeningCode: Joi.string().optional(),
    from: Joi.date().iso().optional(),
    to: Joi.date().iso().optional(),
    page: Joi.number().integer().min(1).default(1),
    pageSize: Joi.number().integer().min(1).max(100).default(20),
  }),
};

export const recordIdParamSchema = {
  params: Joi.object({
    recordId: Joi.string().uuid().required(),
  }),
};

const legacyHistoryEntrySchema = Joi.object({
  date: Joi.string().required(),
  result: Joi.string().allow("", null).optional(),
  wasNormal: Joi.boolean().optional(),
  notes: Joi.string().allow("", null).optional(),
}).unknown(true);

export const importScreeningHistorySchema = {
  body: Joi.object({
    source: Joi.string()
      .valid("LOCAL_ASYNCSTORAGE", "APPWRITE_SNAPSHOT", "CSV", "local_asyncstorage", "appwrite_snapshot", "csv")
      .default("LOCAL_ASYNCSTORAGE"),
    records: Joi.array()
      .items(
        Joi.object({
          screeningCode: Joi.string().optional(),
          screeningName: Joi.string().optional(),
          domain: domainSchema.optional(),
          performedAt: Joi.date().iso().required(),
          outcomeStatus: outcomeStatusSchema.optional(),
          wasNormal: Joi.boolean().allow(null).optional(),
          resultSummary: Joi.string().allow("", null).optional(),
          notes: Joi.string().allow("", null).optional(),
          structuredData: Joi.alternatives().try(Joi.object(), Joi.array(), Joi.string()).allow(null).optional(),
          measurements: Joi.array().items(measurementSchema).default([]),
          flags: Joi.array().items(flagSchema).default([]),
          details: Joi.object().unknown(true).optional(),
        })
      )
      .optional(),
    cancerHistory: Joi.object().pattern(Joi.string(), Joi.array().items(legacyHistoryEntrySchema)).optional(),
    healthHistory: Joi.object().pattern(Joi.string(), Joi.array().items(legacyHistoryEntrySchema)).optional(),
  }).or("records", "cancerHistory", "healthHistory"),
};
