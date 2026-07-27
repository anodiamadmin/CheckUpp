import { FileType, Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { env } from "../../config/env";
import { prisma } from "../../db/prisma";
import { ApiError } from "../../middlewares/error-handler";
import { AuthContext } from "../../types/auth";
import { withAppwriteCompat } from "../../utils/compat";
import { toSkipTake, withPagination } from "../../utils/pagination";

interface ListDocumentsQuery {
  page: number;
  pageSize: number;
  documentType?: string;
  fileType?: string;
}

interface CreateDocumentInput {
  title: string;
  description?: string | null;
  documentType: string;
  fileType: string;
  objectKey?: string | null;
  publicUrl?: string | null;
  externalUrl?: string | null;
  mimeType?: string | null;
  sizeBytes?: number;
  legacyAppwriteStorageId?: string | null;
}

interface UpdateDocumentInput {
  title?: string;
  description?: string | null;
  documentType?: string;
  fileType?: string;
  objectKey?: string | null;
  publicUrl?: string | null;
  externalUrl?: string | null;
  mimeType?: string | null;
  sizeBytes?: number;
  legacyAppwriteStorageId?: string | null;
}

const UPLOADS_ROOT = path.resolve(process.cwd(), env.walletUploadsDir);
const SAFE_OBJECT_KEY_PATTERN = /^[a-zA-Z0-9/_\-.]+$/;

const sanitizeFileName = (value: string) =>
  value
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 180);

const sanitizeObjectKey = (value: string) => {
  const normalized = value.trim().replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalized) {
    throw new ApiError(400, "Invalid object key");
  }

  if (normalized.includes("..") || !SAFE_OBJECT_KEY_PATTERN.test(normalized)) {
    throw new ApiError(400, "Unsafe object key");
  }

  return normalized;
};

const resolveUploadPath = (objectKey: string) => {
  const safeKey = sanitizeObjectKey(objectKey);
  const resolved = path.resolve(UPLOADS_ROOT, safeKey);
  const rootPrefix = `${UPLOADS_ROOT}${path.sep}`;

  if (resolved !== UPLOADS_ROOT && !resolved.startsWith(rootPrefix)) {
    throw new ApiError(400, "Unsafe object key");
  }

  return resolved;
};

const toPublicUploadPath = (objectKey: string) =>
  `/uploads/${sanitizeObjectKey(objectKey)}`;

const cleanupUploadedFile = async (objectKey: string) => {
  const filePath = resolveUploadPath(objectKey);
  await fs.unlink(filePath);
};

const toFileType = (value: string): FileType => {
  const normalized = value.toUpperCase();
  if (normalized === "IMAGE") return FileType.IMAGE;
  if (normalized === "LINK") return FileType.LINK;
  return FileType.FILE;
};

const toClientFileType = (value: FileType): "file" | "image" | "link" => {
  if (value === FileType.IMAGE) return "image";
  if (value === FileType.LINK) return "link";
  return "file";
};

const toWalletDocumentResponse = (
  document: Prisma.WalletDocumentGetPayload<Record<string, never>>,
) => {
  const compat = withAppwriteCompat(document);
  return {
    ...compat,
    user: document.userId,
    fileType: toClientFileType(document.fileType),
    file:
      document.externalUrl ?? document.publicUrl ?? document.objectKey ?? null,
  };
};

export const createUploadIntent = async (
  fileName: string,
  mimeType: string,
) => {
  const safeName = sanitizeFileName(fileName);
  const objectKey = `wallet/${new Date().toISOString().slice(0, 10)}/${randomUUID()}-${safeName}`;

  return {
    objectKey,
    uploadUrl: `${env.apiPrefix}/me/wallet/uploads/pending?objectKey=${encodeURIComponent(objectKey)}`,
    mimeType,
    expiresInSeconds: 900,
  };
};

export const uploadPendingFile = async (
  objectKey: string,
  fileBuffer: Buffer,
  mimeType: string,
) => {
  if (!Buffer.isBuffer(fileBuffer) || fileBuffer.byteLength === 0) {
    throw new ApiError(400, "Upload payload is empty");
  }

  const safeObjectKey = sanitizeObjectKey(objectKey);
  const uploadPath = resolveUploadPath(safeObjectKey);
  await fs.mkdir(path.dirname(uploadPath), { recursive: true });
  await fs.writeFile(uploadPath, fileBuffer);

  return {
    objectKey: safeObjectKey,
    mimeType,
    sizeBytes: fileBuffer.byteLength,
    publicPath: toPublicUploadPath(safeObjectKey),
  };
};

