import { format, addYears, isBefore } from "date-fns";
import { Gender } from "@/app/(tabs)/health-screening";
import { ScreeningResultRecord } from "@/lib/screening/bookingFlow";

export type HealthCheckItem = {
  name: string;
  date: string;
  completed: boolean;
  overdue: boolean;
  eligible: boolean;
  lastTestDate?: string;
  lastTestResult?: string;
  recommended: boolean;
  resultUnit?: string;
  interval: number;
};

export function getHealthCheckConfig(name: string) {
  switch (name) {
    case "Cardiovascular Health":
      return { interval: 2, minAge: 45, resultUnit: "mmHg, kg, cm, mmol/L" };
    case "Diabetes Check":
      return { interval: 3, minAge: 40, resultUnit: "mmol/L" };
    case "Vision Check":
      return { interval: 2, minAge: 16, resultUnit: "6/6" };
    case "Dental Check":
      return { interval: 0.5, minAge: 16, resultUnit: "Yes/No" };
    case "Mental Health Check":
      return { interval: 2, minAge: 0, resultUnit: "K10, AUDIT C" };
    default:
      return { interval: 0, minAge: 0, resultUnit: "" };
  }
}

export function isHealthCheckEligible(
  name: string,
  age: number,
  gender: Gender,
) {
  const cfg = getHealthCheckConfig(name);
  return age >= cfg.minAge;
}

export function calculateNextCheckDate(
  lastTestDate: Date | undefined,
  interval: number,
  neverScreened: boolean = false,
) {
  if (neverScreened || !lastTestDate) return new Date();
  const next = addYears(lastTestDate, interval);
  return isBefore(next, new Date()) ? new Date() : next;
}

export function buildHealthChecks({
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
  existingItems?: HealthCheckItem[];
}): HealthCheckItem[] {
  const names = [
    "Cardiovascular Health",
    "Diabetes Check",
    "Vision Check",
    "Dental Check",
    "Mental Health Check",
  ];
  const existingItemsByName = Object.fromEntries(
    existingItems.map((item) => [item.name, item]),
  );
  return names.map((name) => {
    const eligible = isHealthCheckEligible(name, age, gender);
    const { interval, resultUnit } = getHealthCheckConfig(name);
    const result = testResults[name];
    const existingItem = existingItemsByName[name];

    // Use test result date if available, otherwise fall back to general last screening date
    let lastDate = result?.date
      ? new Date(result.date)
      : lastScreeningDate && !neverScreened
        ? new Date(lastScreeningDate)
        : undefined;

    let nextDate = eligible
      ? calculateNextCheckDate(lastDate, interval, neverScreened)
      : new Date();
    let overdue = isBefore(nextDate, new Date());

    return {
      name,
      date: format(nextDate, "MMMM do, yyyy"),
      completed: existingItem?.completed ?? false,
      overdue,
      eligible,
      lastTestDate: result?.date,
      lastTestResult: result?.result,
      recommended: eligible && overdue,
      resultUnit,
      interval,
    };
  });
}
