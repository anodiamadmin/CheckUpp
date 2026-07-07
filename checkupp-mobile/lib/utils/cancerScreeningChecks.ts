import { format, addYears, isBefore } from "date-fns";
import { Gender } from "@/app/(tabs)/health-screening";
import { ScreeningResultRecord } from "@/lib/screening/bookingFlow";

export type ScreeningItem = {
  name: string;
  date: string;
  completed: boolean;
  overdue: boolean;
  eligible: boolean;
  lastTestDate?: string;
  lastTestResult?: string;
  recommended: boolean;
  interval: number;
};

export function getScreeningConfig(name: string) {
  switch (name) {
    case "Cervical Cancer Screening":
      return { interval: 5, minAge: 25, maxAge: 75, gender: "female" };
    case "Breast Cancer Screening":
      return { interval: 2, minAge: 40, maxAge: 70, gender: "female" };
    case "Bowel Cancer Screening (FOBT)":
      return { interval: 2, minAge: 45, maxAge: 70, gender: "all" };
    case "Prostate Cancer Screening (PSA)":
      return { interval: 2, minAge: 50, maxAge: 120, gender: "male" };
    case "Lung Cancer Screening":
      return { interval: 2, minAge: 50, maxAge: 120, gender: "all" };
    default:
      return { interval: 0, minAge: 0, maxAge: 120, gender: "all" };
  }
}

export function isScreeningEligible(name: string, age: number, gender: Gender) {
  const cfg = getScreeningConfig(name);
  if (cfg.gender === "all") return age >= cfg.minAge && age <= cfg.maxAge;
  return gender === cfg.gender && age >= cfg.minAge && age <= cfg.maxAge;
}

export function calculateNextScreeningDate(
  lastTestDate: Date | undefined,
  interval: number,
  neverScreened: boolean = false,
) {
  if (neverScreened || !lastTestDate) return new Date();
  const next = addYears(lastTestDate, interval);
  return isBefore(next, new Date()) ? new Date() : next;
}

export function buildCancerScreenings({
  age,
  gender,
  testResults,
  neverScreened = false,
  lastScreeningDate,
  existingItems = [],
}: {
  age: number;
  gender: Gender;
  testResults: Record<string, ScreeningResultRecord>;
  neverScreened?: boolean;
  lastScreeningDate?: string;
  existingItems?: ScreeningItem[];
}): ScreeningItem[] {
  const names = [
    "Cervical Cancer Screening",
    "Breast Cancer Screening",
    "Bowel Cancer Screening (FOBT)",
    "Prostate Cancer Screening (PSA)",
    "Lung Cancer Screening",
  ];
  const existingItemsByName = Object.fromEntries(
    existingItems.map((item) => [item.name, item]),
  );
  return names.map((name) => {
    const eligible = isScreeningEligible(name, age, gender);
    const { interval } = getScreeningConfig(name);
    const result = testResults[name];
    const existingItem = existingItemsByName[name];

    // Use test result date if available, otherwise fall back to general last screening date
    let lastDate = result?.date
      ? new Date(result.date)
      : lastScreeningDate && !neverScreened
        ? new Date(lastScreeningDate)
        : undefined;

    let nextDate = eligible
      ? calculateNextScreeningDate(lastDate, interval, neverScreened)
      : new Date();
    const dueNow = eligible && (neverScreened || !lastDate);
    let overdue = dueNow || isBefore(nextDate, new Date());

    return {
      name,
      date: format(nextDate, "MMMM do, yyyy"),
      completed: existingItem?.completed ?? false,
      overdue,
      eligible,
      lastTestDate: result?.date,
      lastTestResult: result?.result,
      recommended: eligible && overdue,
      interval,
    };
  });
}
