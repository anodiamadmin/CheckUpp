import { Router } from "express";
import { validate } from "../../middlewares/validate";
import {
  deleteProfileController,
  getProfileController,
  patchProfileController,
  upsertProfileController,
} from "./profile.controller";
import { patchProfileSchema, upsertProfileSchema } from "./profile.validation";

export const profileRouter = Router();

profileRouter.get("/me/profile", getProfileController);
profileRouter.post("/me/profile", validate(upsertProfileSchema), upsertProfileController);
profileRouter.patch("/me/profile", validate(patchProfileSchema), patchProfileController);
profileRouter.delete("/me/profile", deleteProfileController);
