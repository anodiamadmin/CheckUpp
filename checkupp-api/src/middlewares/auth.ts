import { Prisma, UserRole } from "@prisma/client";
import { NextFunction, Request, Response } from "express";
import { env } from "../config/env";
import { prisma } from "../db/prisma";
import { ApiError } from "./error-handler";
import { authenticateJwt } from "../modules/auth/auth.service";

const parseRole = (raw?: string): UserRole => {
  const normalized = raw?.trim().toUpperCase();

  if (normalized === UserRole.ADMIN) return UserRole.ADMIN;
  if (normalized === UserRole.CLINICIAN) return UserRole.CLINICIAN;
  return UserRole.PATIENT;
};

const getDevUserLookup = (xUserId: string | undefined, email: string): Prisma.UserWhereInput => {
  if (xUserId) {
    return {
      OR: [{ id: xUserId }, { email }],
    };
  }

  return { email };
};

const ensureDevUser = async (req: Request) => {
  const xUserId = req.header("x-user-id")?.trim();
  const xUserEmail = req.header("x-user-email")?.trim();
  const xUserRole = parseRole(req.header("x-user-role") ?? undefined);

  if (!xUserId && !xUserEmail) {
    throw new ApiError(
      401,
      "Missing authentication. In dev mode send x-user-id or x-user-email header."
    );
  }

  const email = xUserEmail ?? `dev-${xUserId}@checkupp.local`;

  let user = await prisma.user.findFirst({
    where: getDevUserLookup(xUserId, email),
  });

  if (!user) {
    const devUserData = {
      id: xUserId,
      email,
      name: req.header("x-user-name")?.trim() || email.split("@")[0],
      role: xUserRole,
    };

    if (!xUserId) {
      user = await prisma.user.upsert({
        where: { email },
        create: devUserData,
        update: {},
      });
    } else {
      try {
        user = await prisma.user.create({
          data: devUserData,
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          user = await prisma.user.findFirstOrThrow({
            where: getDevUserLookup(xUserId, email),
          });
        } else {
          throw error;
        }
      }
    }
  }

  if (user.isDeleted) {
    throw new ApiError(403, "User is disabled");
  }

  req.auth = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };
};

const ensureJwtUser = async (req: Request) => {
  const authHeader = req.header("authorization") ?? "";
  const [scheme, token] = authHeader.split(" ");

  if (!scheme || scheme.toLowerCase() !== "bearer" || !token) {
    throw new ApiError(401, "Missing Bearer token");
  }

  req.auth = await authenticateJwt(token);
};

export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    if (env.authMode === "dev") {
      await ensureDevUser(req);
    } else {
      await ensureJwtUser(req);
    }

    return next();
  } catch (error) {
    return next(error);
  }
};
