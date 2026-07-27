import {
  AuthVerificationCodeType,
  Prisma,
  SocialAuthProvider,
  User,
  UserRole,
} from "@prisma/client";
import crypto from "crypto";
import { env } from "../../config/env";
import { prisma } from "../../db/prisma";
import { AuthContext } from "../../types/auth";
import { ApiError } from "../../middlewares/error-handler";
import {
  createSixDigitCode,
  hashOpaqueValue,
  hashPassword,
  hashVerificationCode,
  signToken,
  verifyPassword,
  verifyToken,
} from "./auth.crypto";
import { AUTH_ERROR_CODES, createAuthError } from "./auth.errors";
import { sendAuthEmail } from "./auth.email";
import { verifySocialIdentity } from "./auth.social";

type AuthUser = Pick<
  User,
  | "id"
  | "email"
  | "name"
  | "role"
  | "avatarUrl"
  | "phoneNumber"
  | "emailVerified"
  | "isDeleted"
>;

type AuthEmailAppType = "mobile" | "web";

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const publicUser = (user: AuthUser) => ({
  id: user.id,
  email: user.email,
  name: user.name,
  role: user.role,
  avatarUrl: user.avatarUrl,
  phoneNumber: user.phoneNumber,
  emailVerified: user.emailVerified,
});

const roleForSignup = (raw?: UserRole) => {
  if (!env.allowRoleSignup) return UserRole.PATIENT;
  return raw ?? UserRole.PATIENT;
};

const appendActionPath = (baseUrl: string, path: string) => {
  const cleanPath = path.replace(/^\/+/, "");
  if (baseUrl.endsWith("://")) return `${baseUrl}${cleanPath}`;
  return `${baseUrl.replace(/\/+$/, "")}/${cleanPath}`;
};

const buildAuthActionUrl = (
  appType: AuthEmailAppType,
  path: "verify-email" | "reset-password",
  params: Record<string, string>,
) => {
  const baseUrl = appType === "web" ? env.webAppUrl : env.mobileAppUrl;
  const query = new URLSearchParams(params).toString();
  return `${appendActionPath(baseUrl, path)}?${query}`;
};

const createAuthResponse = async (user: AuthUser) => {
  const session = await prisma.authSession.create({
    data: {
      userId: user.id,
      accessTokenHash: `pending:${crypto.randomUUID()}`,
      refreshTokenHash: `pending:${crypto.randomUUID()}`,
      expiresAt: new Date(Date.now() + env.accessTokenTtlMs),
      refreshExpiresAt: new Date(Date.now() + env.refreshTokenTtlMs),
    },
  });

  const accessToken = signToken(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      sessionId: session.id,
      tokenType: "access",
    },
    env.jwtSecret,
    env.accessTokenTtlMs,
  );
  const refreshToken = signToken(
    {
      sub: user.id,
      sessionId: session.id,
      tokenType: "refresh",
    },
    env.refreshJwtSecret,
    env.refreshTokenTtlMs,
  );

  await prisma.authSession.update({
    where: { id: session.id },
    data: {
      accessTokenHash: hashOpaqueValue(accessToken),
      refreshTokenHash: hashOpaqueValue(refreshToken),
    },
  });

  return {
    user: publicUser(user),
    token: accessToken,
    refreshToken,
    expiresAt: new Date(Date.now() + env.accessTokenTtlMs).toISOString(),
    refreshExpiresAt: new Date(
      Date.now() + env.refreshTokenTtlMs,
    ).toISOString(),
  };
};

const updateSessionTokens = async (sessionId: string, user: AuthUser) => {
  const accessToken = signToken(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      sessionId,
      tokenType: "access",
    },
    env.jwtSecret,
    env.accessTokenTtlMs,
  );
  const refreshToken = signToken(
    {
      sub: user.id,
      sessionId,
      tokenType: "refresh",
    },
    env.refreshJwtSecret,
    env.refreshTokenTtlMs,
  );

  await prisma.authSession.update({
    where: { id: sessionId },
    data: {
      accessTokenHash: hashOpaqueValue(accessToken),
      refreshTokenHash: hashOpaqueValue(refreshToken),
      expiresAt: new Date(Date.now() + env.accessTokenTtlMs),
      refreshExpiresAt: new Date(Date.now() + env.refreshTokenTtlMs),
      revokedAt: null,
    },
  });

  return {
    user: publicUser(user),
    token: accessToken,
    refreshToken,
    expiresAt: new Date(Date.now() + env.accessTokenTtlMs).toISOString(),
    refreshExpiresAt: new Date(
      Date.now() + env.refreshTokenTtlMs,
    ).toISOString(),
  };
};

