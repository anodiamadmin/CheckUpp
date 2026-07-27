import { z } from "zod";
import { useSessionStore } from "@/lib/state/session-store";

const apiPaginationSchema = z.object({
  page: z.number(),
  pageSize: z.number(),
  total: z.number(),
  totalPages: z.number(),
});

const apiEnvelopeSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  data: z.unknown(),
  pagination: apiPaginationSchema.optional(),
});

const normalizeBaseUrl = (value: string) => value.trim().replace(/\/+$/, "");

const apiBaseUrl = normalizeBaseUrl(
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5555/api/v1",
);

const isDevMode =
  (process.env.NEXT_PUBLIC_APP_ENV || "development") !== "production";
const devUserRole = (
  process.env.NEXT_PUBLIC_DEV_USER_ROLE || "CLINICIAN"
).toUpperCase();

let refreshPromise: Promise<boolean> | null = null;

export class ApiClientError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  query?: Record<string, string | number | boolean | null | undefined>;
  body?: unknown;
  headers?: Record<string, string>;
  includeAuth?: boolean;
}

const buildUrl = (
  path: string,
  query?: Record<string, string | number | boolean | null | undefined>,
) => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const base = `${apiBaseUrl}${normalizedPath}`;

  if (!query) return base;

  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value === null || value === undefined) return;
    params.append(key, String(value));
  });

  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
};

const parseJsonSafely = async (response: Response) => {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
};

const buildAuthHeaders = async () => {
  const headers: Record<string, string> = {};
  const session = useSessionStore.getState();

  if (session.accessToken) {
    headers.Authorization = `Bearer ${session.accessToken}`;
  }

  if (isDevMode) {
    const email = session.userEmail;
    const name = session.userName;

    if (email) headers["x-user-email"] = email;
    if (name) headers["x-user-name"] = name;
    headers["x-user-role"] = session.role ?? devUserRole;
  }

  return headers;
};

const refreshSession = async () => {
  const session = useSessionStore.getState();
  if (!session.refreshToken) return false;

  if (!refreshPromise) {
    refreshPromise = (async () => {
      const response = await fetch(buildUrl("/auth/refresh"), {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refreshToken: session.refreshToken }),
      });

      const payload = await parseJsonSafely(response);
      if (!response.ok) {
        useSessionStore.getState().clearSession();
        return false;
      }

      const parsed = authEnvelopeSchema.safeParse(payload);
      if (!parsed.success) {
        useSessionStore.getState().clearSession();
        return false;
      }

      const { data } = parsed.data;
      useSessionStore.getState().setSession({
        accessToken: data.token,
        refreshToken: data.refreshToken,
        expiresAt: data.expiresAt,
        refreshExpiresAt: data.refreshExpiresAt,
        userId: data.user.id,
        userEmail: data.user.email,
        userName: data.user.name,
        role: data.user.role,
      });
      return true;
    })().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
};

export const authUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string().nullable().optional(),
  role: z.enum(["ADMIN", "CLINICIAN", "PATIENT"]),
  avatarUrl: z.string().nullable().optional(),
  phoneNumber: z.string().nullable().optional(),
  emailVerified: z.boolean().optional(),
});

export const authResponseSchema = z.object({
  user: authUserSchema,
  token: z.string(),
  refreshToken: z.string(),
  expiresAt: z.string(),
  refreshExpiresAt: z.string(),
});

const authEnvelopeSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  data: authResponseSchema,
});

const executeRequest = async (
  path: string,
  options: RequestOptions,
  authHeaders: Record<string, string>,
) => {
  const {
    method = "GET",
    query,
    body,
    headers = {},
  } = options;

  const requestHeaders: Record<string, string> = {
    Accept: "application/json",
    ...authHeaders,
    ...headers,
  };

  if (body !== undefined && !requestHeaders["Content-Type"]) {
    requestHeaders["Content-Type"] = "application/json";
  }

  return fetch(buildUrl(path, query), {
    method,
    headers: requestHeaders,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
};

export const apiRequest = async <TSchema extends z.ZodTypeAny>(
  path: string,
  schema: TSchema,
  options: RequestOptions = {},
): Promise<z.infer<TSchema>> => {
  const { includeAuth = true } = options;
  const authHeaders = includeAuth ? await buildAuthHeaders() : {};
  let response = await executeRequest(path, options, authHeaders);

  const payload = await parseJsonSafely(response);

  if (!response.ok) {
    if (includeAuth && response.status === 401 && (await refreshSession())) {
      response = await executeRequest(path, options, await buildAuthHeaders());
      const retryPayload = await parseJsonSafely(response);
      if (response.ok) {
        const maybeEnvelope = apiEnvelopeSchema.safeParse(retryPayload);
        if (maybeEnvelope.success) {
          return schema.parse(maybeEnvelope.data.data);
        }

        return schema.parse(retryPayload);
      }
    }

    const fallbackMessage = `Request failed with status ${response.status}`;
    const message =
      typeof payload === "object" && payload !== null && "message" in payload
        ? String((payload as { message?: unknown }).message ?? fallbackMessage)
        : fallbackMessage;

    throw new ApiClientError(response.status, message, payload);
  }

  const maybeEnvelope = apiEnvelopeSchema.safeParse(payload);
  if (maybeEnvelope.success) {
    return schema.parse(maybeEnvelope.data.data);
  }

  return schema.parse(payload);
};

export const apiConfig = {
  baseUrl: apiBaseUrl,
};
