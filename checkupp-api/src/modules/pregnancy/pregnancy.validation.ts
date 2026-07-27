import Joi from "joi";

const checkupItemSchema = Joi.object({
  name: Joi.string().min(1).required(),
  date: Joi.string().required(),
  completed: Joi.boolean().required(),
}).unknown(true);

export const upsertPregnancyPlanSchema = {
  body: Joi.object({
    conceptionDate: Joi.date().iso().allow(null).optional(),
    lmpDate: Joi.date().iso().allow(null).optional(),
    expectedDueDate: Joi.date().iso().allow(null).optional(),
    estimatedCheckupDates: Joi.alternatives()
      .try(Joi.array().items(checkupItemSchema), Joi.string(), Joi.object())
      .required(),
  }).or("conceptionDate", "lmpDate", "expectedDueDate"),
};

export const patchCheckupCompletionSchema = {
  params: Joi.object({
    name: Joi.string().min(1).required(),
  }),
  body: Joi.object({
    completed: Joi.boolean().optional(),
    cascadeMode: Joi.string().valid("single", "current_and_prior").default("current_and_prior"),
  }).optional(),
};
