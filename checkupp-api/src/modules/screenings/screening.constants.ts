import { GenderEligibility, ScreeningDomain } from "@prisma/client";

interface SeedDefinition {
  code: string;
  displayName: string;
  domain: ScreeningDomain;
  defaultIntervalMonths: number;
  minEligibleAge: number;
  maxEligibleAge?: number;
  genderEligibility: GenderEligibility;
}

export const DEFAULT_SCREENING_DEFINITIONS: SeedDefinition[] = [
  {
    code: "CERVICAL_CANCER",
    displayName: "Cervical Cancer Screening",
    domain: ScreeningDomain.CANCER,
    defaultIntervalMonths: 60,
    minEligibleAge: 25,
    maxEligibleAge: 75,
    genderEligibility: GenderEligibility.FEMALE,
  },
  {
    code: "BREAST_CANCER",
    displayName: "Breast Cancer Screening",
    domain: ScreeningDomain.CANCER,
    defaultIntervalMonths: 24,
    minEligibleAge: 40,
    maxEligibleAge: 70,
    genderEligibility: GenderEligibility.FEMALE,
  },
  {
    code: "BOWEL_CANCER",
    displayName: "Bowel Cancer Screening",
    domain: ScreeningDomain.CANCER,
    defaultIntervalMonths: 24,
    minEligibleAge: 45,
    maxEligibleAge: 70,
    genderEligibility: GenderEligibility.ALL,
  },
  {
    code: "PROSTATE_CANCER",
    displayName: "Prostate Cancer Screening",
    domain: ScreeningDomain.CANCER,
    defaultIntervalMonths: 24,
    minEligibleAge: 50,
    maxEligibleAge: 120,
    genderEligibility: GenderEligibility.MALE,
  },
  {
    code: "LUNG_CANCER",
    displayName: "Lung Cancer Screening",
    domain: ScreeningDomain.CANCER,
    defaultIntervalMonths: 24,
    minEligibleAge: 50,
    maxEligibleAge: 120,
    genderEligibility: GenderEligibility.ALL,
  },
  {
    code: "CARDIOVASCULAR_HEALTH",
    displayName: "Cardiovascular Health",
    domain: ScreeningDomain.HEALTH,
    defaultIntervalMonths: 24,
    minEligibleAge: 45,
    maxEligibleAge: 120,
    genderEligibility: GenderEligibility.ALL,
  },
  {
    code: "DIABETES_CHECK",
    displayName: "Diabetes Check",
    domain: ScreeningDomain.HEALTH,
    defaultIntervalMonths: 36,
    minEligibleAge: 40,
    maxEligibleAge: 120,
    genderEligibility: GenderEligibility.ALL,
  },
  {
    code: "VISION_CHECK",
    displayName: "Vision Check",
    domain: ScreeningDomain.HEALTH,
    defaultIntervalMonths: 24,
    minEligibleAge: 16,
    maxEligibleAge: 120,
    genderEligibility: GenderEligibility.ALL,
  },
  {
    code: "DENTAL_CHECK",
    displayName: "Dental Check",
    domain: ScreeningDomain.HEALTH,
    defaultIntervalMonths: 6,
    minEligibleAge: 16,
    maxEligibleAge: 120,
    genderEligibility: GenderEligibility.ALL,
  },
  {
    code: "MENTAL_HEALTH_CHECK",
    displayName: "Mental Health Check",
    domain: ScreeningDomain.HEALTH,
    defaultIntervalMonths: 24,
    minEligibleAge: 0,
    maxEligibleAge: 120,
    genderEligibility: GenderEligibility.ALL,
  },
];

export const LEGACY_NAME_TO_CODE: Record<string, string> = {
  "Cervical Cancer Screening": "CERVICAL_CANCER",
  "Breast Cancer Screening": "BREAST_CANCER",
  "Bowel Cancer Screening": "BOWEL_CANCER",
  "Prostate Cancer Screening": "PROSTATE_CANCER",
  "Lung Cancer Screening": "LUNG_CANCER",
  "Cardiovascular Health": "CARDIOVASCULAR_HEALTH",
  "Diabetes Check": "DIABETES_CHECK",
  "Vision Check": "VISION_CHECK",
  "Dental Check": "DENTAL_CHECK",
  "Mental Health Check": "MENTAL_HEALTH_CHECK",
};
