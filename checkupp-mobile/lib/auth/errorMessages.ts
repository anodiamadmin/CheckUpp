import { ApiClientError } from "@/lib/api/client";

export const getReadableSignInErrorMessage = (error: ApiClientError) => {
  switch (error.code) {
    case "AUTH_INVALID_CREDENTIALS":
      return "The email or password you entered is incorrect.";
    case "AUTH_EMAIL_NOT_VERIFIED":
      return "Please verify your email before signing in.";
    case "AUTH_USER_DISABLED":
      return "This account is currently unavailable. Please contact support.";
    case "AUTH_NETWORK_ERROR":
      return "Could not reach the sign-in service. Check your connection and try again.";
    default:
      return "We couldn't sign you in right now. Please try again.";
  }
};

export const getReadableGoogleSignInErrorMessage = (error: ApiClientError) => {
  switch (error.code) {
    case "SOCIAL_IDENTITY_INVALID_AUDIENCE":
      return "Google sign-in is unavailable for this app build right now. Please try another sign-in method or contact support.";
    case "SOCIAL_IDENTITY_INVALID":
    case "SOCIAL_IDENTITY_UNSUPPORTED":
    case "SOCIAL_IDENTITY_INVALID_ISSUER":
    case "SOCIAL_IDENTITY_KEY_NOT_FOUND":
    case "SOCIAL_IDENTITY_INVALID_SIGNATURE":
      return "We couldn't verify your Google sign-in. Please try again.";
    case "SOCIAL_IDENTITY_EXPIRED":
      return "Your Google sign-in session expired. Please try again.";
    case "SOCIAL_IDENTITY_KEYS_TIMEOUT":
    case "SOCIAL_IDENTITY_KEYS_FETCH_FAILED":
    case "SOCIAL_IDENTITY_AUDIENCES_NOT_CONFIGURED":
      return "Google sign-in is temporarily unavailable. Please try again shortly.";
    case "SOCIAL_IDENTITY_EMAIL_MISSING":
      return "Your Google account did not share the details we need to sign you in. Please use another sign-in method.";
    case "AUTH_USER_DISABLED":
      return "This account is currently unavailable. Please contact support.";
    case "AUTH_NETWORK_ERROR":
      return "Could not reach the sign-in service. Check your connection and try again.";
    default:
      return "Google sign-in is unavailable right now. Please try again.";
  }
};
