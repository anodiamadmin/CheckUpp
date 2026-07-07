import {
  buildAuthSession,
  clearAuthSession,
  getStoredAuthSession,
  persistAuthSession,
} from "@/lib/auth/session";
import Constants from "expo-constants";
import { Platform } from "react-native";

type Primitive = string | number | boolean;

type QueryValue = Primitive | null | undefined;

export interface ApiPagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  data: T;
  pagination?: ApiPagination;
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  query?: Record<string, QueryValue>;
  body?: unknown;
  headers?: Record<string, string>;
  includeAuth?: boolean;
  skipAuthRefresh?: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  pagination?: ApiPagination;
}

export class ApiClientError extends Error {
  status: number;
  code?: string;
  details?: unknown;
  responseBody?: unknown;

  constructor(
    status: number,
    message: string,
    code?: string,
    details?: unknown,
    responseBody?: unknown,
  ) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
    this.responseBody = responseBody;
  }
}

const clientPlatform = Platform.OS;
const clientAppType = Platform.OS === "web" ? "web" : "mobile";
const clientVersion = Constants.expoConfig?.version ?? "unknown";
const clientBuild =
  Platform.OS === "ios"
    ? Constants.expoConfig?.ios?.buildNumber
    : Constants.expoConfig?.android?.versionCode;

const getClientTraceHeaders = (): Record<string, string> => ({
  "x-client-platform": clientPlatform,
  "x-client-app-type": clientAppType,
  "x-client-version": String(clientVersion),
  ...(clientBuild !== undefined && clientBuild !== null
    ? { "x-client-build": String(clientBuild) }
    : {}),
});

const normalizeBaseUrl = (value: string) => value.trim().replace(/\/+$/, "");

const getExpoHost = () => {
  const hostFromExpoConfig = (Constants.expoConfig as any)?.hostUri;
  const hostFromManifest = (Constants as any)?.manifest2?.extra?.expoClient
    ?.hostUri;
  const hostUri = hostFromExpoConfig || hostFromManifest;
  if (!hostUri || typeof hostUri !== "string") return null;

  return hostUri.split(":")[0] || null;
};

const inferredExpoHost = getExpoHost();

const defaultBaseUrl = inferredExpoHost
  ? `http://${inferredExpoHost}:3090/api/v1`
  : Platform.OS === "android"
    ? "http://10.0.2.2:3090/api/v1"
    : "http://localhost:3090/api/v1";

const apiBaseUrl = normalizeBaseUrl(
  process.env.EXPO_PUBLIC_API_BASE_URL || defaultBaseUrl,
);

const devHeaderFlag = (process.env.EXPO_PUBLIC_API_DEV_MODE ?? "")
  .trim()
  .toLowerCase();

const includeDevHeaders = ["true", "1", "yes", "on"].includes(devHeaderFlag);

