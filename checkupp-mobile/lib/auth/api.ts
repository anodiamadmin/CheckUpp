import { ApiClientError, apiRequest } from "@/lib/api/client";
import {
  AuthResponseData,
  AuthSession,
  buildAuthSession,
  clearAuthSession,
  getStoredAuthSession,
  persistAuthSession,
  updateStoredSessionUser,
} from "@/lib/auth/session";
import { Platform } from "react-native";
import { queryClient } from "@/lib/query/client";
import { queryKeys } from "@/lib/query/keys";
import { fetchUserFiles } from "@/lib/appwrite/userFiles";
import { loadPregnancyPlan } from "@/lib/features/pregnancy/queries";
import { loadScreeningOverviewData } from "@/lib/features/screenings/overview";

interface AuthUser {
  id: string;
  email: string;
  name?: string | null;
  phoneNumber?: string | null;
  avatarUrl?: string | null;
  emailVerified?: boolean;
  role?: string | null;
  [key: string]: any;
}

interface SignUpResponseData {
  user: AuthUser;
  requiresVerification: boolean;
}

interface VerifyResetCodeResponseData {
  email: string;
  codeValid: boolean;
}

interface SignUpInput {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  phoneNumber?: string;
}

interface SignInInput {
  email: string;
  password: string;
}

interface SocialSignInInput {
  provider: "google" | "apple";
  idToken: string;
  accessToken?: string | null;
}

const normalizeEmail = (value: string) => value.trim().toLowerCase();
const getAuthAppType = (): "mobile" | "web" =>
  Platform.OS === "web" ? "web" : "mobile";

const buildName = (input: {
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}) => {
  const providedName = input.name?.trim();
  if (providedName) return providedName;

  const firstName = input.firstName?.trim();
  const lastName = input.lastName?.trim();
  return [firstName, lastName].filter(Boolean).join(" ").trim() || undefined;
};

const toApiError = (error: unknown) => {
  if (error instanceof Error) return error;
  return new Error("Something went wrong. Please try again.");
};

const clearProtectedQueryCache = () => {
  queryClient.removeQueries({
    predicate: (query) => query.queryKey[0] !== "auth",
  });
};

export const signUpWithApi = async (
  input: SignUpInput,
): Promise<SignUpResponseData> => {
  const requestBody: Record<string, unknown> = {
    email: normalizeEmail(input.email),
    password: input.password,
    appType: getAuthAppType(),
  };

  const name = buildName(input);
  if (name) requestBody.name = name;

  const phoneNumber = input.phoneNumber?.trim();
  if (phoneNumber) requestBody.phoneNumber = phoneNumber;

  const response = await apiRequest<SignUpResponseData>("/auth/signup", {
    method: "POST",
    body: requestBody,
    includeAuth: false,
  });

  return response.data;
};

export const signInWithApi = async (
  input: SignInInput,
): Promise<AuthSession> => {
  const response = await apiRequest<AuthResponseData>("/auth/signin", {
    method: "POST",
    body: {
      email: normalizeEmail(input.email),
      password: input.password,
    },
    includeAuth: false,
  });

  const session = buildAuthSession(response.data);
  await persistAuthSession(
    {
      ...session,
      // The auth response user can be slimmer than /me/profile.
      // Keep login routing dependent on the fresh profile fetch instead.
      user: null,
    },
    { syncStore: false },
  );
  clearProtectedQueryCache();
  return session;
};

export const signInWithSocialProvider = async (
  input: SocialSignInInput,
): Promise<AuthSession> => {
  const response = await apiRequest<AuthResponseData>("/auth/social-signin", {
    method: "POST",
    body: {
      provider: input.provider,
      idToken: input.idToken,
      accessToken: input.accessToken ?? undefined,
    },
    includeAuth: false,
  });

  const session = buildAuthSession(response.data);
  await persistAuthSession(
    {
      ...session,
      // Social auth can return a partial user snapshot too.
      user: null,
    },
    { syncStore: false },
  );
  clearProtectedQueryCache();
  return session;
};

export const sendVerificationCode = async (email: string) => {
  await apiRequest<null>("/auth/send-verification-code", {
    method: "POST",
    body: {
      email: normalizeEmail(email),
      appType: getAuthAppType(),
    },
    includeAuth: false,
  });
};

export const verifyUserCode = async (email: string, code: string) => {
  const response = await apiRequest<{ user: AuthUser }>(
    "/auth/verify-user-code",
    {
      method: "POST",
      body: {
        email: normalizeEmail(email),
        code: code.trim(),
      },
      includeAuth: false,
    },
  );

  return response.data.user;
};

export const requestPasswordReset = async (email: string) => {
  await apiRequest<null>("/auth/forgot-password", {
    method: "POST",
    body: {
      email: normalizeEmail(email),
      appType: getAuthAppType(),
    },
    includeAuth: false,
  });
};

export const verifyResetCode = async (
  email: string,
  code: string,
): Promise<VerifyResetCodeResponseData> => {
  const response = await apiRequest<VerifyResetCodeResponseData>(
    "/auth/verify-reset-code",
    {
      method: "POST",
      body: {
        email: normalizeEmail(email),
        code: code.trim(),
      },
      includeAuth: false,
    },
  );

  if (!response.success || !response.data?.codeValid) {
    throw new Error(response.message || "Invalid or expired reset code");
  }

  return response.data;
};

export const resetPasswordWithCode = async (
  email: string,
  code: string,
  newPassword: string,
) => {
  await apiRequest<null>("/auth/reset-password", {
    method: "POST",
    body: {
      email: normalizeEmail(email),
      code: code.trim(),
      newPassword,
    },
    includeAuth: false,
  });
};

export const getCurrentUserProfile = async (): Promise<AuthUser | null> => {
  try {
    const response = await apiRequest<AuthUser>("/me/profile");
    await updateStoredSessionUser(response.data);
    return response.data;
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 404) {
      return null;
    }

    throw toApiError(error);
  }
};

export const primeAuthenticatedUserData = async (
  user: AuthUser | null | undefined,
) => {
  const userId = user?.id || user?.$id;
  if (!userId) return;
  const normalizedGender = user?.gender?.trim?.().toLowerCase?.() ?? "";

  const prefetchJobs: Promise<unknown>[] = [
    queryClient.prefetchQuery({
      queryKey: queryKeys.wallet.files(userId),
      queryFn: () => fetchUserFiles(userId),
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.screenings.overview(userId),
      queryFn: () => loadScreeningOverviewData(userId),
    }),
  ];

  if (normalizedGender === "female") {
    prefetchJobs.push(
      queryClient.prefetchQuery({
        queryKey: queryKeys.pregnancy.plan(userId),
        queryFn: () => loadPregnancyPlan(userId),
      }),
    );
  }

  await Promise.allSettled(prefetchJobs);
};

export const signOutWithApi = async () => {
  const session = await getStoredAuthSession();

  try {
    await apiRequest<null>("/auth/logout", {
      method: "POST",
      body: session?.refreshToken
        ? {
            refreshToken: session.refreshToken,
          }
        : undefined,
    });
  } catch {
    // Logout should still clear local auth state even if the backend rejects it.
  } finally {
    await clearAuthSession();
    queryClient.clear();
  }
};
