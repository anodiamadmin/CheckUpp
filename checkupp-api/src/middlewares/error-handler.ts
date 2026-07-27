import { Prisma } from "@prisma/client";
import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { setRequestError } from "./request-observability";
import { serializeErrorForLogs } from "../observability/logger";

export class ApiError extends Error {
  statusCode: number;
  details?: unknown;

  constructor(statusCode: number, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

const isPrismaNotFound = (error: Prisma.PrismaClientKnownRequestError) =>
  error.code === "P2025";

const isPrismaUniqueViolation = (error: Prisma.PrismaClientKnownRequestError) =>
  error.code === "P2002";

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  const requestId = req.requestId;

  if (error instanceof ApiError) {
    const code =
      typeof error.details === "object" &&
      error.details !== null &&
      "code" in error.details &&
      typeof (error.details as Record<string, unknown>).code === "string"
        ? ((error.details as Record<string, unknown>).code as string)
        : undefined;

    setRequestError(res, {
      ...serializeErrorForLogs(error, error.statusCode >= 500),
      statusCode: error.statusCode,
      code,
    });

    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
      ...(requestId ? { requestId } : {}),
      ...(code ? { code } : {}),
      ...(error.details ? { details: error.details } : {}),
    });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    setRequestError(res, {
      ...serializeErrorForLogs(error),
      prismaCode: error.code,
      prismaMeta: error.meta,
    });

    if (isPrismaNotFound(error)) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: "Requested resource was not found",
        code: error.code,
        ...(requestId ? { requestId } : {}),
      });
    }

    if (isPrismaUniqueViolation(error)) {
      return res.status(StatusCodes.CONFLICT).json({
        success: false,
        message: "A record with this value already exists",
        code: error.code,
        meta: error.meta,
        ...(requestId ? { requestId } : {}),
      });
    }

    return res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      message: "Database operation failed",
      code: error.code,
      meta: error.meta,
      ...(requestId ? { requestId } : {}),
    });
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    setRequestError(res, serializeErrorForLogs(error));
    return res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      message: "Invalid database payload",
      ...(requestId ? { requestId } : {}),
    });
  }

  setRequestError(res, serializeErrorForLogs(error));

  return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
    success: false,
    message:
      process.env.NODE_ENV === "production"
        ? "Internal server error"
        : error.message,
    ...(requestId ? { requestId } : {}),
    ...(process.env.NODE_ENV === "production" ? {} : { stack: error.stack }),
  });
};
