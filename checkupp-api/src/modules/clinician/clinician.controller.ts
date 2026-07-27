import { Request, Response } from "express";
import { asyncHandler } from "../../middlewares/async-handler";
import { ApiError } from "../../middlewares/error-handler";
import { buildAuditContext, tryCreateAuditLog } from "../../services/audit.service";
import { ok } from "../../utils/http";
import {
  createCareTask,
  createCohort,
  createReminderRequest,
  createSavedView,
  deleteSavedView,
  getClinicianProfile,
  getPatientTimeline,
  listCohorts,
  linkPatient,
  linkPatientByEmail,
  listPatientWorklist,
  listPatients,
  listSavedViews,
  reviewWalletDocument,
  requestConsent,
  revokeConsent,
  sendPatientMessage,
  unlinkPatient,
  updateCareTask,
  updateReminderRequest,
  upsertClinicianProfile,
} from "./clinician.service";

export const getClinicianProfileController = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.auth) throw new ApiError(401, "Unauthorized");

    const profile = await getClinicianProfile(req.auth);
    if (!profile) throw new ApiError(404, "Clinician profile not found");

    return ok(res, profile, "Clinician profile fetched");
  }
);

export const upsertClinicianProfileController = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.auth) throw new ApiError(401, "Unauthorized");

    const profile = await upsertClinicianProfile(req.auth, req.body);

    await tryCreateAuditLog({
      actorUserId: req.auth.userId,
      action: "clinician.profile.upsert",
      resourceType: "clinician_profile",
      resourceId: profile.id,
      status: "success",
      ...buildAuditContext(req),
    });

    return ok(res, profile, "Clinician profile saved");
  }
);

export const listClinicianPatientsController = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.auth) throw new ApiError(401, "Unauthorized");

    const result = await listPatients(req.auth, req.query as any);

    return ok(
      res,
      {
        items: result.items,
        pagination: result.pagination,
      },
      "Patients fetched"
    );
  }
);

export const linkPatientController = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw new ApiError(401, "Unauthorized");

  const link = await linkPatient(
    req.auth,
    String(req.params.patientId),
    (req.body.relationshipType as string) ?? "PRIMARY"
  );

  await tryCreateAuditLog({
    actorUserId: req.auth.userId,
    action: "clinician.patient.link",
    resourceType: "patient_link",
    resourceId: link.id,
    status: "success",
    meta: { patientId: String(req.params.patientId) },
    ...buildAuditContext(req),
  });

  return ok(res, link, "Patient linked");
});

export const linkPatientByEmailController = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.auth) throw new ApiError(401, "Unauthorized");

    const patientEmail = String(req.body.patientEmail);
    const relationshipType = (req.body.relationshipType as string) ?? "PRIMARY";

    const link = await linkPatientByEmail(req.auth, patientEmail, relationshipType);

    await tryCreateAuditLog({
      actorUserId: req.auth.userId,
      action: "clinician.patient.link",
      resourceType: "patient_link",
      resourceId: link.id,
      status: "success",
      meta: { patientEmail: patientEmail.trim().toLowerCase() },
      ...buildAuditContext(req),
    });

    return ok(res, link, "Patient linked");
  }
);

export const unlinkPatientController = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw new ApiError(401, "Unauthorized");

  const patientId = String(req.params.patientId);
  const link = await unlinkPatient(req.auth, patientId);
  if (!link) throw new ApiError(404, "Active patient link not found");

  await tryCreateAuditLog({
    actorUserId: req.auth.userId,
    action: "clinician.patient.unlink",
    resourceType: "patient_link",
    resourceId: link.id,
    status: "success",
    meta: { patientId },
    ...buildAuditContext(req),
  });

  return ok(res, link, "Patient unlinked");
});

export const requestConsentController = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw new ApiError(401, "Unauthorized");

  const patientId = String(req.params.patientId);
  const consent = await requestConsent(req.auth, patientId, req.body ?? {});

  await tryCreateAuditLog({
    actorUserId: req.auth.userId,
    action: "clinician.consent.request",
    resourceType: "consent_grant",
    resourceId: consent.id,
    status: "success",
    meta: { patientId },
    ...buildAuditContext(req),
  });

  return ok(res, consent, "Consent request submitted");
});

export const revokeConsentController = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw new ApiError(401, "Unauthorized");

  const patientId = String(req.params.patientId);
  const consent = await revokeConsent(req.auth, patientId, req.body ?? {});
  if (!consent) throw new ApiError(404, "Active/requested consent not found");

  await tryCreateAuditLog({
    actorUserId: req.auth.userId,
    action: "clinician.consent.revoke",
    resourceType: "consent_grant",
    resourceId: consent.id,
    status: "success",
    meta: {
      patientId,
      reason: req.body?.reason,
    },
    ...buildAuditContext(req),
  });

  return ok(res, consent, "Consent revoked");
});

export const getPatientTimelineController = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.auth) throw new ApiError(401, "Unauthorized");

    const patientId = String(req.params.patientId);
    const timeline = await getPatientTimeline(req.auth, patientId, req.query as any);

    await tryCreateAuditLog({
      actorUserId: req.auth.userId,
      action: "clinician.patient.timeline.read",
      resourceType: "patient",
      resourceId: patientId,
      status: "success",
      meta: {
        screeningLimit: req.query.screeningLimit,
        dueItemLimit: req.query.dueItemLimit,
        documentLimit: req.query.documentLimit,
        feedbackLimit: req.query.feedbackLimit,
      },
      ...buildAuditContext(req),
    });

    return ok(res, timeline, "Patient timeline fetched");
  }
);

