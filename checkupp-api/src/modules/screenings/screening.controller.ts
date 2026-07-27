import { Request, Response } from "express";
import { asyncHandler } from "../../middlewares/async-handler";
import { ApiError } from "../../middlewares/error-handler";
import { buildAuditContext, tryCreateAuditLog } from "../../services/audit.service";
import { accepted, created, noContent, ok, okPaginated } from "../../utils/http";
import {
  createScreeningRecord,
  deleteCancerSnapshot,
  deleteHealthSnapshot,
  deletePracticeContact,
  getCancerSnapshot,
  getHealthSnapshot,
  getScreeningRecordById,
  importHistory,
  listPracticeContacts,
  listDefinitions,
  listDueItems,
  listPlans,
  listScreeningRecords,
  seedScreeningDefinitions,
  upsertCancerSnapshot,
  upsertHealthSnapshot,
  upsertPracticeContact,
  upsertPlan,
} from "./screening.service";

export const seedScreeningDefinitionsController = asyncHandler(
  async (_req: Request, res: Response) => {
    await seedScreeningDefinitions();
    return accepted(res, { seeded: true }, "Screening catalog initialized");
  }
);

export const listDefinitionsController = asyncHandler(async (req: Request, res: Response) => {
  const definitions = await listDefinitions(req.query.domain as string | undefined);
  return ok(res, definitions, "Screening definitions fetched");
});

export const listPlansController = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw new ApiError(401, "Unauthorized");

  const plans = await listPlans(req.auth, req.query.domain as string | undefined);
  return ok(res, plans, "Screening plans fetched");
});

export const upsertPlanController = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw new ApiError(401, "Unauthorized");

  const screeningCode = String(req.params.screeningCode);
  const plan = await upsertPlan(req.auth, screeningCode, req.body);

  await tryCreateAuditLog({
    actorUserId: req.auth.userId,
    action: "screenings.plan.upsert",
    resourceType: "screening_plan",
    resourceId: plan.id,
    status: "success",
    meta: { screeningCode },
    ...buildAuditContext(req),
  });

  return ok(res, plan, "Screening plan saved");
});

export const listDueItemsController = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw new ApiError(401, "Unauthorized");

  const result = await listDueItems(req.auth, req.query as any);
  return okPaginated(res, result.items, result.pagination, "Due items fetched");
});

export const getCancerSnapshotController = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw new ApiError(401, "Unauthorized");

  const snapshot = await getCancerSnapshot(req.auth);
  if (!snapshot) {
    return ok(res, null, "Cancer snapshot not found");
  }

  return ok(res, snapshot, "Cancer snapshot fetched");
});

export const putCancerSnapshotController = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw new ApiError(401, "Unauthorized");

  const snapshot = await upsertCancerSnapshot(req.auth, req.body);

  await tryCreateAuditLog({
    actorUserId: req.auth.userId,
    action: "screenings.cancer_snapshot.upsert",
    resourceType: "cancer_snapshot",
    resourceId: snapshot.id,
    status: "success",
    ...buildAuditContext(req),
  });

  return ok(res, snapshot, "Cancer snapshot saved");
});

export const deleteCancerSnapshotController = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw new ApiError(401, "Unauthorized");

  const deleted = await deleteCancerSnapshot(req.auth);
  if (!deleted) return noContent(res);

  await tryCreateAuditLog({
    actorUserId: req.auth.userId,
    action: "screenings.cancer_snapshot.delete",
    resourceType: "cancer_snapshot",
    resourceId: deleted.id,
    status: "success",
    ...buildAuditContext(req),
  });

  return ok(res, { id: deleted.id }, "Cancer snapshot deleted");
});

export const getHealthSnapshotController = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw new ApiError(401, "Unauthorized");

  const snapshot = await getHealthSnapshot(req.auth);
  if (!snapshot) {
    return ok(res, null, "Health snapshot not found");
  }

  return ok(res, snapshot, "Health snapshot fetched");
});

