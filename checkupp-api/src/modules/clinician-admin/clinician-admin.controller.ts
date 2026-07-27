import { Request, Response } from "express";
import { asyncHandler } from "../../middlewares/async-handler";
import { ApiError } from "../../middlewares/error-handler";
import { buildAuditContext, tryCreateAuditLog } from "../../services/audit.service";
import { created, ok } from "../../utils/http";
import {
  createClinician,
  createOrganization,
  listAuditLogs,
  listClinicians,
  listOrganizationPermissions,
  listOrganizations,
  updateClinician,
  updateOrganization,
  upsertOrganizationPermission,
} from "./clinician-admin.service";

export const listOrganizationsController = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await listOrganizations(req.query as any);
    return ok(res, result, "Organizations fetched");
  },
);

export const createOrganizationController = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.auth) throw new ApiError(401, "Unauthorized");

    const organization = await createOrganization(req.body);

    await tryCreateAuditLog({
      actorUserId: req.auth.userId,
      action: "clinician_admin.organization.create",
      resourceType: "organization",
      resourceId: organization.id,
      status: "success",
      ...buildAuditContext(req),
    });

    return created(res, organization, "Organization created");
  },
);

export const updateOrganizationController = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.auth) throw new ApiError(401, "Unauthorized");

    const organization = await updateOrganization(
      String(req.params.organizationId),
      req.body,
    );

    await tryCreateAuditLog({
      actorUserId: req.auth.userId,
      action: "clinician_admin.organization.update",
      resourceType: "organization",
      resourceId: organization.id,
      status: "success",
      ...buildAuditContext(req),
    });

    return ok(res, organization, "Organization updated");
  },
);

export const listCliniciansController = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await listClinicians(req.query as any);
    return ok(res, result, "Clinicians fetched");
  },
);

export const createClinicianController = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.auth) throw new ApiError(401, "Unauthorized");

    const clinician = await createClinician(req.body);

    await tryCreateAuditLog({
      actorUserId: req.auth.userId,
      action: "clinician_admin.clinician.create",
      resourceType: "clinician_profile",
      resourceId: clinician.id,
      status: "success",
      meta: { userId: clinician.userId },
      ...buildAuditContext(req),
    });

    return created(res, clinician, "Clinician created");
  },
);

export const updateClinicianController = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.auth) throw new ApiError(401, "Unauthorized");

    const clinician = await updateClinician(String(req.params.clinicianId), req.body);

    await tryCreateAuditLog({
      actorUserId: req.auth.userId,
      action: "clinician_admin.clinician.update",
      resourceType: "clinician_profile",
      resourceId: clinician.id,
      status: "success",
      meta: { userId: clinician.userId },
      ...buildAuditContext(req),
    });

    return ok(res, clinician, "Clinician updated");
  },
);

export const listOrganizationPermissionsController = asyncHandler(
  async (req: Request, res: Response) => {
    const permissions = await listOrganizationPermissions(req.query as any);
    return ok(res, permissions, "Organization permissions fetched");
  },
);

export const upsertOrganizationPermissionController = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.auth) throw new ApiError(401, "Unauthorized");

    const permission = await upsertOrganizationPermission(req.body);
    await tryCreateAuditLog({
      actorUserId: req.auth.userId,
      action: "clinician_admin.organization_permission.upsert",
      resourceType: "organization_user_permission",
      resourceId: permission.id,
      status: "success",
      meta: {
        organizationId: permission.organizationId,
        userId: permission.userId,
        role: permission.role,
      },
      ...buildAuditContext(req),
    });

    return ok(res, permission, "Organization permission saved");
  },
);

export const listAuditLogsController = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await listAuditLogs(req.query as any);
    return ok(res, result, "Audit logs fetched");
  },
);
