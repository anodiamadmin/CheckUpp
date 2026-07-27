import crypto from "crypto";
import { env } from "../../config/env";
import { AUTH_ERROR_CODES, createAuthError } from "./auth.errors";

type SocialProvider = "google" | "apple";

interface Jwk {
  kid?: string;
  alg?: string;
  kty: string;
  use?: string;
  n?: string;
  e?: string;
  crv?: string;
  x?: string;
  y?: string;
}

interface JwksResponse {
  keys: Jwk[];
}

interface JwtHeader {
  alg?: string;
  kid?: string;
}

interface SocialTokenPayload {
  sub: string;
  aud: string | string[];
  iss: string;
  exp: number;
  email?: string;
  email_verified?: boolean | string;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
}

export interface VerifiedSocialIdentity {
  provider: SocialProvider;
  providerUserId: string;
  email?: string;
  emailVerified: boolean;
  name?: string;
  avatarUrl?: string;
}

const jwksCache = new Map<string, { expiresAt: number; jwks: JwksResponse }>();
const JWKS_CACHE_TTL_MS = 60 * 60 * 1000;
const JWKS_FETCH_TIMEOUT_MS = 5_000;
const JWKS_FETCH_ATTEMPTS = 2;

const base64UrlDecode = (value: string) => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(normalized + padding, "base64");
};

const decodeJsonPart = <T>(part: string): T => {
  try {
    return JSON.parse(base64UrlDecode(part).toString("utf8")) as T;
  } catch {
    throw createAuthError(
      401,
      "We couldn't verify that sign-in. Please try again.",
      AUTH_ERROR_CODES.socialInvalidToken,
    );
  }
};

