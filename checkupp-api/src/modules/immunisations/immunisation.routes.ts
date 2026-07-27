import { Router } from "express";
import { validate } from "../../middlewares/validate";
import {
  createImmunisationController,
  deleteImmunisationByIdController,
  getImmunisationByIdController,
  getImmunisationSummaryController,
  listImmunisationsController,
  listUpcomingImmunisationsController,
  patchImmunisationByIdController,
} from "./immunisation.controller";
import {
  createImmunisationSchema,
  immunisationIdParamSchema,
  immunisationSummarySchema,
  listImmunisationsSchema,
  patchImmunisationSchema,
  upcomingImmunisationsSchema,
} from "./immunisation.validation";

export const immunisationsRouter = Router();

immunisationsRouter.post(
  "/me/immunisations",
  validate(createImmunisationSchema),
  createImmunisationController,
);
immunisationsRouter.get(
  "/me/immunisations",
  validate(listImmunisationsSchema),
  listImmunisationsController,
);
immunisationsRouter.get(
  "/me/immunisations/upcoming",
  validate(upcomingImmunisationsSchema),
  listUpcomingImmunisationsController,
);
immunisationsRouter.get(
  "/me/immunisations/summary",
  validate(immunisationSummarySchema),
  getImmunisationSummaryController,
);
immunisationsRouter.get(
  "/me/immunisations/:id",
  validate(immunisationIdParamSchema),
  getImmunisationByIdController,
);
immunisationsRouter.patch(
  "/me/immunisations/:id",
  validate(immunisationIdParamSchema),
  validate(patchImmunisationSchema),
  patchImmunisationByIdController,
);
immunisationsRouter.delete(
  "/me/immunisations/:id",
  validate(immunisationIdParamSchema),
  deleteImmunisationByIdController,
);
