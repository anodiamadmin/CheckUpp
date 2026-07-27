import { Request, Response } from "express";
import { asyncHandler } from "../../middlewares/async-handler";
import { ApiError } from "../../middlewares/error-handler";
import { buildAuditContext, tryCreateAuditLog } from "../../services/audit.service";
import { noContent, ok } from "../../utils/http";
import {
  deletePregnancyPlan,
  getPregnancyPlan,
  markCheckupAsCompleted,
  upsertPregnancyPlan,
} from "./pregnancy.service";

export const getPregnancyPlanController = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw new ApiError(401, "Unauthorized");

  const plan = await getPregnancyPlan(req.auth);
  if (!plan) throw new ApiError(404, "Pregnancy plan not found");

  await tryCreateAuditLog({
    actorUserId: req.auth.userId,
    action: "pregnancy_plan.read",
    resourceType: "pregnancy_plan",
    resourceId: plan.id,
    status: "success",
    ...buildAuditContext(req),
  });

  return ok(res, plan, "Pregnancy plan fetched");
});

export const upsertPregnancyPlanController = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw new ApiError(401, "Unauthorized");

  const plan = await upsertPregnancyPlan(req.auth, req.body);

  await tryCreateAuditLog({
    actorUserId: req.auth.userId,
    action: "pregnancy_plan.upsert",
    resourceType: "pregnancy_plan",
    resourceId: plan.id,
    status: "success",
    ...buildAuditContext(req),
  });

  return ok(res, plan, "Pregnancy plan saved");
});

export const patchPregnancyCheckupController = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw new ApiError(401, "Unauthorized");

  const { completed, cascadeMode } = req.body ?? {};

  const plan = await markCheckupAsCompleted(
    req.auth,
    decodeURIComponent(String(req.params.name)),
    completed,
    cascadeMode
  );

  if (!plan) throw new ApiError(404, "Pregnancy plan/checkup not found");

  await tryCreateAuditLog({
    actorUserId: req.auth.userId,
    action: "pregnancy_plan.checkup.update",
    resourceType: "pregnancy_plan",
    resourceId: plan.id,
    status: "success",
    meta: {
      checkupName: req.params.name,
      completed,
      cascadeMode,
    },
    ...buildAuditContext(req),
  });

  return ok(res, plan, "Checkup status updated");
});

export const deletePregnancyPlanController = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw new ApiError(401, "Unauthorized");

  const deleted = await deletePregnancyPlan(req.auth);
  if (!deleted) return noContent(res);

  await tryCreateAuditLog({
    actorUserId: req.auth.userId,
    action: "pregnancy_plan.delete",
    resourceType: "pregnancy_plan",
    resourceId: deleted.id,
    status: "success",
    ...buildAuditContext(req),
  });

  return ok(res, { id: deleted.id }, "Pregnancy plan deleted");
});
