import { UserRole } from "@prisma/client";
import { Router } from "express";
import { authorize } from "../../middlewares/authorize";
import { validate } from "../../middlewares/validate";
import {
  createScreeningRecordController,
  deleteCancerSnapshotController,
  deleteHealthSnapshotController,
  deletePracticeContactController,
  getCancerSnapshotController,
  getHealthSnapshotController,
  getScreeningRecordController,
  importHistoryController,
  listPracticeContactsController,
  listDefinitionsController,
  listDueItemsController,
  listPlansController,
  listScreeningRecordsController,
  putPracticeContactController,
  putCancerSnapshotController,
  putHealthSnapshotController,
  seedScreeningDefinitionsController,
  upsertPlanController,
} from "./screening.controller";
import {
  createScreeningRecordSchema,
  deletePracticeContactSchema,
  dueItemsQuerySchema,
  importScreeningHistorySchema,
  listDefinitionsSchema,
  listPlansSchema,
  putPracticeContactSchema,
  listScreeningRecordsSchema,
  putCancerSnapshotSchema,
  putHealthSnapshotSchema,
  recordIdParamSchema,
  upsertPlanSchema,
} from "./screening.validation";

export const screeningsRouter = Router();

screeningsRouter.post(
  "/internal/screenings/seed",
  authorize(UserRole.ADMIN),
  seedScreeningDefinitionsController,
);

screeningsRouter.get(
  "/me/screenings/definitions",
  validate(listDefinitionsSchema),
  listDefinitionsController,
);
screeningsRouter.get(
  "/me/screenings/plans",
  validate(listPlansSchema),
  listPlansController,
);
screeningsRouter.put(
  "/me/screenings/plans/:screeningCode",
  validate(upsertPlanSchema),
  upsertPlanController,
);
screeningsRouter.get(
  "/me/screenings/due-items",
  validate(dueItemsQuerySchema),
  listDueItemsController,
);

screeningsRouter.get(
  "/me/screenings/cancer-snapshot",
  getCancerSnapshotController,
);
screeningsRouter.put(
  "/me/screenings/cancer-snapshot",
  validate(putCancerSnapshotSchema),
  putCancerSnapshotController,
);
screeningsRouter.delete(
  "/me/screenings/cancer-snapshot",
  deleteCancerSnapshotController,
);

screeningsRouter.get(
  "/me/screenings/health-snapshot",
  getHealthSnapshotController,
);
screeningsRouter.put(
  "/me/screenings/health-snapshot",
  validate(putHealthSnapshotSchema),
  putHealthSnapshotController,
);
screeningsRouter.delete(
  "/me/screenings/health-snapshot",
  deleteHealthSnapshotController,
);

screeningsRouter.get(
  "/me/screenings/practice-contacts",
  listPracticeContactsController,
);
screeningsRouter.put(
  "/me/screenings/practice-contacts",
  validate(putPracticeContactSchema),
  putPracticeContactController,
);
screeningsRouter.delete(
  "/me/screenings/practice-contacts",
  validate(deletePracticeContactSchema),
  deletePracticeContactController,
);

screeningsRouter.post(
  "/me/screenings/records",
  validate(createScreeningRecordSchema),
  createScreeningRecordController,
);
screeningsRouter.get(
  "/me/screenings/records",
  validate(listScreeningRecordsSchema),
  listScreeningRecordsController,
);
screeningsRouter.get(
  "/me/screenings/records/:recordId",
  validate(recordIdParamSchema),
  getScreeningRecordController,
);

screeningsRouter.post(
  "/me/screenings/history/import",
  validate(importScreeningHistorySchema),
  importHistoryController,
);
