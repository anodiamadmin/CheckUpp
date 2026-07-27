import { Prisma, UserRole } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { ApiError } from "../../middlewares/error-handler";
import { toSkipTake, withPagination } from "../../utils/pagination";
import { hashPassword } from "../auth/auth.crypto";

interface ListInput {
  page: number;
  pageSize: number;
  search?: string;
}

interface CreateOrganizationInput {
  name: string;
  slug?: string;
}

interface UpdateOrganizationInput {
  name?: string;
  slug?: string;
}

interface ListCliniciansInput extends ListInput {
  organizationId?: string | null;
  isActive?: boolean;
}

interface CreateClinicianInput {
  email: string;
  name: string;
  password: string;
  phoneNumber?: string | null;
  organizationId?: string | null;
  licenseNumber?: string | null;
  specialty?: string | null;
  isActive?: boolean;
  emailVerified?: boolean;
}

interface UpdateClinicianInput {
  name?: string;
  phoneNumber?: string | null;
  organizationId?: string | null;
  licenseNumber?: string | null;
  specialty?: string | null;
  isActive?: boolean;
  emailVerified?: boolean;
}

interface ListPermissionsInput {
  organizationId?: string | null;
}

interface UpsertPermissionInput {
  organizationId: string;
  userEmail: string;
  role?: string;
  scopes?: Prisma.InputJsonValue | null;
}

interface ListAuditLogsInput extends ListInput {
  resourceType?: string | null;
  action?: string | null;
}

const normalizeNullable = (value?: string | null) => {
  if (value === undefined) return undefined;
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);

const organizationSelect = {
  id: true,
  name: true,
  slug: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      clinicians: true,
    },
  },
} satisfies Prisma.OrganizationSelect;

const clinicianInclude = {
  user: {
    select: {
      id: true,
      email: true,
      name: true,
      avatarUrl: true,
      phoneNumber: true,
      emailVerified: true,
      role: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
    },
  },
  organization: true,
  _count: {
    select: {
      patientLinks: true,
      consents: true,
    },
  },
} satisfies Prisma.ClinicianProfileInclude;

export const listOrganizations = async (query: ListInput) => {
  const paging = toSkipTake(query);
  const search = query.search?.trim();
  const where: Prisma.OrganizationWhereInput = search
    ? {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { slug: { contains: search, mode: "insensitive" } },
        ],
      }
    : {};

  const [items, total] = await Promise.all([
    prisma.organization.findMany({
      where,
      select: organizationSelect,
      orderBy: { name: "asc" },
      skip: paging.skip,
      take: paging.take,
    }),
    prisma.organization.count({ where }),
  ]);

  return {
    items,
    pagination: withPagination(
      { page: paging.page, pageSize: paging.pageSize },
      total,
    ),
  };
};

export const createOrganization = async (input: CreateOrganizationInput) => {
  const slug = input.slug?.trim() || slugify(input.name);
  if (!slug) throw new ApiError(400, "Organization slug is required");

  try {
    return await prisma.organization.create({
      data: {
        name: input.name.trim(),
        slug,
      },
      select: organizationSelect,
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new ApiError(409, "Organization slug already exists");
    }
    throw error;
  }
};

export const updateOrganization = async (
  organizationId: string,
  input: UpdateOrganizationInput,
) => {
  try {
    return await prisma.organization.update({
      where: { id: organizationId },
      data: {
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.slug !== undefined ? { slug: input.slug.trim() } : {}),
      },
      select: organizationSelect,
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      throw new ApiError(404, "Organization not found");
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new ApiError(409, "Organization slug already exists");
    }
    throw error;
  }
};

export const listClinicians = async (query: ListCliniciansInput) => {
  const paging = toSkipTake(query);
  const search = query.search?.trim();
  const where: Prisma.ClinicianProfileWhereInput = {
    ...(query.organizationId ? { organizationId: query.organizationId } : {}),
    ...(query.isActive === undefined ? {} : { isActive: query.isActive }),
    user: {
      role: UserRole.CLINICIAN,
      isDeleted: false,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
  };

  const [items, total] = await Promise.all([
    prisma.clinicianProfile.findMany({
      where,
      include: clinicianInclude,
      orderBy: { updatedAt: "desc" },
      skip: paging.skip,
      take: paging.take,
    }),
    prisma.clinicianProfile.count({ where }),
  ]);

  return {
    items,
    pagination: withPagination(
      { page: paging.page, pageSize: paging.pageSize },
      total,
    ),
  };
};

export const createClinician = async (input: CreateClinicianInput) => {
  const email = input.email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing && !existing.isDeleted) {
    throw new ApiError(409, "User with this email already exists");
  }

  return prisma.$transaction(async (tx) => {
    const user = existing
      ? await tx.user.update({
          where: { id: existing.id },
          data: {
            name: input.name.trim(),
            passwordHash: await hashPassword(input.password),
            phoneNumber: normalizeNullable(input.phoneNumber),
            role: UserRole.CLINICIAN,
            emailVerified: input.emailVerified ?? true,
            isDeleted: false,
          },
        })
      : await tx.user.create({
          data: {
            email,
            name: input.name.trim(),
            passwordHash: await hashPassword(input.password),
            phoneNumber: normalizeNullable(input.phoneNumber),
            role: UserRole.CLINICIAN,
            emailVerified: input.emailVerified ?? true,
          },
        });

    return tx.clinicianProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        organizationId: normalizeNullable(input.organizationId),
        licenseNumber: normalizeNullable(input.licenseNumber),
        specialty: normalizeNullable(input.specialty),
        isActive: input.isActive ?? true,
      },
      update: {
        organizationId: normalizeNullable(input.organizationId),
        licenseNumber: normalizeNullable(input.licenseNumber),
        specialty: normalizeNullable(input.specialty),
        isActive: input.isActive ?? true,
      },
      include: clinicianInclude,
    });
  });
};