const sendVerificationCodeForUser = async (
  user: AuthUser,
  type: AuthVerificationCodeType,
  appType: AuthEmailAppType,
) => {
  const code = createSixDigitCode();
  const contact = normalizeEmail(user.email);

  await prisma.authVerificationCode.deleteMany({
    where: {
      userId: user.id,
      contact,
      type,
      usedAt: null,
    },
  });

  await prisma.authVerificationCode.create({
    data: {
      userId: user.id,
      contact,
      codeHash: hashVerificationCode(contact, code),
      type,
      expiresAt: new Date(
        Date.now() + (type === "RESET" ? 15 : 10) * 60 * 1000,
      ),
    },
  });

  if (type === "REGISTER") {
    await sendAuthEmail({
      to: user.email,
      name: user.name,
      subject: "Verify your Checkupp email",
      title: "Verify your email address",
      intro: "Use this code to finish setting up your Checkupp account.",
      code,
      actionUrl: buildAuthActionUrl(appType, "verify-email", {
        email: user.email,
      }),
      actionLabel: "Verify email",
      outro:
        "This code expires in 10 minutes. If you did not create a Checkupp account, you can ignore this message.",
    });
  } else {
    await sendAuthEmail({
      to: user.email,
      name: user.name,
      subject: "Reset your Checkupp password",
      title: "Reset your password",
      intro:
        "Use this code to choose a new password for your Checkupp account.",
      code,
      actionUrl: buildAuthActionUrl(appType, "reset-password", {
        email: user.email,
        code,
      }),
      actionLabel: "Reset password",
      outro:
        "This code expires in 15 minutes. If you did not request a password reset, your current password is still safe.",
    });
  }
};

const verifyCode = async (
  email: string,
  code: string,
  type: AuthVerificationCodeType,
) => {
  const contact = normalizeEmail(email);
  const codeHash = hashVerificationCode(contact, code);
  const verificationCode = await prisma.authVerificationCode.findFirst({
    where: {
      contact,
      codeHash,
      type,
      usedAt: null,
      expiresAt: { gte: new Date() },
    },
    include: { user: true },
  });

  return verificationCode;
};

export const signup = async (input: {
  email: string;
  password: string;
  name?: string;
  phoneNumber?: string | null;
  role?: UserRole;
  appType: AuthEmailAppType;
}) => {
  const email = normalizeEmail(input.email);
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new ApiError(409, "User with this email already exists");
  }

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: await hashPassword(input.password),
      name: input.name?.trim() || email.split("@")[0],
      phoneNumber: input.phoneNumber || null,
      role: roleForSignup(input.role),
      emailVerified: false,
    },
  });

  await sendVerificationCodeForUser(user, "REGISTER", input.appType);

  return {
    user: publicUser(user),
    requiresVerification: env.requireEmailVerification,
  };
};

export const signin = async (emailRaw: string, password: string) => {
  const email = normalizeEmail(emailRaw);
  const user = await prisma.user.findUnique({ where: { email } });

  if (
    !user ||
    user.isDeleted ||
    !(await verifyPassword(password, user.passwordHash))
  ) {
    throw createAuthError(
      401,
      "Invalid email or password",
      AUTH_ERROR_CODES.authInvalidCredentials,
    );
  }

  if (env.requireEmailVerification && !user.emailVerified) {
    throw createAuthError(
      403,
      "Please verify your email before signing in",
      AUTH_ERROR_CODES.authEmailNotVerified,
      { email: user.email },
    );
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  return createAuthResponse(user);
};

export const socialSignin = async (input: {
  provider: "google" | "apple";
  idToken: string;
}) => {
  const identity = await verifySocialIdentity(input.provider, input.idToken);
  const provider =
    input.provider === "google"
      ? SocialAuthProvider.GOOGLE
      : SocialAuthProvider.APPLE;

  const linkedAccount = await prisma.socialAccount.findUnique({
    where: {
      provider_providerUserId: {
        provider,
        providerUserId: identity.providerUserId,
      },
    },
    include: { user: true },
  });

  let user = linkedAccount?.user ?? null;

  if (!user && identity.email) {
    user = await prisma.user.findUnique({ where: { email: identity.email } });
  }

  if (!user) {
    if (!identity.email) {
      throw createAuthError(
        400,
        "Your social account did not provide an email address we can use. Please try another sign-in method.",
        AUTH_ERROR_CODES.socialEmailMissing,
        {
          provider: input.provider,
        },
      );
    }

    user = await prisma.user.create({
      data: {
        email: identity.email,
        name: identity.name?.trim() || identity.email.split("@")[0],
        avatarUrl: identity.avatarUrl,
        role: UserRole.PATIENT,
        emailVerified: identity.emailVerified,
      },
    });
  }

  if (user.isDeleted) {
    throw createAuthError(
      403,
      "User is disabled",
      AUTH_ERROR_CODES.authUserDisabled,
    );
  }

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      lastLoginAt: new Date(),
      emailVerified: user.emailVerified || identity.emailVerified,
      avatarUrl: user.avatarUrl ?? identity.avatarUrl,
    },
  });

  await prisma.socialAccount.upsert({
    where: {
      provider_providerUserId: {
        provider,
        providerUserId: identity.providerUserId,
      },
    },
    create: {
      provider,
      providerUserId: identity.providerUserId,
      email: identity.email,
      userId: updatedUser.id,
    },
    update: {
      email: identity.email,
      userId: updatedUser.id,
    },
  });

  return createAuthResponse(updatedUser);
};

