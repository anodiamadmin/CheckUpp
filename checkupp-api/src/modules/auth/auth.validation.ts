import Joi from "joi";

const email = Joi.string().email().lowercase().trim().required();
const password = Joi.string().min(8).max(128).required();
const code = Joi.string().pattern(/^\d{6}$/).required();
const appType = Joi.string().valid("mobile", "web").required();

export const signupSchema = {
  body: Joi.object({
    email,
    password,
    name: Joi.string().min(2).max(120).trim().optional(),
    phoneNumber: Joi.string().max(30).allow("", null).optional(),
    role: Joi.string().valid("PATIENT", "CLINICIAN", "ADMIN").optional(),
    appType,
  }),
};

export const signinSchema = {
  body: Joi.object({
    email,
    password,
  }),
};

export const refreshSchema = {
  body: Joi.object({
    refreshToken: Joi.string().required(),
  }),
};

export const logoutSchema = {
  body: Joi.object({
    refreshToken: Joi.string().optional(),
  }).optional(),
};

export const checkEmailSchema = {
  body: Joi.object({
    email,
  }),
};

export const verificationCodeSchema = {
  body: Joi.object({
    email,
    appType,
  }),
};

export const verifyUserCodeSchema = {
  body: Joi.object({
    email,
    code,
  }),
};

export const forgotPasswordSchema = {
  body: Joi.object({
    email,
    appType,
  }),
};

export const verifyResetCodeSchema = {
  body: Joi.object({
    email,
    code,
  }),
};

export const resetPasswordSchema = {
  body: Joi.object({
    email,
    code,
    newPassword: password,
  }),
};

export const socialSigninSchema = {
  body: Joi.object({
    provider: Joi.string().valid("google", "apple").required(),
    idToken: Joi.string().required(),
    accessToken: Joi.string().optional(),
  }),
};
