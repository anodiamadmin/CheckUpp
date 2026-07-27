import { Prisma } from "@prisma/client";

export const consentScopeDomainValues = [
  "screenings",
  "documents",
  "pregnancy",
  "feedback",
  "profile",
] as const;

export const consentScopeAccessLevelValues = ["READ_ONLY", "READ_WRITE"] as const;

export type ConsentScopeDomain = (typeof consentScopeDomainValues)[number];
export type ConsentAccessLevel = (typeof consentScopeAccessLevelValues)[number];

export interface ConsentScopeInput {
  accessLevel?: ConsentAccessLevel;
  domains: ConsentScopeDomain[];
  includeHistory?: boolean;
  note?: string | null;
}

export interface NormalizedConsentScope {
  accessLevel: ConsentAccessLevel;
  domains: ConsentScopeDomain[];
  includeHistory: boolean;
  note?: string;
}

const toDomain = (value: unknown): ConsentScopeDomain | null => {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (!consentScopeDomainValues.includes(normalized as ConsentScopeDomain)) return null;
  return normalized as ConsentScopeDomain;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const normalizeConsentScopeForStorage = (
  scope?: ConsentScopeInput | null,
) => {
  if (scope === undefined) return undefined;
  if (scope === null) return Prisma.JsonNull;

  const domains = Array.from(
    new Set(scope.domains.map((domain) => toDomain(domain)).filter((domain): domain is ConsentScopeDomain => Boolean(domain))),
  );

  if (domains.length === 0) return Prisma.JsonNull;

  const normalizedScope: Record<string, Prisma.InputJsonValue> = {
    accessLevel: scope.accessLevel ?? "READ_ONLY",
    domains,
    includeHistory: scope.includeHistory ?? true,
  };

  const note = scope.note?.trim();
  if (note) {
    normalizedScope.note = note;
  }

  return normalizedScope;
};

export const parseConsentScope = (
  value: Prisma.JsonValue | null | undefined,
): NormalizedConsentScope | null => {
  if (!isRecord(value)) return null;

  const domainsValue = value.domains;
  if (!Array.isArray(domainsValue)) return null;

  const domains = Array.from(
    new Set(domainsValue.map((domain) => toDomain(domain)).filter((domain): domain is ConsentScopeDomain => Boolean(domain))),
  );

  if (domains.length === 0) return null;

  const accessLevel =
    value.accessLevel === "READ_WRITE"
      ? "READ_WRITE"
      : "READ_ONLY";

  const includeHistory = typeof value.includeHistory === "boolean"
    ? value.includeHistory
    : true;

  const note = typeof value.note === "string" ? value.note.trim() : "";

  return {
    accessLevel,
    domains,
    includeHistory,
    ...(note ? { note } : {}),
  };
};

export const hasConsentDomain = (
  scope: NormalizedConsentScope | null,
  domain: ConsentScopeDomain,
) => {
  if (!scope) return true;
  return scope.domains.includes(domain);
};

