import { UserRole } from "@prisma/client";
import { Router } from "express";
import { authorize } from "../../middlewares/authorize";
import { validate } from "../../middlewares/validate";
import {
  approveConsentRequestController,
  declineConsentRequestController,
  listMyConsentRequestsController,
  revokeMyConsentController,
} from "./consent.controller";
import {
  approveConsentSchema,
  consentIdParamSchema,
  declineConsentSchema,
  listConsentRequestsSchema,
} from "./consent.validation";

export const consentRouter = Router();

consentRouter.get(
  "/me/consents/requests",
  authorize(UserRole.PATIENT, UserRole.ADMIN),
  validate(listConsentRequestsSchema),
  listMyConsentRequestsController,
);

consentRouter.post(
  "/me/consents/:consentId/approve",
  authorize(UserRole.PATIENT, UserRole.ADMIN),
  validate(consentIdParamSchema),
  validate(approveConsentSchema),
  approveConsentRequestController,
);

consentRouter.post(
  "/me/consents/:consentId/decline",
  authorize(UserRole.PATIENT, UserRole.ADMIN),
  validate(consentIdParamSchema),
  validate(declineConsentSchema),
  declineConsentRequestController,
);

consentRouter.post(
  "/me/consents/:consentId/revoke",
  authorize(UserRole.PATIENT, UserRole.ADMIN),
  validate(consentIdParamSchema),
  validate(declineConsentSchema),
  revokeMyConsentController,
);
