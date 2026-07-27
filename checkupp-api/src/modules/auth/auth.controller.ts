import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import {
  checkEmail,
  forgotPassword,
  logout,
  refreshTokens,
  resetPassword,
  sendVerificationCode,
  signin,
  signup,
  socialSignin,
  verifyResetCode,
  verifyUserCode,
} from "./auth.service";
import {
  getAuthRequestMeta,
  logAuthEvent,
  logAuthFailure,
} from "./auth.logging";
import { createLogRef } from "../../observability/logger";

const bearerToken = (req: Request) => {
  const authHeader = req.header("authorization") ?? "";
  const [scheme, token] = authHeader.split(" ");
  if (scheme?.toLowerCase() !== "bearer") return undefined;
  return token;
};

export const signupController = async (req: Request, res: Response) => {
  const data = await signup(req.body);
  res.status(StatusCodes.CREATED).json({
    success: true,
    message: "User created successfully. Please verify your account.",
    data,
  });
};

export const signinController = async (req: Request, res: Response) => {
  const requestMeta = getAuthRequestMeta(req);

  try {
    const data = await signin(req.body.email, req.body.password);

    logAuthEvent("signin_success", {
      ...requestMeta,
      userRef: createLogRef(data.user.id),
    });

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Signed in successfully",
      data,
    });
  } catch (error) {
    logAuthFailure("signin_failure", error, requestMeta);
    throw error;
  }
};

export const socialSigninController = async (req: Request, res: Response) => {
  const requestMeta = getAuthRequestMeta(req);

  try {
    const data = await socialSignin(req.body);

    logAuthEvent("social_signin_success", {
      ...requestMeta,
      userRef: createLogRef(data.user.id),
    });

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Signed in successfully",
      data,
    });
  } catch (error) {
    logAuthFailure("social_signin_failure", error, requestMeta);
    throw error;
  }
};

export const refreshController = async (req: Request, res: Response) => {
  const data = await refreshTokens(req.body.refreshToken);
  res.status(StatusCodes.OK).json({
    success: true,
    message: "Token refreshed successfully",
    data,
  });
};

export const logoutController = async (req: Request, res: Response) => {
  await logout(bearerToken(req), req.body?.refreshToken);
  res.status(StatusCodes.OK).json({
    success: true,
    message: "Signed out successfully",
  });
};

export const checkEmailController = async (req: Request, res: Response) => {
  const data = await checkEmail(req.body.email);
  res.status(StatusCodes.OK).json({
    success: true,
    message: "Email checked successfully",
    data,
  });
};

export const sendVerificationCodeController = async (
  req: Request,
  res: Response,
) => {
  await sendVerificationCode(req.body.email, req.body.appType);
  res.status(StatusCodes.OK).json({
    success: true,
    message: "Verification code sent successfully",
  });
};

export const verifyUserCodeController = async (req: Request, res: Response) => {
  const user = await verifyUserCode(req.body.email, req.body.code);
  res.status(StatusCodes.OK).json({
    success: true,
    message: "User verified successfully",
    data: { user },
  });
};

export const forgotPasswordController = async (req: Request, res: Response) => {
  await forgotPassword(req.body.email, req.body.appType);
  res.status(StatusCodes.OK).json({
    success: true,
    message: "If an account exists, a password reset code has been sent.",
  });
};

export const verifyResetCodeController = async (
  req: Request,
  res: Response,
) => {
  const codeValid = await verifyResetCode(req.body.email, req.body.code);
  res.status(codeValid ? StatusCodes.OK : StatusCodes.BAD_REQUEST).json({
    success: codeValid,
    message: codeValid
      ? "Reset code verified successfully"
      : "Invalid or expired reset code",
    data: { email: req.body.email, codeValid },
  });
};

export const resetPasswordController = async (req: Request, res: Response) => {
  await resetPassword(req.body.email, req.body.code, req.body.newPassword);
  res.status(StatusCodes.OK).json({
    success: true,
    message: "Password reset successfully",
  });
};
