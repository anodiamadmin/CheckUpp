type ProfileCompletionUser =
  | {
      name?: string | null;
      email?: string | null;
      phoneNumber?: string | null;
      gender?: string | null;
      dob?: string | null;
    }
  | null
  | undefined;

export const PROFILE_COMPLETION_CONTEXT = "complete-profile";
export const DEFAULT_POST_PROFILE_ROUTE = "/home";

const hasNonEmptyValue = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const hasValidDob = (value: unknown) => {
  if (!hasNonEmptyValue(value)) return false;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return false;

  return parsed <= new Date();
};

export const isProfileComplete = (user: ProfileCompletionUser) => {
  if (!user) return false;

  return (
    hasNonEmptyValue(user.name) &&
    hasNonEmptyValue(user.email) &&
    hasNonEmptyValue(user.phoneNumber) &&
    hasNonEmptyValue(user.gender) &&
    hasValidDob(user.dob)
  );
};

export const getProfileCompletionRoute = (
  nextRoute = DEFAULT_POST_PROFILE_ROUTE,
) =>
  `/personal-details?context=${PROFILE_COMPLETION_CONTEXT}&next=${encodeURIComponent(
    nextRoute,
  )}`;

export const getPostAuthRoute = (user: ProfileCompletionUser) =>
  isProfileComplete(user)
    ? DEFAULT_POST_PROFILE_ROUTE
    : getProfileCompletionRoute();
