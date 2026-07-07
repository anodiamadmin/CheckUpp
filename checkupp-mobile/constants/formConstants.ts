// Color schemes for different form sections
export const FORM_SECTION_COLORS = {
  cardiovascular: {
    backgroundColor: "bg-red-50",
    borderColor: "border-red-100",
    titleColor: "text-red-800",
  },
  bloodPressure: {
    backgroundColor: "bg-red-50",
    borderColor: "border-red-100",
    titleColor: "text-red-800",
  },
  ecg: {
    backgroundColor: "bg-blue-50",
    borderColor: "border-blue-100",
    titleColor: "text-blue-800",
  },
  cholesterol: {
    backgroundColor: "bg-yellow-50",
    borderColor: "border-yellow-100",
    titleColor: "text-yellow-800",
  },
  dental: {
    backgroundColor: "bg-teal-50",
    borderColor: "border-teal-100",
    titleColor: "text-teal-800",
  },
  oralHygiene: {
    backgroundColor: "bg-teal-50",
    borderColor: "border-teal-100",
    titleColor: "text-teal-800",
  },
  teethCondition: {
    backgroundColor: "bg-blue-50",
    borderColor: "border-blue-100",
    titleColor: "text-blue-800",
  },
  gumHealth: {
    backgroundColor: "bg-green-50",
    borderColor: "border-green-100",
    titleColor: "text-green-800",
  },
  symptoms: {
    backgroundColor: "bg-orange-50",
    borderColor: "border-orange-100",
    titleColor: "text-orange-800",
  },
  professionalCare: {
    backgroundColor: "bg-purple-50",
    borderColor: "border-purple-100",
    titleColor: "text-purple-800",
  },
  additionalInfo: {
    backgroundColor: "bg-yellow-50",
    borderColor: "border-yellow-100",
    titleColor: "text-yellow-800",
  },
  // Diabetes-specific colors
  bloodGlucose: {
    backgroundColor: "bg-blue-50",
    borderColor: "border-blue-100",
    titleColor: "text-blue-800",
  },
  longTermIndicators: {
    backgroundColor: "bg-purple-50",
    borderColor: "border-purple-100",
    titleColor: "text-purple-800",
  },
  additionalMeasurements: {
    backgroundColor: "bg-green-50",
    borderColor: "border-green-100",
    titleColor: "text-green-800",
  },
  // Mental health colors
  assessmentScores: {
    backgroundColor: "bg-indigo-50",
    borderColor: "border-indigo-100",
    titleColor: "text-indigo-800",
  },
  sleepQuality: {
    backgroundColor: "bg-blue-50",
    borderColor: "border-blue-100",
    titleColor: "text-blue-800",
  },
  lifestyleFactors: {
    backgroundColor: "bg-green-50",
    borderColor: "border-green-100",
    titleColor: "text-green-800",
  },
  // Vision colors
  visualAcuity: {
    backgroundColor: "bg-purple-50",
    borderColor: "border-purple-100",
    titleColor: "text-purple-800",
  },
  visionTests: {
    backgroundColor: "bg-blue-50",
    borderColor: "border-blue-100",
    titleColor: "text-blue-800",
  },
  eyePressure: {
    backgroundColor: "bg-green-50",
    borderColor: "border-green-100",
    titleColor: "text-green-800",
  },
  visionCorrection: {
    backgroundColor: "bg-yellow-50",
    borderColor: "border-yellow-100",
    titleColor: "text-yellow-800",
  },
} as const;

// Common picker options
export const FREQUENCY_OPTIONS = [
  { label: "Never", value: "never" },
  { label: "Rarely", value: "rarely" },
  { label: "Weekly", value: "weekly" },
  { label: "Daily", value: "daily" },
];

export const SMOKING_STATUS_OPTIONS = [
  { label: "Never smoked", value: "never" },
  { label: "Former smoker", value: "former" },
  { label: "Current smoker", value: "current" },
];

export const ECG_RESULT_OPTIONS = [
  { label: "Normal", value: "normal" },
  { label: "Abnormal", value: "abnormal" },
];

// Mental health specific options
export const EXERCISE_FREQUENCY_OPTIONS = [
  { label: "Never", value: "never" },
  { label: "Rarely", value: "rarely" },
  { label: "Weekly", value: "weekly" },
  { label: "Several times per week", value: "several-times" },
  { label: "Daily", value: "daily" },
];

export const SOCIAL_SUPPORT_OPTIONS = [
  { label: "None", value: "none" },
  { label: "Limited", value: "limited" },
  { label: "Adequate", value: "adequate" },
  { label: "Strong", value: "strong" },
];

export const WORK_STRESS_OPTIONS = [
  { label: "None", value: "none" },
  { label: "Mild", value: "mild" },
  { label: "Moderate", value: "moderate" },
  { label: "High", value: "high" },
  { label: "Overwhelming", value: "overwhelming" },
];

export const SLEEP_QUALITY_OPTIONS = [
  { label: "Very Poor", value: "very-poor" },
  { label: "Poor", value: "poor" },
  { label: "Fair", value: "fair" },
  { label: "Good", value: "good" },
  { label: "Excellent", value: "excellent" },
];

// Vision specific options
export const VISUAL_ACUITY_OPTIONS = [
  { label: "Select acuity", value: "" },
  { label: "6/6", value: "6/6" },
  { label: "6/7.5", value: "6/7.5" },
  { label: "6/9", value: "6/9" },
  { label: "6/12", value: "6/12" },
  { label: "6/15", value: "6/15" },
  { label: "6/18", value: "6/18" },
  { label: "6/24", value: "6/24" },
  { label: "6/30", value: "6/30" },
  { label: "6/36", value: "6/36" },
  { label: "6/48", value: "6/48" },
  { label: "6/60", value: "6/60" },
  { label: "CF", value: "CF" },
  { label: "HM", value: "HM" },
  { label: "LP", value: "LP" },
  { label: "NPL", value: "NPL" },
];

export const VISION_CORRECTION_OPTIONS = [
  { label: "None", value: "none" },
  { label: "Glasses", value: "glasses" },
  { label: "Contact Lenses", value: "contacts" },
  { label: "Both", value: "both" },
];