export const updateClinician = async (
  clinicianId: string,
  input: UpdateClinicianInput,
) => {
  const clinician = await prisma.clinicianProfile.findUnique({
    where: { id: clinicianId },
    include: { user: true },
  });

  if (!clinician || clinician.user.isDeleted) {
    throw new ApiError(404, "Clinician not found");
  }

  return prisma.$transaction(async (tx) => {
    if (
      input.name !== undefined ||
      input.phoneNumber !== undefined ||
      input.emailVerified !== undefined
    ) {
      await tx.user.update({
        where: { id: clinician.userId },
        data: {
          ...(input.name !== undefined ? { name: input.name.trim() } : {}),
          ...(input.phoneNumber !== undefined
            ? { phoneNumber: normalizeNullable(input.phoneNumber) }
            : {}),
          ...(input.emailVerified !== undefined
            ? { emailVerified: input.emailVerified }
            : {}),
        },
      });
    }

    return tx.clinicianProfile.update({
      where: { id: clinicianId },
      data: {
        ...(input.organizationId !== undefined
          ? { organizationId: normalizeNullable(input.organizationId) }
          : {}),
        ...(input.licenseNumber !== undefined
          ? { licenseNumber: normalizeNullable(input.licenseNumber) }
          : {}),
        ...(input.specialty !== undefined
          ? { specialty: normalizeNullable(input.specialty) }
          : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
      include: clinicianInclude,
    });
  });
};

export const listOrganizationPermissions = async (query: ListPermissionsInput) => {
  return prisma.organizationUserPermission.findMany({
    where: {
      ...(query.organizationId ? { organizationId: query.organizationId } : {}),
    },
    include: {
      organization: true,
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
};

export const upsertOrganizationPermission = async (
  input: UpsertPermissionInput,
) => {
  const user = await prisma.user.findFirst({
    where: {
      email: { equals: input.userEmail.trim().toLowerCase(), mode: "insensitive" },
      isDeleted: false,
    },
  });

  if (!user) throw new ApiError(404, "User not found for permission assignment");

  return prisma.organizationUserPermission.upsert({
    where: {
      organizationId_userId: {
        organizationId: input.organizationId,
        userId: user.id,
      },
    },
    create: {
      organizationId: input.organizationId,
      userId: user.id,
      role: input.role ?? "ORG_ADMIN",
      scopes: input.scopes ?? undefined,
    },
    update: {
      role: input.role ?? "ORG_ADMIN",
      scopes: input.scopes ?? undefined,
    },
    include: {
      organization: true,
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
        },
      },
    },
  });
};

export const listAuditLogs = async (query: ListAuditLogsInput) => {
  const paging = toSkipTake(query);
  const where: Prisma.AuditLogWhereInput = {
    ...(query.resourceType
      ? { resourceType: { contains: query.resourceType, mode: "insensitive" } }
      : {}),
    ...(query.action ? { action: { contains: query.action, mode: "insensitive" } } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        actor: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: paging.skip,
      take: paging.take,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    items,
    pagination: withPagination(
      { page: paging.page, pageSize: paging.pageSize },
      total,
    ),
  };
};
