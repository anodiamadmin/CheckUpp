import { Request } from "express";
import { ApiError } from "../../middlewares/error-handler";
import {
  logEvent,
  redactForLogs,
  serializeErrorForLogs,
} from "../../observability/logger";

type LogLevel = "info" | "warn" | "error";

const serializeError = (error: unknown) => {
  if (error instanceof ApiError) {
    const details =
      error.details && typeof error.details === "object"
        ? (error.details as Record<string, unknown>)
        : undefined;

    return redactForLogs({
      name: error.name,
      message: error.message,
      statusCode: error.statusCode,
      code: typeof details?.code === "string" ? details.code : undefined,
      details,
    });
  }

  return serializeErrorForLogs(error, false);
};

export const getAuthRequestMeta = (req: Request) => ({
  method: req.method,
  route: req.originalUrl.split("?", 1)[0],
  requestId: req.requestId ?? null,
  clientPlatform: req.header("x-client-platform") ?? null,
  clientAppType: req.header("x-client-app-type") ?? null,
  clientVersion: req.header("x-client-version") ?? null,
  clientBuild: req.header("x-client-build") ?? null,
  userAgent: req.header("user-agent") ?? null,
  provider:
    typeof req.body?.provider === "string" ? String(req.body.provider) : null,
});

export const logAuthEvent = (
  event: string,
  payload: Record<string, unknown>,
  level: LogLevel = "info",
) => {
  logEvent(level, `auth.${event}`, payload);
};

export const logAuthFailure = (
  event: string,
  error: unknown,
  payload: Record<string, unknown>,
) => {
  logAuthEvent(
    event,
    {
      ...payload,
      error: serializeError(error),
    },
    "warn",
  );
};
