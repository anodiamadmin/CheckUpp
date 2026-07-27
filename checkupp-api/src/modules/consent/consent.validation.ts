import { ConsentStatus } from "@prisma/client";
import Joi from "joi";
import {
  consentScopeDomainValues,
} from "./consent.scope";

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

export const listConsentRequestsSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    pageSize: Joi.number().integer().min(1).max(100).default(20),
    status: Joi.string()
      .valid(
        ConsentStatus.REQUESTED,
        ConsentStatus.ACTIVE,
        ConsentStatus.DECLINED,
        ConsentStatus.REVOKED,
        ConsentStatus.EXPIRED,
      )
      .optional(),
  }),
};

export const consentIdParamSchema = {
  params: Joi.object({
    consentId: Joi.string().uuid().required(),
  }),
};

export const approveConsentSchema = {
  body: Joi.object({
    scope: consentScopeSchema.allow(null).optional(),
    expiresAt: Joi.date().iso().allow(null).optional(),
    responseReason: Joi.string().max(500).allow("", null).optional(),
  }).optional(),
};

export const declineConsentSchema = {
  body: Joi.object({
    reason: Joi.string().max(500).allow("", null).optional(),
  }).optional(),
};