export const listDocuments = async (
  auth: AuthContext,
  query: ListDocumentsQuery,
) => {
  const { page, pageSize, skip, take } = toSkipTake(query);

  const where: Prisma.WalletDocumentWhereInput = {
    userId: auth.userId,
    ...(query.documentType ? { documentType: query.documentType } : {}),
    ...(query.fileType ? { fileType: toFileType(query.fileType) } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.walletDocument.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.walletDocument.count({ where }),
  ]);

  return {
    items: items.map(toWalletDocumentResponse),
    pagination: withPagination({ page, pageSize }, total),
  };
};

export const searchDocuments = async (
  auth: AuthContext,
  query: string,
  page: number,
  pageSize: number,
) => {
  const paging = toSkipTake({ page, pageSize });

  const where: Prisma.WalletDocumentWhereInput = {
    userId: auth.userId,
    OR: [
      { title: { contains: query, mode: "insensitive" } },
      { description: { contains: query, mode: "insensitive" } },
      { documentType: { contains: query, mode: "insensitive" } },
    ],
  };

  const [items, total] = await Promise.all([
    prisma.walletDocument.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: paging.skip,
      take: paging.take,
    }),
    prisma.walletDocument.count({ where }),
  ]);

  return {
    items: items.map(toWalletDocumentResponse),
    pagination: withPagination(
      { page: paging.page, pageSize: paging.pageSize },
      total,
    ),
  };
};

export const getDocumentById = async (auth: AuthContext, id: string) => {
  const document = await prisma.walletDocument.findFirst({
    where: { id, userId: auth.userId },
  });

  return document ? toWalletDocumentResponse(document) : null;
};

export const createDocument = async (
  auth: AuthContext,
  input: CreateDocumentInput,
) => {
  const document = await prisma.walletDocument.create({
    data: {
      userId: auth.userId,
      title: input.title,
      description: input.description ?? undefined,
      documentType: input.documentType,
      fileType: toFileType(input.fileType),
      objectKey: input.objectKey ?? undefined,
      publicUrl: input.publicUrl ?? undefined,
      externalUrl: input.externalUrl ?? undefined,
      mimeType: input.mimeType ?? undefined,
      sizeBytes: input.sizeBytes,
      legacyAppwriteStorageId: input.legacyAppwriteStorageId ?? undefined,
    },
  });

  return toWalletDocumentResponse(document);
};

export const updateDocument = async (
  auth: AuthContext,
  id: string,
  input: UpdateDocumentInput,
) => {
  const existing = await prisma.walletDocument.findFirst({
    where: { id, userId: auth.userId },
  });

  if (!existing) return null;

  const updated = await prisma.walletDocument.update({
    where: { id },
    data: {
      title: input.title,
      description: input.description ?? undefined,
      documentType: input.documentType,
      fileType: input.fileType ? toFileType(input.fileType) : undefined,
      objectKey: input.objectKey ?? undefined,
      publicUrl: input.publicUrl ?? undefined,
      externalUrl: input.externalUrl ?? undefined,
      mimeType: input.mimeType ?? undefined,
      sizeBytes: input.sizeBytes,
      legacyAppwriteStorageId: input.legacyAppwriteStorageId ?? undefined,
    },
  });

  return toWalletDocumentResponse(updated);
};

export const createLink = async (
  auth: AuthContext,
  input: {
    title: string;
    description?: string | null;
    documentType: string;
    link: string;
  },
) => {
  const document = await prisma.walletDocument.create({
    data: {
      userId: auth.userId,
      title: input.title,
      description: input.description ?? undefined,
      documentType: input.documentType,
      fileType: FileType.LINK,
      externalUrl: input.link,
      publicUrl: input.link,
    },
  });

  return toWalletDocumentResponse(document);
};

export const deleteDocument = async (auth: AuthContext, id: string) => {
  const existing = await prisma.walletDocument.findFirst({
    where: { id, userId: auth.userId },
  });

  if (!existing) {
    return null;
  }

  const canDeleteStoredFile = existing.objectKey
    ? (await prisma.walletDocument.count({
        where: {
          objectKey: existing.objectKey,
          id: { not: existing.id },
        },
      })) === 0
    : false;

  await prisma.walletDocument.delete({ where: { id } });

  if (canDeleteStoredFile && existing.objectKey) {
    cleanupUploadedFile(existing.objectKey).catch(() => undefined);
  }

  return toWalletDocumentResponse(existing);
};
