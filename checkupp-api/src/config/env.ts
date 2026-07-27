import dotenv from "dotenv";

dotenv.config();

const required = (name: string, fallback?: string): string => {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
};

const parseNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseOrigins = (originsRaw: string): string[] => {
  const values = originsRaw
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return values.length > 0 ? values : ["http://localhost:3000"];
};

const parseCsv = (raw: string | undefined): string[] =>
  (raw ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

const parseSmtpFamily = (raw: string | undefined): 0 | 4 | 6 => {
  const parsed = Number(raw ?? 4);
  if (parsed === 0 || parsed === 4 || parsed === 6) return parsed;
  return 4;
};

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: parseNumber(process.env.PORT, 3090),
  apiPrefix: process.env.API_PREFIX ?? "/api/v1",
  databaseUrl: required("DATABASE_URL"),
  authMode: (process.env.AUTH_MODE ?? "jwt") as "dev" | "jwt",
  jwtSecret: process.env.JWT_SECRET ?? "dev-checkupp-access-secret-change-me",
  refreshJwtSecret:
    process.env.REFRESH_JWT_SECRET ??
    process.env.JWT_SECRET ??
    "dev-checkupp-refresh-secret-change-me",
  accessTokenTtlMs: parseNumber(process.env.ACCESS_TOKEN_TTL_MS, 60 * 60 * 1000),
  refreshTokenTtlMs: parseNumber(
    process.env.REFRESH_TOKEN_TTL_MS,
    30 * 24 * 60 * 60 * 1000
  ),
  requireEmailVerification:
    (process.env.AUTH_REQUIRE_EMAIL_VERIFICATION ?? "true").toLowerCase() !== "false",
  allowRoleSignup:
    (process.env.AUTH_ALLOW_ROLE_SIGNUP ?? "false").toLowerCase() === "true",
  emailDelivery: (process.env.EMAIL_DELIVERY ?? "log") as "log" | "smtp" | "resend",
  emailFrom: process.env.EMAIL_FROM ?? "Checkupp <no-reply@checkupp.local>",
  resendApiKey: process.env.RESEND_API_KEY,
  resendApiUrl: process.env.RESEND_API_URL ?? "https://api.resend.com/emails",
  resendTimeoutMs: parseNumber(process.env.RESEND_TIMEOUT_MS, 15_000),
  smtpHost: process.env.SMTP_HOST,
  smtpPort: parseNumber(process.env.SMTP_PORT, 587),
  smtpSecure: (process.env.SMTP_SECURE ?? "false").toLowerCase() === "true",
  smtpFamily: parseSmtpFamily(process.env.SMTP_FAMILY),
  smtpConnectionTimeoutMs: parseNumber(process.env.SMTP_CONNECTION_TIMEOUT_MS, 15_000),
  smtpReadTimeoutMs: parseNumber(process.env.SMTP_READ_TIMEOUT_MS, 15_000),
  smtpUser: process.env.SMTP_USER,
  smtpPass: process.env.SMTP_PASS,
  frontendUrl: process.env.FRONTEND_URL ?? "http://localhost:8081",
  webAppUrl: process.env.WEB_APP_URL ?? process.env.FRONTEND_URL ?? "http://localhost:3000",
  mobileAppUrl: process.env.MOBILE_APP_URL ?? "healthpassport://",
  googleOAuthClientIds: parseCsv(process.env.GOOGLE_OAUTH_CLIENT_IDS),
  appleOAuthClientIds: parseCsv(process.env.APPLE_OAUTH_CLIENT_IDS),
  allowedOrigins: parseOrigins(
    process.env.ALLOWED_ORIGINS ?? "http://localhost:3000,http://localhost:8081"
  ),
  requestBodyLimit: process.env.REQUEST_BODY_LIMIT ?? "10mb",
  rateLimitWindowMs: parseNumber(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
  rateLimitMax: parseNumber(process.env.RATE_LIMIT_MAX, 400),
  walletUploadsDir: process.env.WALLET_UPLOADS_DIR ?? "uploads",
};

export const isDev = env.nodeEnv !== "production";
