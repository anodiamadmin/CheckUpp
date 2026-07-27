import dns from "node:dns";
import { UserRole } from "@prisma/client";
import { prisma } from "../src/db/prisma";

const DEFAULT_EMAIL = "clinician@checkupp.com";
const DEFAULT_NAME = "CheckUpp Clinician";
const DEFAULT_ORG_NAME = "CheckUpp Demo Clinic";
const DEFAULT_ORG_SLUG = "checkupp-demo-clinic";

dns.setDefaultResultOrder("ipv4first");

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const hasSslModeInUrl = (value: string) => /[?&]sslmode=/i.test(value);

const withRetry = async <T>(label: string, operation: () => Promise<T>) => {
  const maxAttempts = Number(process.env.MIGRATION_DB_MAX_ATTEMPTS ?? "8");
  const baseSleepMs = Number(process.env.MIGRATION_DB_RETRY_BASE_MS ?? "1000");
  const maxSleepMs = Number(process.env.MIGRATION_DB_RETRY_MAX_MS ?? "12000");
  let attempt = 0;

  while (attempt < maxAttempts) {
    try {
      return await operation();
    } catch (error) {
      attempt += 1;

      const code =
        typeof error === "object" && error !== null && "code" in error
          ? String((error as { code?: unknown }).code ?? "")
          : "";
      const message =
        error instanceof Error
          ? error.message.toLowerCase()
          : String(error).toLowerCase();
      const retryable =
        code === "ETIMEDOUT" ||
        code === "ECONNRESET" ||
        code === "P1001" ||
        code === "P1008" ||
        message.includes("timed out") ||
        message.includes("timeout") ||
        message.includes("connection");

      if (!retryable || attempt >= maxAttempts) {
        throw error;
      }

      const backoff = Math.min(baseSleepMs * 2 ** (attempt - 1), maxSleepMs);
      const jitter = Math.floor(Math.random() * 250);
      const waitMs = backoff + jitter;

      console.warn(
        `[seed:clinician-login] ${label} attempt ${attempt}/${maxAttempts} failed (${code || "unknown"}). Retrying in ${waitMs}ms...`,
      );
      await sleep(waitMs);
    }
  }

  throw new Error(`[seed:clinician-login] exhausted retries for ${label}`);
};

const run = async () => {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }
  if (!hasSslModeInUrl(databaseUrl)) {
    console.warn(
      "[seed:clinician-login] DATABASE_URL has no sslmode. Neon typically needs '?sslmode=require' (or verify-full).",
    );
  }

  const email = (process.env.SEED_CLINICIAN_EMAIL ?? DEFAULT_EMAIL)
    .trim()
    .toLowerCase();
  const name = (process.env.SEED_CLINICIAN_NAME ?? DEFAULT_NAME).trim();
  const orgName = (
    process.env.SEED_CLINICIAN_ORG_NAME ?? DEFAULT_ORG_NAME
  ).trim();
  const orgSlug = (process.env.SEED_CLINICIAN_ORG_SLUG ?? DEFAULT_ORG_SLUG)
    .trim()
    .toLowerCase();

  const organization = await withRetry("organization.upsert", () =>
    prisma.organization.upsert({
      where: { slug: orgSlug },
      create: {
        name: orgName,
        slug: orgSlug,
      },
      update: {
        name: orgName,
      },
    }),
  );

  const existingUser = await withRetry("user.findUnique", () =>
    prisma.user.findUnique({
      where: { email },
    }),
  );

  const user = existingUser
    ? await withRetry("user.update", () =>
        prisma.user.update({
          where: { id: existingUser.id },
          data: {
            role: UserRole.CLINICIAN,
            isDeleted: false,
            name: existingUser.name?.trim() ? undefined : name,
          },
        }),
      )
    : await withRetry("user.create", () =>
        prisma.user.create({
          data: {
            email,
            name,
            role: UserRole.CLINICIAN,
            isDeleted: false,
          },
        }),
      );

  const existingProfile = await withRetry("clinicianProfile.findUnique", () =>
    prisma.clinicianProfile.findUnique({
      where: { userId: user.id },
    }),
  );

  const profile = existingProfile
    ? await withRetry("clinicianProfile.update", () =>
        prisma.clinicianProfile.update({
          where: { id: existingProfile.id },
          data: {
            isActive: true,
            organizationId: existingProfile.organizationId ?? organization.id,
          },
        }),
      )
    : await withRetry("clinicianProfile.create", () =>
        prisma.clinicianProfile.create({
          data: {
            userId: user.id,
            organizationId: organization.id,
            isActive: true,
          },
        }),
      );

  console.log(
    JSON.stringify(
      {
        seeded: true,
        authMode: process.env.AUTH_MODE ?? "dev",
        clinician: {
          email,
          role: user.role,
          userId: user.id,
          clinicianProfileId: profile.id,
        },
        organization: {
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
        },
        note: "Backend does not store passwords. Web email/password sign-in is handled by Firebase Auth.",
      },
      null,
      2,
    ),
  );
};

run()
  .catch((error) => {
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? String((error as { code?: unknown }).code ?? "")
        : "";
    if (code === "ETIMEDOUT") {
      console.error(
        "[seed:clinician-login] Timed out reaching Postgres. This is connectivity/SSL routing, not a Prisma schema bug.",
      );
      console.error(
        "[seed:clinician-login] Verify DATABASE_URL + sslmode, then test with: psql \"$DATABASE_URL\" -c 'select 1'",
      );
    }
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
