import { Gender } from "@prisma/client";

export const toGender = (value?: string | Gender | null): Gender | undefined => {
  if (!value) return undefined;
  if (typeof value !== "string") return value;

  const normalized = value.trim().toUpperCase().replace(/[\s-]/g, "_");

  if (normalized === "MALE") return Gender.MALE;
  if (normalized === "FEMALE") return Gender.FEMALE;
  if (normalized === "PREFER_NOT_TO_SAY") return Gender.PREFER_NOT_TO_SAY;
  if (normalized === "UNKNOWN") return Gender.UNKNOWN;

  return undefined;
};

export const genderToClient = (gender: Gender): string => {
  if (gender === Gender.PREFER_NOT_TO_SAY) return "prefer not to say";
  return gender.toLowerCase();
};
