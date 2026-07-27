import { Request, Response } from "express";
import { asyncHandler } from "../../middlewares/async-handler";
import { ApiError } from "../../middlewares/error-handler";
import { buildAuditContext, tryCreateAuditLog } from "../../services/audit.service";
import { withAppwriteCompat } from "../../utils/compat";
import { created, ok } from "../../utils/http";
import {
  deleteMyProfile,
  getMyProfile,
  patchMyProfile,
  upsertMyProfile,
} from "./profile.service";

export const getProfileController = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw new ApiError(401, "Unauthorized");

  const profile = await getMyProfile(req.auth);
  if (!profile) throw new ApiError(404, "Profile not found");

  await tryCreateAuditLog({
    actorUserId: req.auth.userId,
    action: "profile.read",
    resourceType: "user",
    resourceId: profile.id,
    status: "success",
    ...buildAuditContext(req),
  });

  return ok(res, withAppwriteCompat(profile), "Profile fetched");
});

export const upsertProfileController = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw new ApiError(401, "Unauthorized");

  const profile = await upsertMyProfile(req.auth, req.body);

  await tryCreateAuditLog({
    actorUserId: req.auth.userId,
    action: "profile.upsert",
    resourceType: "user",
    resourceId: profile.id,
    status: "success",
    ...buildAuditContext(req),
  });

  return created(res, withAppwriteCompat(profile), "Profile upserted");
});

export const patchProfileController = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw new ApiError(401, "Unauthorized");

  const profile = await patchMyProfile(req.auth, req.body);

  await tryCreateAuditLog({
    actorUserId: req.auth.userId,
    action: "profile.update",
    resourceType: "user",
    resourceId: profile.id,
    status: "success",
    ...buildAuditContext(req),
  });

  return ok(res, withAppwriteCompat(profile), "Profile updated");
});

export const deleteProfileController = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw new ApiError(401, "Unauthorized");

  const profile = await deleteMyProfile(req.auth);

  await tryCreateAuditLog({
    actorUserId: req.auth.userId,
    action: "profile.delete",
    resourceType: "user",
    resourceId: profile.id,
    status: "success",
    ...buildAuditContext(req),
  });

  return ok(res, { id: profile.id, isDeleted: profile.isDeleted }, "Profile deleted");
});