const buildUrl = (path: string, query?: Record<string, QueryValue>) => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${apiBaseUrl}${normalizedPath}`;

  if (!query) return url;

  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value === null || value === undefined) return;
    params.append(key, String(value));
  });

  const queryString = params.toString();
  if (!queryString) return url;

  return `${url}?${queryString}`;
};

const parseJsonSafely = (raw: string) => {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
};

const parseResponseBody = async (response: Response) => {
  const raw = await response.text();
  if (!raw) return null;
  return parseJsonSafely(raw);
};

let refreshRequestPromise: Promise<string | null> | null = null;

export const getApiAuthHeaders = async (
  accessTokenOverride?: string | null,
): Promise<Record<string, string>> => {
  const session = await getStoredAuthSession();
  const authHeaders: Record<string, string> = {};
  const accessToken = accessTokenOverride ?? session?.accessToken;

  if (accessToken) {
    authHeaders.Authorization = `Bearer ${accessToken}`;
  }

  if (includeDevHeaders || !authHeaders.Authorization) {
    if (session?.user?.email) {
      authHeaders["x-user-email"] = session.user.email;
    }
    if (session?.user?.name) {
      authHeaders["x-user-name"] = session.user.name;
    }
  }

  Object.assign(authHeaders, getClientTraceHeaders());

  return authHeaders;
};

const extractErrorCode = (parsedBody: unknown) => {
  if (
    typeof parsedBody === "object" &&
    parsedBody !== null &&
    "code" in parsedBody &&
    typeof parsedBody.code === "string"
  ) {
    return parsedBody.code;
  }

  if (
    typeof parsedBody === "object" &&
    parsedBody !== null &&
    "details" in parsedBody &&
    typeof parsedBody.details === "object" &&
    parsedBody.details !== null &&
    "code" in parsedBody.details &&
    typeof parsedBody.details.code === "string"
  ) {
    return parsedBody.details.code;
  }

  return undefined;
};

const extractErrorMessage = (status: number, parsedBody: unknown) => {
  if (
    typeof parsedBody === "object" &&
    parsedBody !== null &&
    "message" in parsedBody &&
    typeof parsedBody.message === "string"
  ) {
    return parsedBody.message;
  }

  return `Request failed with status ${status}`;
};

const extractErrorDetails = (parsedBody: unknown) => {
  if (
    typeof parsedBody === "object" &&
    parsedBody !== null &&
    "details" in parsedBody
  ) {
    return parsedBody.details;
  }

  return undefined;
};

const toNetworkError = (path: string, error: unknown): ApiClientError => {
  const message =
    error instanceof Error && error.message
      ? `Network error while requesting ${path}. Please check your connection and backend availability.`
      : `Network error while requesting ${path}.`;

  return new ApiClientError(
    0,
    message,
    "AUTH_NETWORK_ERROR",
    {
      code: "AUTH_NETWORK_ERROR",
      path,
      platform: clientPlatform,
      baseUrl: apiBaseUrl,
    },
    error,
  );
};

const refreshAccessToken = async (): Promise<string | null> => {
  if (refreshRequestPromise) {
    return refreshRequestPromise;
  }

  refreshRequestPromise = (async () => {
    const session = await getStoredAuthSession();
    const refreshToken = session?.refreshToken;

    if (!refreshToken) {
      await clearAuthSession();
      return null;
    }

    const response = await fetch(buildUrl("/auth/refresh"), {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...getClientTraceHeaders(),
      },
      body: JSON.stringify({ refreshToken }),
    });

    const parsedBody = await parseResponseBody(response);

    if (!response.ok) {
      throw new ApiClientError(
        response.status,
        extractErrorMessage(response.status, parsedBody),
        extractErrorCode(parsedBody),
        extractErrorDetails(parsedBody),
        parsedBody,
      );
    }

    const responseData =
      typeof parsedBody === "object" &&
      parsedBody !== null &&
      "data" in parsedBody
        ? parsedBody.data
        : parsedBody;

    if (!responseData || typeof responseData !== "object") {
      throw new ApiClientError(
        response.status,
        "Token refresh response was malformed",
        "AUTH_REFRESH_RESPONSE_MALFORMED",
        undefined,
        parsedBody,
      );
    }

    const nextSession = buildAuthSession(responseData as any);
    await persistAuthSession({
      ...session,
      ...nextSession,
      // Refresh should preserve the last fully-hydrated profile snapshot.
      user: session?.user ?? null,
    });

    return nextSession.accessToken;
  })()
    .catch(async (error) => {
      await clearAuthSession();
      throw error;
    })
    .finally(() => {
      refreshRequestPromise = null;
    });

  return refreshRequestPromise;
};

export const apiRequest = async <T>(
  path: string,
  options: RequestOptions = {},
): Promise<ApiResponse<T>> => {
  const {
    method = "GET",
    query,
    body,
    headers = {},
    includeAuth = true,
    skipAuthRefresh = false,
  } = options;

  const executeRequest = async (
    accessTokenOverride?: string | null,
    allowRefresh = true,
  ): Promise<ApiResponse<T>> => {
    const authHeaders = includeAuth
      ? await getApiAuthHeaders(accessTokenOverride)
      : {};
    const requestHeaders: Record<string, string> = {
      Accept: "application/json",
      ...authHeaders,
      ...headers,
    };

    if (body !== undefined && !requestHeaders["Content-Type"]) {
      requestHeaders["Content-Type"] = "application/json";
    }

    let response: Response;

    try {
      response = await fetch(buildUrl(path, query), {
        method,
        headers: requestHeaders,
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });
    } catch (error) {
      throw toNetworkError(path, error);
    }

    const parsedBody = await parseResponseBody(response);

    if (!response.ok) {
      if (
        response.status === 401 &&
        includeAuth &&
        allowRefresh &&
        !skipAuthRefresh &&
        path !== "/auth/refresh"
      ) {
        const refreshedAccessToken = await refreshAccessToken();

        if (refreshedAccessToken) {
          return executeRequest(refreshedAccessToken, false);
        }
      }

      throw new ApiClientError(
        response.status,
        extractErrorMessage(response.status, parsedBody),
        extractErrorCode(parsedBody),
        extractErrorDetails(parsedBody),
        parsedBody,
      );
    }

    if (parsedBody === null) {
      return {
        success: true,
        data: null as T,
        message: "No content",
      };
    }

    if (
      typeof parsedBody === "object" &&
      parsedBody !== null &&
      "success" in parsedBody &&
      "data" in parsedBody
    ) {
      const envelope = parsedBody as ApiEnvelope<T>;
      return {
        success: Boolean(envelope.success),
        message: envelope.message,
        data: envelope.data,
        pagination: envelope.pagination,
      };
    }

    return {
      success: true,
      data: parsedBody as T,
    };
  };

  return executeRequest();
};

export const apiConfig = {
  baseUrl: apiBaseUrl,
};