const getJwks = async (url: string, provider: SocialProvider) => {
  const cached = jwksCache.get(url);
  if (cached && cached.expiresAt > Date.now()) return cached.jwks;

  let lastError: unknown;

  for (let attempt = 1; attempt <= JWKS_FETCH_ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      JWKS_FETCH_TIMEOUT_MS,
    );

    try {
      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw createAuthError(
          502,
          "Sign-in is temporarily unavailable. Please try again shortly.",
          AUTH_ERROR_CODES.socialKeysFetchFailed,
          {
            provider,
            failureCategory: "jwks_fetch_failed",
            httpStatus: response.status,
            jwksUrl: url,
            attempt,
          },
        );
      }

      const jwks = (await response.json()) as JwksResponse;
      jwksCache.set(url, {
        jwks,
        expiresAt: Date.now() + JWKS_CACHE_TTL_MS,
      });
      return jwks;
    } catch (error) {
      lastError = error;

      if (cached?.jwks) {
        return cached.jwks;
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  if (
    typeof lastError === "object" &&
    lastError !== null &&
    "name" in lastError &&
    lastError.name === "AbortError"
  ) {
    throw createAuthError(
      502,
      "Sign-in is temporarily unavailable. Please try again shortly.",
      AUTH_ERROR_CODES.socialKeysTimeout,
      {
        provider,
        failureCategory: "jwks_timeout",
        jwksUrl: url,
      },
    );
  }

  throw createAuthError(
    502,
    "Sign-in is temporarily unavailable. Please try again shortly.",
    AUTH_ERROR_CODES.socialKeysFetchFailed,
    {
      provider,
      failureCategory: "jwks_fetch_failed",
      jwksUrl: url,
    },
  );
};

const hasExpectedAudience = (
  audience: string | string[],
  expectedAudiences: string[],
) => {
  const audiences = Array.isArray(audience) ? audience : [audience];
  return audiences.some((value) => expectedAudiences.includes(value));
};

const isEmailVerified = (value: boolean | string | undefined) =>
  value === true || value === "true";

const verifyJwtWithJwks = async (params: {
  provider: SocialProvider;
  idToken: string;
  jwksUrl: string;
  issuers: string[];
  audiences: string[];
}) => {
  if (params.audiences.length === 0) {
    throw createAuthError(
      500,
      "Social sign-in is unavailable right now. Please try again later.",
      AUTH_ERROR_CODES.socialAudiencesNotConfigured,
      {
        failureCategory: "audiences_not_configured",
      },
    );
  }

  const parts = params.idToken.split(".");
  if (parts.length !== 3) {
    throw createAuthError(
      401,
      "We couldn't verify that sign-in. Please try again.",
      AUTH_ERROR_CODES.socialInvalidToken,
    );
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const header = decodeJsonPart<JwtHeader>(encodedHeader);
  const payload = decodeJsonPart<SocialTokenPayload>(encodedPayload);

  if (header.alg !== "RS256" || !header.kid) {
    throw createAuthError(
      401,
      "We couldn't verify that sign-in. Please try again.",
      AUTH_ERROR_CODES.socialUnsupportedToken,
    );
  }

  if (!payload.sub || !payload.iss || !payload.aud || !payload.exp) {
    throw createAuthError(
      401,
      "We couldn't verify that sign-in. Please try again.",
      AUTH_ERROR_CODES.socialInvalidToken,
    );
  }

  if (!params.issuers.includes(payload.iss)) {
    throw createAuthError(
      401,
      "We couldn't verify that sign-in. Please try again.",
      AUTH_ERROR_CODES.socialInvalidIssuer,
      {
        failureCategory: "invalid_issuer",
        issuer: payload.iss,
      },
    );
  }

  if (!hasExpectedAudience(payload.aud, params.audiences)) {
    throw createAuthError(
      401,
      "Social sign-in is unavailable for this app build right now.",
      AUTH_ERROR_CODES.socialInvalidAudience,
      {
        failureCategory: "invalid_audience",
        audience: payload.aud,
      },
    );
  }

  if (payload.exp * 1000 < Date.now()) {
    throw createAuthError(
      401,
      "Your sign-in session expired. Please try again.",
      AUTH_ERROR_CODES.socialExpiredToken,
      {
        failureCategory: "expired_token",
      },
    );
  }

  const jwks = await getJwks(params.jwksUrl, params.provider);
  const jwk = jwks.keys.find((key) => key.kid === header.kid);
  if (!jwk) {
    throw createAuthError(
      401,
      "We couldn't verify that sign-in. Please try again.",
      AUTH_ERROR_CODES.socialKeyNotFound,
      {
        failureCategory: "jwks_key_not_found",
        kid: header.kid,
      },
    );
  }

  const publicKey = crypto.createPublicKey({ key: jwk, format: "jwk" });
  const verified = crypto.verify(
    "RSA-SHA256",
    Buffer.from(`${encodedHeader}.${encodedPayload}`),
    publicKey,
    base64UrlDecode(encodedSignature),
  );

  if (!verified) {
    throw createAuthError(
      401,
      "We couldn't verify that sign-in. Please try again.",
      AUTH_ERROR_CODES.socialInvalidSignature,
      {
        failureCategory: "invalid_signature",
      },
    );
  }

  return payload;
};

export const verifySocialIdentity = async (
  provider: SocialProvider,
  idToken: string,
): Promise<VerifiedSocialIdentity> => {
  const payload =
    provider === "google"
      ? await verifyJwtWithJwks({
          provider,
          idToken,
          jwksUrl: "https://www.googleapis.com/oauth2/v3/certs",
          issuers: ["accounts.google.com", "https://accounts.google.com"],
          audiences: env.googleOAuthClientIds,
        })
      : await verifyJwtWithJwks({
          provider,
          idToken,
          jwksUrl: "https://appleid.apple.com/auth/keys",
          issuers: ["https://appleid.apple.com"],
          audiences: env.appleOAuthClientIds,
        });

  const email = payload.email?.trim().toLowerCase();
  const name =
    payload.name ??
    ([payload.given_name, payload.family_name].filter(Boolean).join(" ") ||
      undefined);

  return {
    provider,
    providerUserId: payload.sub,
    email,
    emailVerified:
      isEmailVerified(payload.email_verified) || provider === "apple",
    name,
    avatarUrl: payload.picture,
  };
};