export const putHealthSnapshotController = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw new ApiError(401, "Unauthorized");

  const snapshot = await upsertHealthSnapshot(req.auth, req.body);

  await tryCreateAuditLog({
    actorUserId: req.auth.userId,
    action: "screenings.health_snapshot.upsert",
    resourceType: "health_snapshot",
    resourceId: snapshot.id,
    status: "success",
    ...buildAuditContext(req),
  });

  return ok(res, snapshot, "Health snapshot saved");
});

export const deleteHealthSnapshotController = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw new ApiError(401, "Unauthorized");

  const deleted = await deleteHealthSnapshot(req.auth);
  if (!deleted) return noContent(res);

  await tryCreateAuditLog({
    actorUserId: req.auth.userId,
    action: "screenings.health_snapshot.delete",
    resourceType: "health_snapshot",
    resourceId: deleted.id,
    status: "success",
    ...buildAuditContext(req),
  });

  return ok(res, { id: deleted.id }, "Health snapshot deleted");
});

export const listPracticeContactsController = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw new ApiError(401, "Unauthorized");

  const contacts = await listPracticeContacts(req.auth);
  return ok(res, contacts, "Practice contacts fetched");
});

export const putPracticeContactController = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw new ApiError(401, "Unauthorized");

  const contact = await upsertPracticeContact(req.auth, req.body);

  await tryCreateAuditLog({
    actorUserId: req.auth.userId,
    action: "screenings.practice_contact.upsert",
    resourceType: "screening_practice_contact",
    resourceId: contact.id,
    status: "success",
    meta: {
      screeningName: contact.screeningName,
      isDefault: contact.isDefault,
    },
    ...buildAuditContext(req),
  });

  return ok(res, contact, "Practice contact saved");
});

export const deletePracticeContactController = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw new ApiError(401, "Unauthorized");

  const deleted = await deletePracticeContact(req.auth, req.body);
  if (!deleted) return noContent(res);

  await tryCreateAuditLog({
    actorUserId: req.auth.userId,
    action: "screenings.practice_contact.delete",
    resourceType: "screening_practice_contact",
    resourceId: deleted.id,
    status: "success",
    meta: {
      screeningName: deleted.screeningName,
      isDefault: deleted.isDefault,
    },
    ...buildAuditContext(req),
  });

  return ok(res, { id: deleted.id }, "Practice contact deleted");
});

export const createScreeningRecordController = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw new ApiError(401, "Unauthorized");

  const record = await createScreeningRecord(req.auth, req.body);

  await tryCreateAuditLog({
    actorUserId: req.auth.userId,
    action: "screenings.record.create",
    resourceType: "screening_record",
    resourceId: record.id,
    status: "success",
    meta: {
      screeningCode: record.screeningCode,
      domain: record.domain,
    },
    ...buildAuditContext(req),
  });

  return created(res, record, "Screening record created");
});

export const listScreeningRecordsController = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw new ApiError(401, "Unauthorized");

  const result = await listScreeningRecords(req.auth, req.query as any);
  return okPaginated(res, result.items, result.pagination, "Screening records fetched");
});

export const getScreeningRecordController = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw new ApiError(401, "Unauthorized");

  const record = await getScreeningRecordById(req.auth, String(req.params.recordId));
  if (!record) throw new ApiError(404, "Screening record not found");

  return ok(res, record, "Screening record fetched");
});

export const importHistoryController = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw new ApiError(401, "Unauthorized");

  const result = await importHistory(req.auth, req.body as any);

  await tryCreateAuditLog({
    actorUserId: req.auth.userId,
    action: "screenings.history.import",
    resourceType: "screening_import_batch",
    resourceId: result.batchId,
    status: result.errors > 0 ? "partial" : "success",
    meta: {
      attempted: result.attempted,
      imported: result.imported,
      errors: result.errors,
    },
    ...buildAuditContext(req),
  });

  return accepted(res, result, "History import processed");
});
