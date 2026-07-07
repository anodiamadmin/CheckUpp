import { apiRequest } from "@/lib/api/client";

export const consentScopeDomainValues = [
  "screenings",
  "documents",
  "pregnancy",
  "feedback",
  "profile",
] as const;

export type ConsentScopeDomain = (typeof consentScopeDomainValues)[number];
export type ConsentAccessLevel = "READ_ONLY" | "READ_WRITE";
export type ConsentStatus =
  | "REQUESTED"
  | "ACTIVE"
  | "DECLINED"
  | "REVOKED"
  | "EXPIRED";

export interface ConsentScope {
  accessLevel?: ConsentAccessLevel;
  domains: ConsentScopeDomain[];
  includeHistory?: boolean;
  note?: string | null;
}

export interface ConsentRequest {
  id: string;
  patientId: string;
  clinicianId: string;
  requestedScope?: ConsentScope | null;
  scope?: ConsentScope | null;
  requestMessage?: string | null;
  responseReason?: string | null;
  status: ConsentStatus;
  requestedAt?: string | null;
  grantedAt?: string | null;
  respondedAt?: string | null;
  revokedAt?: string | null;
  expiresAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  clinician?: {
    id: string;
    specialty?: string | null;
    licenseNumber?: string | null;
    organization?: {
      id: string;
      name?: string | null;
    } | null;
    user?: {
      id: string;
      name?: string | null;
      email?: string | null;
    } | null;
  } | null;
}

export const listMyConsentRequests = async (status: ConsentStatus = "REQUESTED") => {
  const response = await apiRequest<ConsentRequest[]>("/me/consents/requests", {
    query: {
      page: 1,
      pageSize: 100,
      status,
    },
  });

  return response.data ?? [];
};

export const approveMyConsentRequest = async (
  consentId: string,
  input: {
    scope?: ConsentScope | null;
    expiresAt?: string | null;
    responseReason?: string | null;
  } = {},
) => {
  const response = await apiRequest<ConsentRequest>(
    `/me/consents/${consentId}/approve`,
    {
      method: "POST",
      body: {
        scope: input.scope,
        expiresAt: input.expiresAt ?? null,
        responseReason: input.responseReason ?? null,
      },
    },
  );

  return response.data;
};

export const declineMyConsentRequest = async (
  consentId: string,
  reason?: string,
) => {
  const response = await apiRequest<ConsentRequest>(
    `/me/consents/${consentId}/decline`,
    {
      method: "POST",
      body: {
        reason: reason?.trim() || null,
      },
    },
  );

  return response.data;
};

export const revokeMyConsent = async (consentId: string, reason?: string) => {
  const response = await apiRequest<ConsentRequest>(
    `/me/consents/${consentId}/revoke`,
    {
      method: "POST",
      body: {
        reason: reason?.trim() || null,
      },
    },
  );

  return response.data;
};

