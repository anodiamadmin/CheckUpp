import { Request, Response } from "express";
import { asyncHandler } from "../../middlewares/async-handler";
import { ApiError } from "../../middlewares/error-handler";
import {
  buildAuditContext,
  tryCreateAuditLog,
} from "../../services/audit.service";
import { created, ok, okPaginated } from "../../utils/http";
import {
  createImmunisation,
  deleteImmunisationById,
  getImmunisationById,
  getImmunisationSummary,
  listImmunisations,
  listUpcomingImmunisations,
  patchImmunisationById,
} from "./immunisation.service";

export const createImmunisationController = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.auth) throw new ApiError(401, "Unauthorized");

    const item = await createImmunisation(req.auth, req.body);

    await tryCreateAuditLog({
      actorUserId: req.auth.userId,
      action: "immunisation.create",
      resourceType: "immunisation",
      resourceId: item.id,
      status: "success",
      ...buildAuditContext(req),
    });

    return created(res, item, "Immunisation created");
  },
);

export const listImmunisationsController = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.auth) throw new ApiError(401, "Unauthorized");

    const result = await listImmunisations(req.auth, req.query as any);
    return okPaginated(
      res,
      result.items,
      result.pagination,
      "Immunisations fetched",
    );
  },
);

export const getImmunisationByIdController = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.auth) throw new ApiError(401, "Unauthorized");

    const item = await getImmunisationById(req.auth, String(req.params.id));
    if (!item) throw new ApiError(404, "Immunisation not found");

    return ok(res, item, "Immunisation fetched");
  },
);

export const patchImmunisationByIdController = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.auth) throw new ApiError(401, "Unauthorized");

    const item = await patchImmunisationById(
      req.auth,
      String(req.params.id),
      req.body,
    );
    if (!item) throw new ApiError(404, "Immunisation not found");

    await tryCreateAuditLog({
      actorUserId: req.auth.userId,
      action: "immunisation.update",
      resourceType: "immunisation",
      resourceId: item.id,
      status: "success",
      ...buildAuditContext(req),
    });

    return ok(res, item, "Immunisation updated");
  },
);

export const deleteImmunisationByIdController = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.auth) throw new ApiError(401, "Unauthorized");

    const deleted = await deleteImmunisationById(
      req.auth,
      String(req.params.id),
    );
    if (!deleted) throw new ApiError(404, "Immunisation not found");

    await tryCreateAuditLog({
      actorUserId: req.auth.userId,
      action: "immunisation.delete",
      resourceType: "immunisation",
      resourceId: deleted.id,
      status: "success",
      ...buildAuditContext(req),
    });

    return ok(res, { id: deleted.id }, "Immunisation deleted");
  },
);

export const listUpcomingImmunisationsController = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.auth) throw new ApiError(401, "Unauthorized");

    const result = await listUpcomingImmunisations(req.auth, req.query as any);

    return res.status(200).json({
      success: true,
      message: "Upcoming immunisations fetched",
      data: result.items,
      pagination: result.pagination,
      meta: result.meta,
    });
  },
);

export const getImmunisationSummaryController = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.auth) throw new ApiError(401, "Unauthorized");

    const requestedDaysAhead = Number(req.query.daysAhead ?? 30);
    const daysAhead =
      Number.isFinite(requestedDaysAhead) && requestedDaysAhead >= 1
        ? Math.trunc(requestedDaysAhead)
        : 30;
    const summary = await getImmunisationSummary(req.auth, daysAhead);
    return ok(res, summary, "Immunisation summary fetched");
  },
);