export const listPatientWorklistController = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.auth) throw new ApiError(401, "Unauthorized");

    const result = await listPatientWorklist(req.auth, req.query as any);
    return ok(res, result, "Patient worklist fetched");
  },
);

export const listSavedViewsController = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.auth) throw new ApiError(401, "Unauthorized");

    const views = await listSavedViews(req.auth, req.query.viewType as string | undefined);
    return ok(res, views, "Saved views fetched");
  },
);

export const createSavedViewController = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.auth) throw new ApiError(401, "Unauthorized");

    const view = await createSavedView(req.auth, req.body);
    await tryCreateAuditLog({
      actorUserId: req.auth.userId,
      action: "clinician.saved_view.create",
      resourceType: "clinician_saved_view",
      resourceId: view.id,
      status: "success",
      ...buildAuditContext(req),
    });

    return ok(res, view, "Saved view created");
  },
);

export const deleteSavedViewController = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.auth) throw new ApiError(401, "Unauthorized");

    const view = await deleteSavedView(req.auth, String(req.params.viewId));
    await tryCreateAuditLog({
      actorUserId: req.auth.userId,
      action: "clinician.saved_view.delete",
      resourceType: "clinician_saved_view",
      resourceId: view.id,
      status: "success",
      ...buildAuditContext(req),
    });

    return ok(res, view, "Saved view deleted");
  },
);

export const createCareTaskController = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.auth) throw new ApiError(401, "Unauthorized");

    const task = await createCareTask(req.auth, req.body);
    await tryCreateAuditLog({
      actorUserId: req.auth.userId,
      action: "clinician.care_task.create",
      resourceType: "care_task",
      resourceId: task.id,
      status: "success",
      meta: { patientId: task.patientId },
      ...buildAuditContext(req),
    });

    return ok(res, task, "Care task created");
  },
);

export const updateCareTaskController = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.auth) throw new ApiError(401, "Unauthorized");

    const task = await updateCareTask(req.auth, String(req.params.taskId), req.body);
    await tryCreateAuditLog({
      actorUserId: req.auth.userId,
      action: "clinician.care_task.update",
      resourceType: "care_task",
      resourceId: task.id,
      status: "success",
      meta: { patientId: task.patientId, status: task.status },
      ...buildAuditContext(req),
    });

    return ok(res, task, "Care task updated");
  },
);

export const sendPatientMessageController = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.auth) throw new ApiError(401, "Unauthorized");

    const message = await sendPatientMessage(req.auth, req.body);
    await tryCreateAuditLog({
      actorUserId: req.auth.userId,
      action: "clinician.patient_message.send",
      resourceType: "patient_message",
      resourceId: message.id,
      status: "success",
      meta: { patientId: message.patientId, channel: message.channel },
      ...buildAuditContext(req),
    });

    return ok(res, message, "Message sent");
  },
);

export const createReminderRequestController = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.auth) throw new ApiError(401, "Unauthorized");

    const reminder = await createReminderRequest(req.auth, req.body);
    await tryCreateAuditLog({
      actorUserId: req.auth.userId,
      action: "clinician.reminder_request.create",
      resourceType: "patient_reminder_request",
      resourceId: reminder.id,
      status: "success",
      meta: { patientId: reminder.patientId },
      ...buildAuditContext(req),
    });

    return ok(res, reminder, "Reminder request created");
  },
);

export const updateReminderRequestController = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.auth) throw new ApiError(401, "Unauthorized");

    const reminder = await updateReminderRequest(
      req.auth,
      String(req.params.reminderId),
      req.body,
    );
    await tryCreateAuditLog({
      actorUserId: req.auth.userId,
      action: "clinician.reminder_request.update",
      resourceType: "patient_reminder_request",
      resourceId: reminder.id,
      status: "success",
      meta: { patientId: reminder.patientId, status: reminder.status },
      ...buildAuditContext(req),
    });

    return ok(res, reminder, "Reminder request updated");
  },
);

export const reviewWalletDocumentController = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.auth) throw new ApiError(401, "Unauthorized");

    const review = await reviewWalletDocument(req.auth, req.body);
    await tryCreateAuditLog({
      actorUserId: req.auth.userId,
      action: "clinician.document_review.upsert",
      resourceType: "wallet_document_review",
      resourceId: review.id,
      status: "success",
      meta: { walletDocumentId: review.walletDocumentId, reviewStatus: review.status },
      ...buildAuditContext(req),
    });

    return ok(res, review, "Document review saved");
  },
);

export const listCohortsController = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.auth) throw new ApiError(401, "Unauthorized");

    const cohorts = await listCohorts(req.auth);
    return ok(res, cohorts, "Cohorts fetched");
  },
);

export const createCohortController = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.auth) throw new ApiError(401, "Unauthorized");

    const cohort = await createCohort(req.auth, req.body);
    await tryCreateAuditLog({
      actorUserId: req.auth.userId,
      action: "clinician.cohort.create",
      resourceType: "patient_cohort",
      resourceId: cohort.id,
      status: "success",
      meta: { memberCount: cohort._count.members },
      ...buildAuditContext(req),
    });

    return ok(res, cohort, "Cohort created");
  },
);
