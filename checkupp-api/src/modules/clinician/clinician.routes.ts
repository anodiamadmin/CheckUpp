import { UserRole } from "@prisma/client";
import { Router } from "express";
import { authorize } from "../../middlewares/authorize";
import { validate } from "../../middlewares/validate";
import {
  createCareTaskController,
  createCohortController,
  createReminderRequestController,
  createSavedViewController,
  deleteSavedViewController,
  getClinicianProfileController,
  getPatientTimelineController,
  linkPatientByEmailController,
  linkPatientController,
  listCohortsController,
  listClinicianPatientsController,
  listPatientWorklistController,
  listSavedViewsController,
  reviewWalletDocumentController,
  requestConsentController,
  revokeConsentController,
  sendPatientMessageController,
  unlinkPatientController,
  updateCareTaskController,
  updateReminderRequestController,
  upsertClinicianProfileController,
} from "./clinician.controller";
import {
  createCareTaskSchema,
  createCohortSchema,
  createReminderRequestSchema,
  linkPatientByEmailSchema,
  linkPatientSchema,
  listClinicianPatientsSchema,
  patientIdParamSchema,
  patientTimelineQuerySchema,
  patientWorklistSchema,
  reminderIdParamSchema,
  requestConsentSchema,
  revokeConsentSchema,
  reviewDocumentSchema,
  savedViewIdParamSchema,
  savedViewQuerySchema,
  savedViewSchema,
  sendPatientMessageSchema,
  taskIdParamSchema,
  updateCareTaskSchema,
  updateReminderRequestSchema,
  upsertClinicianProfileSchema,
} from "./clinician.validation";

export const clinicianRouter = Router();

clinicianRouter.use("/clinician", authorize(UserRole.CLINICIAN, UserRole.ADMIN));

clinicianRouter.get("/clinician/profile", getClinicianProfileController);
clinicianRouter.put(
  "/clinician/profile",
  validate(upsertClinicianProfileSchema),
  upsertClinicianProfileController
);

clinicianRouter.get(
  "/clinician/patients",
  validate(listClinicianPatientsSchema),
  listClinicianPatientsController
);

clinicianRouter.get(
  "/clinician/worklist",
  validate(patientWorklistSchema),
  listPatientWorklistController,
);

clinicianRouter.get(
  "/clinician/saved-views",
  validate(savedViewQuerySchema),
  listSavedViewsController,
);

clinicianRouter.post(
  "/clinician/saved-views",
  validate(savedViewSchema),
  createSavedViewController,
);

clinicianRouter.delete(
  "/clinician/saved-views/:viewId",
  validate(savedViewIdParamSchema),
  deleteSavedViewController,
);

clinicianRouter.post(
  "/clinician/tasks",
  validate(createCareTaskSchema),
  createCareTaskController,
);

clinicianRouter.patch(
  "/clinician/tasks/:taskId",
  validate(taskIdParamSchema),
  validate(updateCareTaskSchema),
  updateCareTaskController,
);

clinicianRouter.post(
  "/clinician/messages",
  validate(sendPatientMessageSchema),
  sendPatientMessageController,
);

clinicianRouter.post(
  "/clinician/reminders",
  validate(createReminderRequestSchema),
  createReminderRequestController,
);

clinicianRouter.patch(
  "/clinician/reminders/:reminderId",
  validate(reminderIdParamSchema),
  validate(updateReminderRequestSchema),
  updateReminderRequestController,
);

clinicianRouter.post(
  "/clinician/document-reviews",
  validate(reviewDocumentSchema),
  reviewWalletDocumentController,
);

clinicianRouter.get("/clinician/cohorts", listCohortsController);

clinicianRouter.post(
  "/clinician/cohorts",
  validate(createCohortSchema),
  createCohortController,
);

clinicianRouter.post(
  "/clinician/patients/link-by-email",
  validate(linkPatientByEmailSchema),
  linkPatientByEmailController
);

clinicianRouter.post(
  "/clinician/patients/:patientId/link",
  validate(patientIdParamSchema),
  validate(linkPatientSchema),
  linkPatientController
);

clinicianRouter.delete(
  "/clinician/patients/:patientId/link",
  validate(patientIdParamSchema),
  unlinkPatientController
);

clinicianRouter.post(
  "/clinician/patients/:patientId/consent/request",
  validate(patientIdParamSchema),
  validate(requestConsentSchema),
  requestConsentController
);

clinicianRouter.post(
  "/clinician/patients/:patientId/consent",
  validate(patientIdParamSchema),
  validate(requestConsentSchema),
  requestConsentController
);

clinicianRouter.post(
  "/clinician/patients/:patientId/consent/revoke",
  validate(patientIdParamSchema),
  validate(revokeConsentSchema),
  revokeConsentController
);

clinicianRouter.get(
  "/clinician/patients/:patientId/timeline",
  validate(patientIdParamSchema),
  validate(patientTimelineQuerySchema),
  getPatientTimelineController
);
