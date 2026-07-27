import { Router } from "express";
import { validate } from "../../middlewares/validate";
import {
  deletePregnancyPlanController,
  getPregnancyPlanController,
  patchPregnancyCheckupController,
  upsertPregnancyPlanController,
} from "./pregnancy.controller";
import {
  patchCheckupCompletionSchema,
  upsertPregnancyPlanSchema,
} from "./pregnancy.validation";

export const pregnancyRouter = Router();

pregnancyRouter.get("/me/pregnancy-plan", getPregnancyPlanController);
pregnancyRouter.put(
  "/me/pregnancy-plan",
  validate(upsertPregnancyPlanSchema),
  upsertPregnancyPlanController
);
pregnancyRouter.patch(
  "/me/pregnancy-plan/checkups/:name",
  validate(patchCheckupCompletionSchema),
  patchPregnancyCheckupController
);
pregnancyRouter.delete("/me/pregnancy-plan", deletePregnancyPlanController);
