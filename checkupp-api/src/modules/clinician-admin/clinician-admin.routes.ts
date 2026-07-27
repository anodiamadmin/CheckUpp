import { UserRole } from "@prisma/client";
import { Router } from "express";
import { authorize } from "../../middlewares/authorize";
import { validate } from "../../middlewares/validate";
import {
  createClinicianController,
  createOrganizationController,
  listAuditLogsController,
  listCliniciansController,
  listOrganizationPermissionsController,
  listOrganizationsController,
  updateClinicianController,
  updateOrganizationController,
  upsertOrganizationPermissionController,
} from "./clinician-admin.controller";
import {
  clinicianIdParamSchema,
  createClinicianSchema,
  createOrganizationSchema,
  listAuditLogsSchema,
  listCliniciansSchema,
  listOrganizationPermissionsSchema,
  listOrganizationsSchema,
  organizationIdParamSchema,
  updateClinicianSchema,
  updateOrganizationSchema,
  upsertOrganizationPermissionSchema,
} from "./clinician-admin.validation";

export const clinicianAdminRouter = Router();

clinicianAdminRouter.use("/clinician-admin", authorize(UserRole.ADMIN));

clinicianAdminRouter.get(
  "/clinician-admin/organizations",
  validate(listOrganizationsSchema),
  listOrganizationsController,
);

clinicianAdminRouter.post(
  "/clinician-admin/organizations",
  validate(createOrganizationSchema),
  createOrganizationController,
);

clinicianAdminRouter.patch(
  "/clinician-admin/organizations/:organizationId",
  validate(organizationIdParamSchema),
  validate(updateOrganizationSchema),
  updateOrganizationController,
);

clinicianAdminRouter.get(
  "/clinician-admin/clinicians",
  validate(listCliniciansSchema),
  listCliniciansController,
);

clinicianAdminRouter.post(
  "/clinician-admin/clinicians",
  validate(createClinicianSchema),
  createClinicianController,
);

clinicianAdminRouter.patch(
  "/clinician-admin/clinicians/:clinicianId",
  validate(clinicianIdParamSchema),
  validate(updateClinicianSchema),
  updateClinicianController,
);

clinicianAdminRouter.get(
  "/clinician-admin/organization-permissions",
  validate(listOrganizationPermissionsSchema),
  listOrganizationPermissionsController,
);

clinicianAdminRouter.post(
  "/clinician-admin/organization-permissions",
  validate(upsertOrganizationPermissionSchema),
  upsertOrganizationPermissionController,
);

clinicianAdminRouter.get(
  "/clinician-admin/audit-logs",
  validate(listAuditLogsSchema),
  listAuditLogsController,
);
