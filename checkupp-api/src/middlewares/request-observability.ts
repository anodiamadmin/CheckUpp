import crypto from "crypto";
import { NextFunction, Request, Response } from "express";
import {
  createLogRef,
  logEvent,
  redactForLogs,
} from "../observability/logger";

const MAX_REQUEST_ID_LENGTH = 100;
const MAX_HEADER_LENGTH = 300;

const safeHeader = (value: string | undefined) =>
  value ? value.slice(0, MAX_HEADER_LENGTH) : null;

const getRequestId = (req: Request) => {
  const supplied = req.header("x-request-id")?.trim();
  if (
    supplied &&
    supplied.length <= MAX_REQUEST_ID_LENGTH &&
    /^[A-Za-z0-9._:-]+$/.test(supplied)
  ) {
    return supplied;
  }
  return crypto.randomUUID();
};

const getSafePath = (req: Request) =>
  req.originalUrl
    .split("?", 1)[0]
    .replace(
      /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi,
      ":id",
    );

const getActorRef = (req: Request) => {
  if (!req.auth?.userId) return null;
  return createLogRef(req.auth.userId);
};

const getDurationMs = (startedAt: bigint) =>
  Number(process.hrtime.bigint() - startedAt) / 1_000_000;

export const setRequestError = (
  res: Response,
  error: Record<string, unknown>,
) => {
  res.locals.requestError = redactForLogs(error);
};

export const requestObservability = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const startedAt = process.hrtime.bigint();
  const requestId = getRequestId(req);
  let completed = false;

  req.requestId = requestId;
  res.setHeader("x-request-id", requestId);

  const originalJson = res.json;
  res.json = function (body: any) {
    if (
      res.statusCode >= 400 &&
      res.locals.requestError === undefined &&
      body !== null &&
      typeof body === "object" &&
      !Array.isArray(body)
    ) {
      const handledError = body as Record<string, unknown>;
      setRequestError(res, {
        name: "HandledErrorResponse",
        message: handledError.message,
        code: handledError.code,
        errors: handledError.errors,
      });
    }

    const responseBody =
      res.statusCode >= 400 &&
      body !== null &&
      typeof body === "object" &&
      !Array.isArray(body) &&
      !("requestId" in body)
        ? { ...body, requestId }
        : body;

    return originalJson.call(this, responseBody);
  };

  const requestContext = () => ({
    requestId,
    method: req.method,
    path: getSafePath(req),
    statusCode: res.statusCode,
    durationMs: Math.round(getDurationMs(startedAt) * 100) / 100,
    clientPlatform: safeHeader(req.header("x-client-platform")),
    clientAppType: safeHeader(req.header("x-client-app-type")),
    clientVersion: safeHeader(req.header("x-client-version")),
    clientBuild: safeHeader(req.header("x-client-build")),
    userAgent: safeHeader(req.header("user-agent")),
    actorRef: getActorRef(req),
    actorRole: req.auth?.role ?? null,
  });

  res.once("finish", () => {
    completed = true;
    if (res.statusCode < 400) return;

    logEvent(
      res.statusCode >= 500 ? "error" : "warn",
      "http.request.failed",
      {
        http: requestContext(),
        error: res.locals.requestError,
      },
    );
  });

  res.once("close", () => {
    if (completed || res.writableEnded) return;
    logEvent("warn", "http.request.aborted", {
      http: requestContext(),
    });
  });

  next();
};
