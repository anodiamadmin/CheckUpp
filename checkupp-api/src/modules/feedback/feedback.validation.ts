import Joi from "joi";

export const createFeedbackSchema = {
  body: Joi.object({
    feedback: Joi.string().min(3).max(4000).required(),
    rating: Joi.number().integer().min(1).max(5).allow(null).optional(),
    submittedAt: Joi.date().iso().optional(),
  }),
};

export const listFeedbackSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    pageSize: Joi.number().integer().min(1).max(100).default(20),
  }),
};

export const feedbackIdParamSchema = {
  params: Joi.object({
    id: Joi.string().uuid().required(),
  }),
};
