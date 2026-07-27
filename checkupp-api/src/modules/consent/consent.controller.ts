import { Request, Response } from "express";
import { asyncHandler } from "../../middlewares/async-handler";
import { ApiError } from "../../middlewares/error-handler";
import { buildAuditContext, tryCreateAuditLog } from "../../services/audit.service";
import { ok, okPaginated } from "../../utils/http";
import {
  approveConsentRequest,
  declineConsentRequest,
  listMyConsentRequests,
  revokeActiveConsentAsPatient,
} from "./consent.service";

export const listMyConsentRequestsController = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.auth) throw new ApiError(401, "Unauthorized");

    const result = await listMyConsentRequests(req.auth, req.query as any);
    return okPaginated(
      res,
      result.items,
      result.pagination,
      "Consent requests fetched",
    );
  },
);

export const approveConsentRequestController = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.auth) throw new ApiError(401, "Unauthorized");

    const consentId = String(req.params.consentId);
    const consent = await approveConsentRequest(req.auth, consentId, req.body ?? {});

    await tryCreateAuditLog({
      actorUserId: req.auth.userId,
      action: "patient.consent.approve",
      resourceType: "consent_grant",
      resourceId: consent.id,
      status: "success",
      ...buildAuditContext(req),
    });

    return ok(res, consent, "Consent approved");
  },
);

export const declineConsentRequestController = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.auth) throw new ApiError(401, "Unauthorized");

    const consentId = String(req.params.consentId);
    const consent = await declineConsentRequest(req.auth, consentId, req.body ?? {});

    await tryCreateAuditLog({
      actorUserId: req.auth.userId,
      action: "patient.consent.decline",
      resourceType: "consent_grant",
      resourceId: consent.id,
      status: "success",
      meta: {
        reason: req.body?.reason,
      },
      ...buildAuditContext(req),
    });

    return ok(res, consent, "Consent declined");
  },
);

export const revokeMyConsentController = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.auth) throw new ApiError(401, "Unauthorized");

    const consentId = String(req.params.consentId);
    const consent = await revokeActiveConsentAsPatient(req.auth, consentId, req.body ?? {});

    await tryCreateAuditLog({
      actorUserId: req.auth.userId,
      action: "patient.consent.revoke",
      resourceType: "consent_grant",
      resourceId: consent.id,
      status: "success",
      meta: {
        reason: req.body?.reason,
      },
      ...buildAuditContext(req),
    });

    return ok(res, consent, "Consent revoked");
  },
);