export const refreshTokens = async (refreshToken: string) => {
  const payload = verifyToken(refreshToken, env.refreshJwtSecret);
  if (!payload || payload.tokenType !== "refresh" || !payload.sessionId) {
    throw createAuthError(
      401,
      "Invalid refresh token",
      AUTH_ERROR_CODES.authInvalidRefreshToken,
    );
  }

  const session = await prisma.authSession.findUnique({
    where: { id: payload.sessionId },
  });
  if (
    !session ||
    session.revokedAt ||
    session.refreshExpiresAt < new Date() ||
    session.refreshTokenHash !== hashOpaqueValue(refreshToken)
  ) {
    throw createAuthError(
      401,
      "Invalid refresh token",
      AUTH_ERROR_CODES.authInvalidRefreshToken,
    );
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user || user.isDeleted) {
    throw createAuthError(
      401,
      "Invalid refresh token",
      AUTH_ERROR_CODES.authInvalidRefreshToken,
    );
  }

  return updateSessionTokens(session.id, user);
};

export const logout = async (accessToken?: string, refreshToken?: string) => {
  const filters: Prisma.AuthSessionWhereInput[] = [];
  if (accessToken)
    filters.push({ accessTokenHash: hashOpaqueValue(accessToken) });
  if (refreshToken)
    filters.push({ refreshTokenHash: hashOpaqueValue(refreshToken) });

  if (filters.length === 0) return;

  await prisma.authSession.updateMany({
    where: { OR: filters },
    data: { revokedAt: new Date() },
  });
};

export const checkEmail = async (emailRaw: string) => {
  const email = normalizeEmail(emailRaw);
  const user = await prisma.user.findUnique({ where: { email } });

  return {
    email,
    exists: Boolean(user && !user.isDeleted),
    emailVerified: user?.emailVerified ?? false,
  };
};

export const sendVerificationCode = async (
  emailRaw: string,
  appType: AuthEmailAppType,
) => {
  const email = normalizeEmail(emailRaw);
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.isDeleted) throw new ApiError(404, "User not found");
  if (user.emailVerified) throw new ApiError(400, "User is already verified");

  await sendVerificationCodeForUser(user, "REGISTER", appType);
};

export const verifyUserCode = async (email: string, code: string) => {
  const verificationCode = await verifyCode(email, code, "REGISTER");
  if (!verificationCode)
    throw new ApiError(400, "Invalid or expired verification code");

  await prisma.$transaction([
    prisma.authVerificationCode.update({
      where: { id: verificationCode.id },
      data: { usedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: verificationCode.userId },
      data: { emailVerified: true },
    }),
  ]);

  return publicUser({ ...verificationCode.user, emailVerified: true });
};

export const forgotPassword = async (
  emailRaw: string,
  appType: AuthEmailAppType,
) => {
  const email = normalizeEmail(emailRaw);
  const user = await prisma.user.findUnique({ where: { email } });
  if (user && !user.isDeleted && user.passwordHash) {
    await sendVerificationCodeForUser(user, "RESET", appType);
  }
};

export const verifyResetCode = async (email: string, code: string) =>
  Boolean(await verifyCode(email, code, "RESET"));

export const resetPassword = async (
  email: string,
  code: string,
  newPassword: string,
) => {
  const verificationCode = await verifyCode(email, code, "RESET");
  if (!verificationCode)
    throw new ApiError(400, "Invalid or expired reset code");

  await prisma.$transaction([
    prisma.authVerificationCode.update({
      where: { id: verificationCode.id },
      data: { usedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: verificationCode.userId },
      data: {
        passwordHash: await hashPassword(newPassword),
        emailVerified: true,
      },
    }),
    prisma.authSession.updateMany({
      where: { userId: verificationCode.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);
};

export const authenticateJwt = async (token: string): Promise<AuthContext> => {
  const payload = verifyToken(token, env.jwtSecret);
  if (!payload || payload.tokenType !== "access" || !payload.sessionId) {
    throw createAuthError(
      401,
      "Invalid Bearer token",
      AUTH_ERROR_CODES.authInvalidBearerToken,
    );
  }

  const session = await prisma.authSession.findUnique({
    where: { id: payload.sessionId },
  });
  if (
    !session ||
    session.revokedAt ||
    session.expiresAt < new Date() ||
    session.accessTokenHash !== hashOpaqueValue(token)
  ) {
    throw createAuthError(
      401,
      "Invalid Bearer token",
      AUTH_ERROR_CODES.authInvalidBearerToken,
    );
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user || user.isDeleted) {
    throw createAuthError(
      403,
      "User is disabled",
      AUTH_ERROR_CODES.authUserDisabled,
    );
  }

  return {
    userId: user.id,
    email: user.email,
    role: user.role,
  };
};
