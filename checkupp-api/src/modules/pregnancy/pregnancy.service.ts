import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { ApiError } from "../../middlewares/error-handler";
import { AuthContext } from "../../types/auth";
import { withAppwriteCompat } from "../../utils/compat";
import { addDays, toDate } from "../../utils/date";
import { ensureArray } from "../../utils/json";

interface CheckupItem {
  name: string;
  date: string;
  completed: boolean;
  [key: string]: unknown;
}

interface UpsertPregnancyInput {
  conceptionDate?: string | null;
  lmpDate?: string | null;
  expectedDueDate?: string | null;
  estimatedCheckupDates: unknown;
}

const DEFAULT_GESTATION_DAYS = 280;

const normalizeCheckups = (value: unknown): CheckupItem[] => {
  const arr = ensureArray<Record<string, unknown>>(value);

  return arr
    .filter((item) => typeof item.name === "string" && typeof item.date === "string")
    .map((item) => ({
      ...item,
      name: String(item.name),
      date: String(item.date),
      completed: Boolean(item.completed),
    }));
};

const toPlanResponse = (plan: Prisma.PregnancyPlanGetPayload<Record<string, never>>) => {
  const checkups = normalizeCheckups(plan.estimatedCheckupDates);
  const compat = withAppwriteCompat(plan);

  return {
    ...compat,
    user: plan.userId,
    lmpDate: plan.conceptionDate.toISOString(),
    estimatedCheckUpDates: JSON.stringify(checkups),
    estimatedCheckupDates: checkups as Prisma.InputJsonValue,
  };
};

export const getPregnancyPlan = async (auth: AuthContext) => {
  const plan = await prisma.pregnancyPlan.findUnique({
    where: { userId: auth.userId },
  });

  return plan ? toPlanResponse(plan) : null;
};

export const upsertPregnancyPlan = async (auth: AuthContext, input: UpsertPregnancyInput) => {
  const existing = await prisma.pregnancyPlan.findUnique({
    where: { userId: auth.userId },
  });

  const conceptionFromInput = (toDate(input.conceptionDate ?? input.lmpDate) as Date | null | undefined) ?? undefined;
  const expectedDueDateInput = (toDate(input.expectedDueDate) as Date | null | undefined) ?? undefined;

  const conceptionDate = conceptionFromInput ?? existing?.conceptionDate;
  if (!conceptionDate) {
    throw new ApiError(400, "conceptionDate or lmpDate is required");
  }

  const expectedDueDate = expectedDueDateInput ?? addDays(conceptionDate, DEFAULT_GESTATION_DAYS);
  const checkups = normalizeCheckups(input.estimatedCheckupDates);

  const data: Prisma.PregnancyPlanUncheckedCreateInput = {
    userId: auth.userId,
    conceptionDate,
    expectedDueDate,
    estimatedCheckupDates: checkups as Prisma.InputJsonValue,
  };

  const plan = existing
    ? await prisma.pregnancyPlan.update({
        where: { userId: auth.userId },
        data,
      })
    : await prisma.pregnancyPlan.create({ data });

  return toPlanResponse(plan);
};

export const markCheckupAsCompleted = async (
  auth: AuthContext,
  checkupName: string,
  completed?: boolean,
  cascadeMode: "single" | "current_and_prior" = "current_and_prior"
) => {
  const existing = await prisma.pregnancyPlan.findUnique({
    where: { userId: auth.userId },
  });

  if (!existing) return null;

  const checkups = normalizeCheckups(existing.estimatedCheckupDates);
  const targetIndex = checkups.findIndex(
    (entry) => entry.name.trim().toLowerCase() === checkupName.trim().toLowerCase()
  );

  if (targetIndex < 0) {
    return null;
  }

  const currentStatus = checkups[targetIndex].completed;
  const targetStatus = completed ?? !currentStatus;

  const updated = checkups.map((entry, index) => {
    if (index === targetIndex) {
      return { ...entry, completed: targetStatus };
    }

    if (cascadeMode === "current_and_prior" && index < targetIndex) {
      return { ...entry, completed: targetStatus };
    }

    if (cascadeMode === "current_and_prior" && index > targetIndex && !targetStatus) {
      return { ...entry, completed: false };
    }

    return entry;
  });

  const plan = await prisma.pregnancyPlan.update({
    where: { userId: auth.userId },
    data: {
      estimatedCheckupDates: updated as Prisma.InputJsonValue,
    },
  });

  return toPlanResponse(plan);
};

export const deletePregnancyPlan = async (auth: AuthContext) => {
  const existing = await prisma.pregnancyPlan.findUnique({
    where: { userId: auth.userId },
  });

  if (!existing) {
    return null;
  }

  await prisma.pregnancyPlan.delete({ where: { userId: auth.userId } });
  return toPlanResponse(existing);
};
