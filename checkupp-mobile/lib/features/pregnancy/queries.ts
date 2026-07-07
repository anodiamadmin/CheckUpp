import { fetchUserPregnancyData } from "@/lib/appwrite/pregnancy";
import { queryKeys } from "@/lib/query/keys";
import useApiQuery from "@/lib/query/useApiQuery";
import { PregnancyCheckupItem, PregnancyPlanSnapshot } from "./types";

const parseCheckupDates = (value: unknown): PregnancyCheckupItem[] => {
  if (Array.isArray(value)) return value as PregnancyCheckupItem[];

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as PregnancyCheckupItem[]) : [];
    } catch {
      return [];
    }
  }

  return [];
};

export const EMPTY_PREGNANCY_PLAN: PregnancyPlanSnapshot = {
  conceptionDate: null,
  expectedDueDate: null,
  estimatedCheckupDates: [],
};

export const normalizePregnancyPlan = (
  value: any,
): PregnancyPlanSnapshot | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  return {
    conceptionDate:
      typeof value.conceptionDate === "string"
        ? value.conceptionDate
        : typeof value.lmpDate === "string"
          ? value.lmpDate
          : null,
    expectedDueDate:
      typeof value.expectedDueDate === "string" ? value.expectedDueDate : null,
    estimatedCheckupDates: parseCheckupDates(
      value.estimatedCheckUpDates ?? value.estimatedCheckupDates ?? [],
    ),
  };
};

export const loadPregnancyPlan = async (
  userId?: string | null,
): Promise<PregnancyPlanSnapshot | null> => {
  if (!userId) return null;

  const results = await fetchUserPregnancyData(userId);
  if (!results.length) {
    return null;
  }

  return normalizePregnancyPlan(results[0]);
};

export const usePregnancyPlan = (userId?: string | null) =>
  useApiQuery(() => loadPregnancyPlan(userId), {
    enabled: Boolean(userId),
    deps: [userId],
    queryKey: queryKeys.pregnancy.plan(userId),
  });
