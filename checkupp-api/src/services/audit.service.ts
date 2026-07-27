import { Request } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../db/prisma";

interface CreateAuditLogInput {
  actorUserId?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  status: string;
  ipAddress?: string;
  userAgent?: string;
  meta?: Record<string, unknown>;
}

export const createAuditLog = async (input: CreateAuditLogInput) => {
  return prisma.auditLog.create({
    data: {
      actorUserId: input.actorUserId,
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      status: input.status,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      meta: input.meta as Prisma.InputJsonObject | undefined,
    },
  });
};

export const buildAuditContext = (req: Request) => ({
  ipAddress: req.ip,
  userAgent: req.header("user-agent") ?? undefined,
});

export const tryCreateAuditLog = async (input: CreateAuditLogInput) => {
  try {
    await createAuditLog(input);
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Audit log write failed", error);
    }
  }
};
