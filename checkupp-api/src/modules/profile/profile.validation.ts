import Joi from "joi";

const genderSchema = Joi.string()
  .valid(
    "male",
    "female",
    "prefer not to say",
    "unknown",
    "MALE",
    "FEMALE",
    "PREFER_NOT_TO_SAY",
    "UNKNOWN"
  )
  .optional();

const profileFields = {
  email: Joi.string().email().optional(),
  name: Joi.string().min(2).max(120).optional(),
  phoneNumber: Joi.string().max(30).allow("", null).optional(),
  gender: genderSchema,
  dob: Joi.date().iso().allow(null).optional(),
  avatarUrl: Joi.string().uri().allow("", null).optional(),
};

export const upsertProfileSchema = {
  body: Joi.object(profileFields).min(1),
};

export const patchProfileSchema = {
  body: Joi.object(profileFields).min(1),
};
