import { UserRole } from "@prisma/client";
import { NextFunction, Request, Response } from "express";
import { ApiError } from "./error-handler";

export const authorize = (...roles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) {
      return next(new ApiError(401, "Unauthorized"));
    }

    if (roles.length > 0 && !roles.includes(req.auth.role)) {
      return next(new ApiError(403, "Forbidden"));
    }

    return next();
  };
};
