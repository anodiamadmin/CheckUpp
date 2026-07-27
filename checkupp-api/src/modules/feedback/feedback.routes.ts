import { Router } from "express";
import { validate } from "../../middlewares/validate";
import {
  createFeedbackController,
  deleteFeedbackController,
  listFeedbackController,
} from "./feedback.controller";
import {
  createFeedbackSchema,
  feedbackIdParamSchema,
  listFeedbackSchema,
} from "./feedback.validation";

export const feedbackRouter = Router();

feedbackRouter.post("/me/feedback", validate(createFeedbackSchema), createFeedbackController);
feedbackRouter.get("/me/feedback", validate(listFeedbackSchema), listFeedbackController);
feedbackRouter.delete("/me/feedback/:id", validate(feedbackIdParamSchema), deleteFeedbackController);
