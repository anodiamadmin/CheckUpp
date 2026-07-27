import crypto from "crypto";

type LogLevel = "info" | "warn" | "error";

const REDACTED = "[REDACTED]";
const MAX_LOG_DEPTH = 6;
const MAX_ARRAY_ITEMS = 25;
const MAX_STRING_LENGTH = 4_000;

const sensitiveKeys = new Set([
  "authorization",
  "cookie",
  "setcookie",
  "password",
  "passwordhash",
  "currentpassword",
  "newpassword",
  "token",
  "idtoken",
  "accesstoken",
  "refreshtoken",
  "jwt",
  "secret",
  "jwtsecret",
  "refreshjwtsecret",
  "apikey",
  "resendapikey",
  "smtppass",
  "resetcode",
  "verificationcode",
  "email",
  "phone",
  "phonenumber",
  "address",
  "dateofbirth",
  "userid",
  "body",
  "query",
]);

const normalizeKey = (key: string) => key.toLowerCase().replace(/[^a-z0-9]/g, "");

export const createLogRef = (value: string) =>
  crypto.createHash("sha256").update(value).digest("hex").slice(0, 12);

const redactText = (value: string) => {
  const truncated =
    value.length > MAX_STRING_LENGTH
      ? `${value.slice(0, MAX_STRING_LENGTH)}...[truncated]`
      : value;

  return truncated
    .replace(/\bBearer\s+[^\s,;]+/gi, "Bearer [REDACTED]")
    .replace(
      /\b[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g,
      "[REDACTED_JWT]",
    )
    .replace(
      /([?&](?:token|code|password|secret|api[_-]?key)=)[^&\s]+/gi,
      "$1[REDACTED]",
    )
    .replace(/:\/\/([^:/\s]+):([^@\s]+)@/g, "://[REDACTED]@")
    .replace(
      /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
      "[REDACTED_EMAIL]",
    );
};

export const redactForLogs = (
  value: unknown,
  depth = 0,
  seen = new WeakSet<object>(),
): unknown => {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return redactText(value);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "function" || typeof value === "symbol") {
    return String(value);
  }
  if (value instanceof Date) return value.toISOString();
  if (depth >= MAX_LOG_DEPTH) return "[MAX_DEPTH]";

  if (typeof value === "object") {
    if (seen.has(value)) return "[CIRCULAR]";
    seen.add(value);

    if (Array.isArray(value)) {
      const items = value
        .slice(0, MAX_ARRAY_ITEMS)
        .map((item) => redactForLogs(item, depth + 1, seen));
      if (value.length > MAX_ARRAY_ITEMS) items.push("[TRUNCATED]");
      return items;
    }

    const result: Record<string, unknown> = {};
    Object.entries(value).forEach(([key, nestedValue]) => {
      result[key] = sensitiveKeys.has(normalizeKey(key))
        ? REDACTED
        : redactForLogs(nestedValue, depth + 1, seen);
    });
    return result;
  }

  return String(value);
};

export const serializeErrorForLogs = (
  error: unknown,
  includeStack = true,
): Record<string, unknown> => {
  if (!(error instanceof Error)) {
    return {
      name: "NonErrorThrown",
      value: redactForLogs(error),
    };
  }

  const ownProperties = Object.fromEntries(
    Object.entries(error).filter(
      ([key]) => !["name", "message", "stack"].includes(key),
    ),
  );

  return redactForLogs({
    name: error.name,
    message: error.message,
    ...(includeStack && error.stack ? { stack: error.stack } : {}),
    ...ownProperties,
  }) as Record<string, unknown>;
};

export const logEvent = (
  level: LogLevel,
  event: string,
  payload: Record<string, unknown> = {},
) => {
  const entry = redactForLogs({
    timestamp: new Date().toISOString(),
    level,
    event,
    service: process.env.RAILWAY_SERVICE_NAME ?? "checkupp-api",
    environment:
      process.env.RAILWAY_ENVIRONMENT_NAME ??
      process.env.NODE_ENV ??
      "development",
    deploymentId: process.env.RAILWAY_DEPLOYMENT_ID,
    release: process.env.RAILWAY_GIT_COMMIT_SHA,
    ...payload,
  });
  const output = JSON.stringify(entry);

  if (level === "error") {
    console.error(output);
    return;
  }
  if (level === "warn") {
    console.warn(output);
    return;
  }
  console.info(output);
};
