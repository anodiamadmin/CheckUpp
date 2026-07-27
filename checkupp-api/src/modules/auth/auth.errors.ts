import { ApiError } from "../../middlewares/error-handler";

export const AUTH_ERROR_CODES = {
  authInvalidCredentials: "AUTH_INVALID_CREDENTIALS",
  authEmailNotVerified: "AUTH_EMAIL_NOT_VERIFIED",
  authUserDisabled: "AUTH_USER_DISABLED",
  authInvalidRefreshToken: "AUTH_INVALID_REFRESH_TOKEN",
  authInvalidBearerToken: "AUTH_INVALID_BEARER_TOKEN",
  socialInvalidToken: "SOCIAL_IDENTITY_INVALID",
  socialUnsupportedToken: "SOCIAL_IDENTITY_UNSUPPORTED",
  socialInvalidIssuer: "SOCIAL_IDENTITY_INVALID_ISSUER",
  socialInvalidAudience: "SOCIAL_IDENTITY_INVALID_AUDIENCE",
  socialExpiredToken: "SOCIAL_IDENTITY_EXPIRED",
  socialKeyNotFound: "SOCIAL_IDENTITY_KEY_NOT_FOUND",
  socialInvalidSignature: "SOCIAL_IDENTITY_INVALID_SIGNATURE",
  socialKeysFetchFailed: "SOCIAL_IDENTITY_KEYS_FETCH_FAILED",
  socialKeysTimeout: "SOCIAL_IDENTITY_KEYS_TIMEOUT",
  socialAudiencesNotConfigured: "SOCIAL_IDENTITY_AUDIENCES_NOT_CONFIGURED",
  socialEmailMissing: "SOCIAL_IDENTITY_EMAIL_MISSING",
} as const;

type AuthErrorDetails = Record<string, unknown> | undefined;

export const createAuthError = (
  statusCode: number,
  message: string,
  code: string,
  details?: AuthErrorDetails,
) =>
  new ApiError(statusCode, message, {
    code,
    ...(details ?? {}),
  });
