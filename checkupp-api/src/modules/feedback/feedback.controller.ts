import { Request, Response } from "express";
import { asyncHandler } from "../../middlewares/async-handler";
import { ApiError } from "../../middlewares/error-handler";
import { buildAuditContext, tryCreateAuditLog } from "../../services/audit.service";
import { created, ok, okPaginated } from "../../utils/http";
import { createFeedback, deleteFeedback, listFeedback } from "./feedback.service";

export const createFeedbackController = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw new ApiError(401, "Unauthorized");

  const feedback = await createFeedback(req.auth, req.body);

  await tryCreateAuditLog({
    actorUserId: req.auth.userId,
    action: "feedback.create",
    resourceType: "feedback",
    resourceId: feedback.id,
    status: "success",
    ...buildAuditContext(req),
  });

  return created(res, feedback, "Feedback submitted");
});

export const listFeedbackController = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw new ApiError(401, "Unauthorized");

  const { page, pageSize } = req.query as any;
  const result = await listFeedback(req.auth, page, pageSize);

  return okPaginated(res, result.items, result.pagination, "Feedback fetched");
});

export const deleteFeedbackController = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw new ApiError(401, "Unauthorized");

  const deleted = await deleteFeedback(req.auth, String(req.params.id));
  if (!deleted) throw new ApiError(404, "Feedback not found");

  await tryCreateAuditLog({
    actorUserId: req.auth.userId,
    action: "feedback.delete",
    resourceType: "feedback",
    resourceId: deleted.id,
    status: "success",
    ...buildAuditContext(req),
  });

  return ok(res, { id: deleted.id }, "Feedback deleted");
});
