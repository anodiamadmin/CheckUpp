import { Router } from "express";
import { validate } from "../../middlewares/validate";
import {
  checkEmailController,
  forgotPasswordController,
  logoutController,
  refreshController,
  resetPasswordController,
  sendVerificationCodeController,
  signinController,
  signupController,
  socialSigninController,
  verifyResetCodeController,
  verifyUserCodeController,
} from "./auth.controller";
import {
  checkEmailSchema,
  forgotPasswordSchema,
  logoutSchema,
  refreshSchema,
  resetPasswordSchema,
  signinSchema,
  signupSchema,
  socialSigninSchema,
  verificationCodeSchema,
  verifyResetCodeSchema,
  verifyUserCodeSchema,
} from "./auth.validation";

export const authRouter = Router();

authRouter.post("/auth/signup", validate(signupSchema), signupController);
authRouter.post("/auth/signin", validate(signinSchema), signinController);
authRouter.post("/auth/social-signin", validate(socialSigninSchema), socialSigninController);
authRouter.post("/auth/refresh", validate(refreshSchema), refreshController);
authRouter.post("/auth/logout", validate(logoutSchema), logoutController);
authRouter.post("/auth/check-email", validate(checkEmailSchema), checkEmailController);
authRouter.post(
  "/auth/send-verification-code",
  validate(verificationCodeSchema),
  sendVerificationCodeController
);
authRouter.post(
  "/auth/verify-user-code",
  validate(verifyUserCodeSchema),
  verifyUserCodeController
);
authRouter.post("/auth/forgot-password", validate(forgotPasswordSchema), forgotPasswordController);
authRouter.post(
  "/auth/verify-reset-code",
  validate(verifyResetCodeSchema),
  verifyResetCodeController
);
authRouter.post("/auth/reset-password", validate(resetPasswordSchema), resetPasswordController);
